# recrd/backend/charts.py
"""Trending albums.

The chart comes from Apple's "most played" feed — what people are actually
listening to this week. Apple only gives us names, so each entry is then
resolved to a Spotify album (concurrently) for the id, artwork and metadata
the rest of the app already speaks.

Apple's older iTunes RSS charts are still up and still answer, but they are
sales charts: they rank catalogue reissues and deluxe editions alongside new
records, so they hand back things like a 1986 album at the top of hip-hop.
They are kept here only to fill in the genres the most-played chart is too
small to cover, and then only for recent releases.
"""

import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests
from spotipy import Spotify, SpotifyException

APPLE_MOST_PLAYED = (
    "https://rss.marketingtools.apple.com/api/v2/us/music/most-played/{limit}/albums.json"
)
ITUNES_RSS = "https://itunes.apple.com/us/rss/{feed}/limit={limit}/{genre}json"

# One pool of the current chart, filtered locally per genre.
APPLE_POOL_LIMIT = 100
APPLE_FETCH_LIMIT = 100

# How old a record from a sales chart may be before it counts as catalogue
# rather than something people are listening to now.
RECENT_DAYS = 550

# Tile name -> Apple's own genre label in the most-played feed. Apple groups
# rap with hip-hop and soul with r&b, so each of those is one tile, not two.
GENRE_LABELS: Dict[str, str] = {
    "hip-hop": "Hip-Hop/Rap",
    "pop": "Pop",
    "r&b": "R&B/Soul",
    "indie": "Alternative",
    "country": "Country",
    "rock": "Rock",
    "latin": "Latin",
    "k-pop": "K-Pop",
    "electronic": "Electronic",
    "jazz": "Jazz",
    "metal": "Metal",
    "folk": "Singer/Songwriter",
}

# The same tiles in the older per-genre charts, for topping up the thin ones.
GENRE_IDS: Dict[str, int] = {
    "hip-hop": 18,
    "pop": 14,
    "r&b": 15,
    "indie": 20,
    "country": 6,
    "rock": 21,
    "latin": 12,
    "k-pop": 51,
    "electronic": 7,
    "jazz": 11,
    "metal": 1153,
    "folk": 10,
}

# "Album (Deluxe Edition)" and "Album" are the same record twice on a chart.
_EDITION = re.compile(
    r"\s*[\(\[][^)\]]*(edition|deluxe|expanded|remaster|anniversar|version|bonus|"
    r"reissue|explicit)[^)\]]*[\)\]]|\s+-\s+(ep|single|deluxe|expanded).*$",
    re.IGNORECASE,
)


def _base_title(name: str) -> str:
    """The record's name with edition decoration taken off."""
    return _EDITION.sub("", name).strip().lower()

# A chart moves about once a day, so an hour-old answer is still the chart.
CHART_TTL_SECONDS = 60 * 60
# Apple's feeds are shared by every genre, so this is the one call they all
# come out of.
FEED_TTL_SECONDS = 30 * 60
# Which Spotify album a name and artist mean does not change. Only a miss is
# worth asking about again, in case the album turns up later.
RESOLVE_TTL_SECONDS = 7 * 24 * 60 * 60
RESOLVE_MISS_TTL_SECONDS = 60 * 60

# The endpoint caps a request at 20, so resolving that deep once per genre
# means every smaller request is a slice of an answer we already have.
CHART_DEPTH = 20
# Chart rows that resolve to nothing, plus room for the resolve cache to hold
# a few charts' worth of albums before it is worth pruning.
CACHE_MAX_ENTRIES = 4000

# Stored for a chart row that matched no album, so a miss is remembered
# rather than asked again on every request.
_MISS = object()

_cache: Dict[Any, Tuple[float, Any]] = {}
_cache_lock = threading.Lock()
# One lock per cache key, so a cold chart is built once rather than once per
# request that happened to arrive while it was cold.
_build_locks: Dict[Any, threading.Lock] = {}
_build_locks_lock = threading.Lock()
_thread_local = threading.local()


