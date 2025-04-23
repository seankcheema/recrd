# recrd/backend/main.py

import os
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials

# 1. Load your .env
load_dotenv()

SPOTIPY_CLIENT_ID     = os.getenv("SPOTIPY_CLIENT_ID")
SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET")

if not SPOTIPY_CLIENT_ID or not SPOTIPY_CLIENT_SECRET:
    raise RuntimeError("Missing SPOTIPY_CLIENT_ID or SPOTIPY_CLIENT_SECRET in environment")

# 2. Instantiate Spotify client with Client Credentials
auth_manager = SpotifyClientCredentials(
    client_id=SPOTIPY_CLIENT_ID,
    client_secret=SPOTIPY_CLIENT_SECRET
)
sp = Spotify(auth_manager=auth_manager)

# 3. Create FastAPI app
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
    """
    Fetch a single album by Spotify ID.
    """
    try:
        return sp.album(album_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Album not found: {e}")

@app.get("/artists/{artist_id}")
async def get_artist(artist_id: str):
    """
    Fetch a single artist by Spotify ID.
    """
    try:
        return sp.artist(artist_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Artist not found: {e}")

@app.get("/search/")
async def search(q: str, type: str = "track", limit: int = 10):
    """
    Search Spotify for q (e.g. q="Muse", type="artist").
    """
    try:
        return sp.search(q=q, type=type, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
