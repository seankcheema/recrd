# recrd/backend/main.py

import os
from fastapi import FastAPI, HTTPException, Query
from dotenv import load_dotenv
from spotipy import Spotify, SpotifyException
from spotipy.oauth2 import SpotifyClientCredentials
from typing import Dict, Any, List
import requests
from io import BytesIO
from colorthief import ColorThief
from datetime import datetime, timedelta
import calendar

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


@app.get("/songs/{song_id}")
async def get_song(song_id: str):
    """
    Fetch a single track by Spotify ID.
    """
    try:
        return sp.track(song_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Track not found: {e}")

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

def parse_release_date(rd: str) -> datetime:
    """
    Spotify will give rd as:
      - "YYYY"
      - "YYYY-MM"
      - "YYYY-MM-DD"
    We want the latest possible date in that period so our 6-month test is inclusive.
    """
    parts = rd.split("-")
    year = int(parts[0])
    if len(parts) == 1:
        # end of year
        return datetime(year, 12, 31)
    month = int(parts[1])
    if len(parts) == 2:
        # end of that month
        last_day = calendar.monthrange(year, month)[1]
        return datetime(year, month, last_day)
    day = int(parts[2])
    return datetime(year, month, day)


@app.get("/trending_albums/")
async def trending_albums(
    limit: int = Query(5, ge=1, le=20, description="How many trending albums to return")
) -> List[Dict[str, Any]]:
    """
    1. Fetch Spotify's 50 newest releases (browse/new-releases).
    2. Keep only those whose release_date (at end-of-period) is within the last 6 months.
    3. Batch-fetch full album objects (to get `popularity`).
    4. Sort by `popularity` descending and return the top `limit`.
    """
    try:
        # 1) get up to 50 “new releases”
        resp = sp.new_releases(limit=50)
        items = resp.get("albums", {}).get("items", [])

        # 2) filter by “released within last 6 months”
        cutoff = datetime.now() - timedelta(days=182)
        recent = [
            alb
            for alb in items
            if parse_release_date(alb.get("release_date", "")) >= cutoff
        ]

        print(f"Found {len(recent)} albums released in the last 6 months.")

        return recent[:limit]

        # # 3) batch-fetch full album objects (max 20 IDs per call)
        # full_albums: List[Dict[str, Any]] = []
        # for i in range(0, len(recent_ids), 20):
        #     batch = recent_ids[i : i + 20]
        #     fetched = sp.albums(batch).get("albums", [])
        #     full_albums.extend(fetched)

        # # 4) sort by Spotify’s popularity score and take the top `limit`
        # sorted_by_pop = sorted(
        #     full_albums,
        #     key=lambda a: a.get("popularity", 0),
        #     reverse=True
        # )
        # return sorted_by_pop[:limit]


    except SpotifyException as e:
        raise HTTPException(
            status_code=e.http_status or 400, detail=e.msg
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