def _cached(key: Any, ttl: float) -> Any:
    """The value stored under `key`, or None if it is missing or stale."""
    with _cache_lock:
        hit = _cache.get(key)
    if not hit:
        return None
    stored_at, value = hit
    if time.time() - stored_at > ttl:
        return None
    return value


def _store(key: Any, value: Any) -> None:
    with _cache_lock:
        _cache[key] = (time.time(), value)
        if len(_cache) > CACHE_MAX_ENTRIES:
            # Drop the oldest quarter rather than clearing: the charts in use
            # are also the ones most recently stored.
            oldest = sorted(_cache.items(), key=lambda kv: kv[1][0])
            for stale_key, _ in oldest[: len(_cache) // 4]:
                _cache.pop(stale_key, None)


def _build_lock(key: Any) -> threading.Lock:
    with _build_locks_lock:
        lock = _build_locks.get(key)
        if lock is None:
            lock = threading.Lock()
            _build_locks[key] = lock
        return lock


def _feed_entries(feed: str, genre_path: str) -> List[Dict[str, Any]]:
    key = ("feed", feed, genre_path)
    cached = _cached(key, FEED_TTL_SECONDS)
    if cached is not None:
        return cached

    url = ITUNES_RSS.format(feed=feed, limit=APPLE_FETCH_LIMIT, genre=genre_path)
    resp = requests.get(url, timeout=8, headers={"User-Agent": "recrd/1.0"})
    resp.raise_for_status()

    entries = resp.json().get("feed", {}).get("entry")
    # A chart with a single item comes back as an object, not a list.
    if isinstance(entries, dict):
        entries = [entries]
    entries = entries or []
    _store(key, entries)
    return entries


def _most_played() -> List[Dict[str, Any]]:
    """Apple's current most-played albums, with their genres attached.

    Every tile filters this same pool, so it is fetched once for all of them.
    """
    key = ("pool", APPLE_POOL_LIMIT)
    cached = _cached(key, FEED_TTL_SECONDS)
    if cached is not None:
        return cached

    url = APPLE_MOST_PLAYED.format(limit=APPLE_POOL_LIMIT)
    resp = requests.get(url, timeout=8, headers={"User-Agent": "recrd/1.0"})
    resp.raise_for_status()
    results = resp.json().get("feed", {}).get("results") or []
    _store(key, results)
    return results


def _is_recent(entry: Dict[str, Any]) -> bool:
    """True for a sales-chart row that is a current release, not catalogue."""
    stamp = (entry.get("im:releaseDate") or {}).get("label")
    if not stamp:
        return False
    try:
        released = datetime.fromisoformat(stamp)
    except ValueError:
        return False
    if released.tzinfo is None:
        released = released.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - released).days <= RECENT_DAYS


def fetch_chart(genre: Optional[str], limit: int) -> List[Dict[str, str]]:
    """Apple's chart as [{'name', 'artist'}], chart order preserved."""
    label = None
    if genre:
        label = GENRE_LABELS.get(genre.strip().lower())
        if label is None:
            return []

    chart: List[Dict[str, str]] = []
    seen = set()

    def add(name: Optional[str], artist: Optional[str]) -> None:
        if not name or not artist:
            return
        # An album and its deluxe edition are one record, not two.
        key = (_base_title(name), artist.strip().lower())
        if key not in seen:
            seen.add(key)
            chart.append({"name": name, "artist": artist})

    for entry in _most_played():
        if label and label not in [g.get("name") for g in entry.get("genres") or []]:
            continue
        add(entry.get("name"), entry.get("artistName"))
        if len(chart) >= limit:
            return chart

    # A genre like jazz or metal barely registers on an all-genre chart, so
    # its own chart tops it up — recent releases only, or the catalogue that
    # keeps selling would crowd out everything current.
    genre_id = GENRE_IDS.get(genre.strip().lower()) if genre else None
    if genre_id is not None and len(chart) < limit:
        genre_path = f"genre={genre_id}/"
        for entry in _feed_entries("topalbums", genre_path):
            if _is_recent(entry):
                add((entry.get("im:name") or {}).get("label"),
                    (entry.get("im:artist") or {}).get("label"))
            if len(chart) >= limit:
                break

        # Album charts for a small genre can be short. The songs chart for it
        # is not, and every song names the album it came from.
        if len(chart) < limit:
            for entry in _feed_entries("topsongs", genre_path):
                album = (entry.get("im:collection") or {}).get("im:name", {}).get("label")
                if album and not album.endswith("- Single") and _is_recent(entry):
                    add(album, (entry.get("im:artist") or {}).get("label"))
                if len(chart) >= limit:
                    break

    return chart


