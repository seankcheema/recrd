# recrd/backend/main.py

import os
import threading
import time
import traceback
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from spotipy import Spotify, SpotifyException
from spotipy.oauth2 import SpotifyClientCredentials
from typing import Dict, Any, List
import requests
from io import BytesIO
from colorthief import ColorThief
from auth import router as auth_router
from social import router as social_router
import charts

load_dotenv()
CLIENT_ID     = os.getenv("SPOTIPY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET")
if not CLIENT_ID or not CLIENT_SECRET:
    raise RuntimeError("Missing SPOTIPY_CLIENT_ID or SPOTIPY_CLIENT_SECRET")

auth_manager = SpotifyClientCredentials(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET
)
sp = Spotify(auth_manager=auth_manager)

app = FastAPI(title="Recrd Spotify API")


# Registered before CORSMiddleware so it sits *inside* it: an unhandled error
# becomes a normal JSON response that CORS can then add its headers to.
# Starlette's own 500 page skips CORS entirely, which the browser reports as
# an opaque network failure instead of the real error.
@app.middleware("http")
async def catch_unhandled_errors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        traceback.print_exception(type(exc), exc, exc.__traceback__)
        return JSONResponse(status_code=500, content={"detail": str(exc)})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(social_router)

@app.get("/songs/{song_id}")
async def get_song(song_id: str):
    """
    Fetch a single track by Spotify ID.
    """
    try:
        return sp.track(song_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Track not found: {e}")

@app.get("/artists/{artist_id}")
def get_artist(artist_id: str):
    """
    Fetch artist information and their full albums by artist_id.
    Returns JSON with:
      - id: Spotify artist ID
      - name: Artist name
      - images: List of image objects
      - albums: Deduplicated list of albums with id, name, images
    """
    try:
        artist = sp.artist(artist_id)

        image_url = artist.get("images", [{}])[0].get("url")
        if image_url:
            # 3) download the image bytes
            resp = requests.get(image_url, timeout=5)
            resp.raise_for_status()
            img_data = BytesIO(resp.content)

            # 4) extract the dominant color
            ct = ColorThief(img_data)
            r, g, b = ct.get_color(quality=1)
            # 5) store it as a hex string
            dominant_color = f"#{r:02x}{g:02x}{b:02x}"
            # fallback if anything goes wrong
        else:
            dominant_color = "#000000"
    except Exception:
        raise HTTPException(status_code=404, detail="Artist not found")

    # Fetch artist's full albums
    albums_resp = sp.artist_albums(
        artist_id,
        include_groups="album",
        limit=50
    )
    items = albums_resp.get("items", [])

    # Deduplicate albums by ID
    seen = set()
    deduped = []
    for alb in items:
        aid = alb.get("id")

        if aid and aid not in seen:
            seen.add(aid)
            deduped.append({
                "id": aid,
                "name": alb.get("name"),
                "images": alb.get("images", []),
            })

    return {
        "id": artist.get("id"),
        "name": artist.get("name"),
        "images": artist.get("images", []),
        "albums": deduped,
        "dominant_color": dominant_color
    }

# ── genres ───────────────────────────────────────────────────────────────
# Spotify's own genres are very fine-grained ("detroit trap", "alternative
# r&b"), which is useless as a filter, so each one is folded into the coarse
# buckets the app already shows on the trending page. An album can land in
# several — "pop rap" is honestly both — and filtering is happier that way
# than with a single forced choice.
GENRE_BUCKETS: List[tuple] = [
    ("hip-hop", ("hip hop", "hip-hop", "rap", "trap", "drill", "grime")),
    ("r&b",     ("r&b", "rnb", "rhythm and blues")),
    ("soul",    ("soul", "motown", "funk")),
    ("pop",     ("pop",)),
    ("rock",    ("rock", "punk", "grunge", "britpop", "emo")),
    ("metal",   ("metal", "hardcore", "thrash", "doom")),
    ("indie",   ("indie", "alternative", "shoegaze", "lo-fi", "dream pop")),
    ("country", ("country", "americana", "bluegrass", "honky")),
    ("jazz",    ("jazz", "bebop", "bossa nova", "swing")),
    ("house",   ("house", "techno", "edm", "electro", "dance", "garage", "dubstep")),
    ("folk",    ("folk", "singer-songwriter")),
    ("electronic", ("electronic", "ambient", "idm", "synth", "downtempo")),
    ("latin",   ("latin", "reggaeton", "salsa", "bachata", "cumbia")),
    ("reggae",  ("reggae", "dancehall", "ska")),
    ("classical", ("classical", "orchestra", "baroque", "opera", "symphony")),
    ("blues",   ("blues",)),
]

GENRE_CACHE_TTL = 24 * 60 * 60
_genre_cache: Dict[str, tuple] = {}
_genre_lock = threading.Lock()


def _bucket(raw_genres) -> List[str]:
    """Fold Spotify's genre strings into the app's coarse buckets."""
    text = " | ".join(g.lower() for g in raw_genres)
    return [name for name, words in GENRE_BUCKETS if any(w in text for w in words)]


def _chunks(items: List[str], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


@app.get("/album_genres/")
async def album_genres(
    albumIds: str = Query(..., description="Comma-separated Spotify album ids"),
) -> Dict[str, List[str]]:
    """Coarse genres for a batch of albums, keyed by album id.

    Spotify almost always leaves an album's own `genres` empty, so the real
    answer comes from its artists. Both lookups are batched, and the result is
    cached for a day because an album's genre does not move.
    """
    ids = [a for a in (albumIds or "").split(",") if a][:200]
    if not ids:
        return {}

    now = time.time()
    out: Dict[str, List[str]] = {}
    missing: List[str] = []
    with _genre_lock:
        for album_id in ids:
            hit = _genre_cache.get(album_id)
            if hit and now - hit[0] < GENRE_CACHE_TTL:
                out[album_id] = hit[1]
            else:
                missing.append(album_id)

    if not missing:
        return out

    try:
        albums = []
        for chunk in _chunks(missing, 20):
            albums += [a for a in (sp.albums(chunk).get("albums") or []) if a]

        artist_ids = sorted(
            {ar["id"] for a in albums for ar in (a.get("artists") or []) if ar.get("id")}
        )
        artist_genres: Dict[str, List[str]] = {}
        for chunk in _chunks(artist_ids, 50):
            for ar in sp.artists(chunk).get("artists") or []:
                if ar:
                    artist_genres[ar["id"]] = ar.get("genres") or []

        fresh: Dict[str, List[str]] = {}
        for a in albums:
            raw = list(a.get("genres") or [])
            for ar in a.get("artists") or []:
                raw += artist_genres.get(ar.get("id"), [])
            fresh[a["id"]] = _bucket(raw)
    except SpotifyException as e:
        raise HTTPException(status_code=e.http_status or 400, detail=e.msg)

    with _genre_lock:
        for album_id, buckets in fresh.items():
            _genre_cache[album_id] = (now, buckets)

    # Albums Spotify did not return get an empty list, so the client can tell
    # "no genre" apart from "not looked up yet".
    for album_id in missing:
        out[album_id] = fresh.get(album_id, [])
    return out


@app.get("/albums/{album_id}")
async def get_album(album_id: str):
    # 1) fetch the raw album object from Spotify
    album = sp.album(album_id)
    
    # 2) get the URL of the first image (highest resolution)
    image_url = album.get("images", [{}])[0].get("url")
    if image_url:
        try:
            # 3) download the image bytes
            resp = requests.get(image_url, timeout=5)
            resp.raise_for_status()
            img_data = BytesIO(resp.content)

            # 4) extract the dominant color
            ct = ColorThief(img_data)
            r, g, b = ct.get_color(quality=1)
            # 5) store it as a hex string
            album["dominant_color"] = f"#{r:02x}{g:02x}{b:02x}"
        except Exception:
            # fallback if anything goes wrong
            album["dominant_color"] = "#000000"
    else:
        album["dominant_color"] = "#000000"

    return album

@app.get("/trending_albums/", response_model=List[Dict[str, Any]])
async def trending_albums(
    limit: int = Query(5, ge=1, le=20, description="How many trending albums to return"),
    genre: str = Query(None, description="Genre tile name, e.g. 'pop', 'hip-hop'")
) -> List[Dict[str, Any]]:
    """
    Apple's top-albums chart (overall, or for a genre), resolved to Spotify
    albums. See charts.py — results are cached, so this is cheap to poll.
    """
    try:
        return charts.trending_albums(auth_manager, genre, limit)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Chart fetch failed: {e}")
    except SpotifyException as e:
        raise HTTPException(status_code=e.http_status or 400, detail=e.msg)


@app.get("/genres/", response_model=List[str])
async def genres() -> List[str]:
    """Genre names that /trending_albums/ has a real chart for."""
    return sorted(charts.GENRE_IDS.keys())


@app.get("/search/")
async def search(
    q: str = Query(..., description="Free-form query, e.g. 'Blonde by Frank Ocean'"),
    limit: int = Query(10, ge=1, le=50, description="Max items per list")
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Returns:
      - albums: top album results (only full albums, no singles/compilations), de-duplicated, sorted by popularity
      - artists: top artist results, de-duplicated, sorted by popularity
      - combined: albums+artists merged (no duplicates) and sorted by popularity
    """
    try:
        # 1) Run both searches
        alb_resp = sp.search(q=q, type="album",  limit=limit * 2)   # fetch more to allow for filtering
        art_resp = sp.search(q=q, type="artist", limit=limit * 2)

        # 2) Extract raw lists
        raw_albums  = alb_resp["albums"]["items"]
        raw_artists = art_resp["artists"]["items"]

        # 3) Filter albums: only album_type == "album"
        filtered_albums = [a for a in raw_albums if a.get("album_type") == "album"]

        # 4) Dedupe albums by ID, then limit
        seen_album_names = set()
        albums = []
        for a in filtered_albums:
            if a["name"] not in seen_album_names:
                seen_album_names.add(a["name"])
                a["type"] = "album"
                albums.append(a)
                if len(albums) >= limit:
                    break

        # 5) Dedupe artists by ID, then limit
        seen_artist_ids = set()
        artists = []
        for a in raw_artists:
            if a["id"] not in seen_artist_ids:
                seen_artist_ids.add(a["id"])
                a["type"] = "artist"
                artists.append(a)
                if len(artists) >= limit:
                    break

        # 6) Sort each list by popularity desc
        albums  = sorted(albums,  key=lambda x: x.get("popularity", 0), reverse=True)
        artists = sorted(artists, key=lambda x: x.get("popularity", 0), reverse=True)

        # 7) Build combined (no cross-type duplicates) and sort
        combined = sorted(
            albums + artists,
            key=lambda x: x.get("popularity", 0),
            reverse=True
        )

        return {
            "albums":   albums,
            "artists":  artists,
            "combined": combined
        }

    except SpotifyException as e:
        raise HTTPException(status_code=e.http_status or 400, detail=e.msg)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
