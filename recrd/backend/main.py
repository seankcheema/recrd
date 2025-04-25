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

APPLE_TOP_ALBUMS_RSS = "https://rss.applemarketingtools.com/api/v2/us/music/most-played/{limit}/albums.json"

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

@app.get("/trending_albums/", response_model=List[Dict[str, Any]])
async def trending_albums(
    limit: int = Query(5, ge=1, le=20, description="How many trending albums to return"),
    genre: str = Query(None, description="Spotify genre seed (e.g. 'pop', 'rock')")
) -> List[Dict[str, Any]]:
    """
    1. Fetch the top `limit` most-played albums from Apple Music RSS.
    2. For each album, search Spotify by album name + artist.
    3. Collect the first Spotify match for each, batch-fetch full album objects.
    4. Return the list of Spotify album objects.
    """
    try:
        spotify_albums: List[str] = []
        if genre:
            # 1) Search tracks by genre
            track_resp = sp.search(
                q=f"genre:{genre.lower()}",
                type="track",
                limit=limit * 2  # over-fetch so we can dedupe
            )
            seen = set()
            for t in track_resp["tracks"]["items"]:
                alb = t.get("album", {})

                if alb.get("album_type") != "album":
                    continue

                aid = alb.get("id")
                if aid and aid not in seen:
                    seen.add(aid)
                    
                    spotify_albums.append(alb)
                    
                    if len(spotify_albums) >= limit:
                        break
            
        else:
            # 1) Pull Apple’s Most-Played Albums RSS
            rss_url = APPLE_TOP_ALBUMS_RSS.format(limit=limit*2)
            r = requests.get(rss_url, timeout=5)
            r.raise_for_status()
            feed = r.json().get("feed", {}).get("results", [])
            
            # 2) For each Apple result, find the Spotify album ID
            for item in feed:
                name   = item.get("name", "")
                artist = item.get("artistName", "")
                # album:<name> artist:<artist> query
                query  = f"album:{name} artist:{artist}"
                try:
                    res = sp.search(q=query, type="album", limit=1)
                    albums = res.get("albums", {}).get("items", [])
                    if albums:
                        spotify_albums.append(albums[0])
                    if len(spotify_albums) >= limit:
                        break
                except SpotifyException:
                    # skip if Spotify returns an error for this search
                    continue

        return spotify_albums

    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Apple RSS fetch failed: {e}")
    except SpotifyException as e:
        raise HTTPException(status_code=e.http_status or 400, detail=e.msg)
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
