# recrd/backend/charts.py
"""Trending albums.

The chart itself comes from Apple's iTunes RSS, which is the only free source
of real "what people are actually playing" data and, unlike Spotify's search,
has proper per-genre charts. Apple only gives us names, so each entry is then
resolved to a Spotify album (concurrently) to get the id, artwork and metadata
the rest of the app already speaks.
"""

import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional, Tuple

import requests
from spotipy import Spotify, SpotifyException

ITUNES_RSS = "https://itunes.apple.com/us/rss/{feed}/limit={limit}/{genre}json"

# Apple's per-genre album charts are sparse and their length does not track
# the requested limit, so always ask for plenty and slice locally.
APPLE_FETCH_LIMIT = 100

# Apple's genre ids for the tiles the app shows. Several app genres share a
# chart because Apple groups them (rap and hip-hop, r&b and soul).
GENRE_IDS: Dict[str, int] = {
    "rap": 18,
    "hip-hop": 18,
    "hip hop": 18,
    "pop": 14,
    "r&b": 15,
    "rnb": 15,
    "soul": 15,
    "indie": 20,
    "alternative": 20,
    "country": 6,
    "rock": 21,
    "jazz": 11,
    "metal": 1153,
    "house": 17,
    "dance": 17,
    "electronic": 7,
    "folk": 10,
    "reggae": 24,
    "blues": 2,
}

CHART_TTL_SECONDS = 30 * 60

_cache: Dict[Tuple[Optional[str], int], Tuple[float, List[Dict[str, Any]]]] = {}
_cache_lock = threading.Lock()
_thread_local = threading.local()


def _cached(key: Tuple[Optional[str], int]) -> Optional[List[Dict[str, Any]]]:
    with _cache_lock:
        hit = _cache.get(key)
    if not hit:
        return None
    stored_at, value = hit
    if time.time() - stored_at > CHART_TTL_SECONDS:
        return None
    return value


def _store(key: Tuple[Optional[str], int], value: List[Dict[str, Any]]) -> None:
    with _cache_lock:
        _cache[key] = (time.time(), value)


def _feed_entries(feed: str, genre_path: str) -> List[Dict[str, Any]]:
    url = ITUNES_RSS.format(feed=feed, limit=APPLE_FETCH_LIMIT, genre=genre_path)
    resp = requests.get(url, timeout=8, headers={"User-Agent": "recrd/1.0"})
    resp.raise_for_status()

    entries = resp.json().get("feed", {}).get("entry")
    # A chart with a single item comes back as an object, not a list.
    if isinstance(entries, dict):
        return [entries]
    return entries or []


def fetch_chart(genre: Optional[str], limit: int) -> List[Dict[str, str]]:
    """Apple's top albums as [{'name', 'artist'}], chart order preserved."""
    genre_path = ""
    if genre:
        genre_id = GENRE_IDS.get(genre.strip().lower())
        if genre_id is None:
            return []
        genre_path = f"genre={genre_id}/"

    chart: List[Dict[str, str]] = []
    seen = set()

    def add(name: Optional[str], artist: Optional[str]) -> None:
        if not name or not artist:
            return
        key = (name.lower(), artist.lower())
        if key not in seen:
            seen.add(key)
            chart.append({"name": name, "artist": artist})

    for entry in _feed_entries("topalbums", genre_path):
        add((entry.get("im:name") or {}).get("label"),
            (entry.get("im:artist") or {}).get("label"))

    # Some genre album charts return only a handful of rows. The songs chart
    # for the same genre is always well populated, and each song names the
    # album it came from, so it tops the list up with the same chart data.
    if len(chart) < limit:
        for entry in _feed_entries("topsongs", genre_path):
            album = (entry.get("im:collection") or {}).get("im:name", {}).get("label")
            if album and not album.endswith("- Single"):
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
    """Find the Spotify album for one chart entry."""
    sp = _client(auth_manager)
    name, artist = entry["name"], entry["artist"]

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
        return next((a for a in items if a.get("album_type") == "album"), items[0])
    return None


def trending_albums(auth_manager, genre: Optional[str], limit: int) -> List[Dict[str, Any]]:
    """The chart, resolved to Spotify albums. Cached for CHART_TTL_SECONDS."""
    key = (genre.strip().lower() if genre else None, limit)
    cached = _cached(key)
    if cached is not None:
        return cached

    # Over-fetch: some chart entries have no Spotify match.
    chart = fetch_chart(genre, limit * 2)
    if not chart:
        return []

    with ThreadPoolExecutor(max_workers=8) as pool:
        resolved = list(pool.map(lambda e: _resolve(auth_manager, e), chart))

    albums: List[Dict[str, Any]] = []
    seen = set()
    for album in resolved:
        if not album or album["id"] in seen:
            continue
        seen.add(album["id"])
        albums.append(album)
        if len(albums) >= limit:
            break

    _store(key, albums)
    return albums