def _client(auth_manager) -> Spotify:
    """One Spotify client per worker thread, sharing the cached access token."""
    client = getattr(_thread_local, "spotify", None)
    if client is None:
        client = Spotify(auth_manager=auth_manager)
        _thread_local.spotify = client
    return client


def _resolve(auth_manager, entry: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Find the Spotify album for one chart entry, remembering the answer.

    The same record shows up on the overall chart and its genre chart, and
    again on every chart after this one expires, so the search behind it only
    ever needs to happen once.
    """
    name, artist = entry["name"], entry["artist"]
    key = ("resolve", name.strip().lower(), artist.strip().lower())

    cached = _cached(key, RESOLVE_TTL_SECONDS)
    if cached is _MISS:
        # Re-check a miss now and then; everything else stands.
        if _cached(key, RESOLVE_MISS_TTL_SECONDS) is _MISS:
            return None
    elif cached is not None:
        return cached

    sp = _client(auth_manager)

    # Apple decorates titles ("- EP", "(Deluxe)", "- Single"); the precise
    # query is tried first, then a looser one that tolerates the decoration.
    queries = [
        f'album:"{name}" artist:"{artist}"',
        f"{name} {artist}",
    ]
    for query in queries:
        try:
            items = sp.search(q=query, type="album", limit=3).get("albums", {}).get("items", [])
        except SpotifyException:
            continue
        if not items:
            continue
        # Prefer a full album over a single that shares the name.
        found = next((a for a in items if a.get("album_type") == "album"), items[0])
        _store(key, found)
        return found

    _store(key, _MISS)
    return None


def _resolve_chart(
    auth_manager, chart: List[Dict[str, str]], wanted: int
) -> List[Dict[str, Any]]:
    """Chart rows as Spotify albums, a batch at a time until there are enough.

    Some rows resolve to nothing and some to a record already on the list, so
    the chart is over-long on purpose — but resolving all of it up front would
    search for albums nobody asked for.
    """
    albums: List[Dict[str, Any]] = []
    seen = set()

    with ThreadPoolExecutor(max_workers=8) as pool:
        for start in range(0, len(chart), wanted):
            batch = chart[start : start + wanted]
            for album in pool.map(lambda e: _resolve(auth_manager, e), batch):
                if not album:
                    continue
                # Two chart rows for the same record — the album and its
                # deluxe, say — can resolve to two different Spotify ids.
                # Still one record.
                artist = (album.get("artists") or [{}])[0].get("name", "")
                key = (_base_title(album.get("name", "")), artist.strip().lower())
                if album["id"] in seen or key in seen:
                    continue
                seen.add(album["id"])
                seen.add(key)
                albums.append(album)
            if len(albums) >= wanted:
                break

    return albums[:wanted]


def trending_albums(auth_manager, genre: Optional[str], limit: int) -> List[Dict[str, Any]]:
    """The chart, resolved to Spotify albums.

    Held per genre rather than per (genre, limit): the list is built once, as
    deep as the endpoint allows, and a request for fewer is a slice of it.
    """
    key = ("albums", genre.strip().lower() if genre else None)

    cached = _cached(key, CHART_TTL_SECONDS)
    if cached is not None:
        return cached[:limit]

    # Whoever gets here first builds it; anyone else arriving meanwhile waits
    # and takes the same answer instead of running the same searches again.
    with _build_lock(key):
        cached = _cached(key, CHART_TTL_SECONDS)
        if cached is not None:
            return cached[:limit]

        # Over-fetch: some chart rows have no Spotify match.
        chart = fetch_chart(genre, CHART_DEPTH * 2)
        if not chart:
            return []

        albums = _resolve_chart(auth_manager, chart, CHART_DEPTH)
        _store(key, albums)
        return albums[:limit]
