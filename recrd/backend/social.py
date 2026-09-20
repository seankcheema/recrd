# recrd/backend/social.py
"""Everything that lives in recrd's own database: rankings, the list,
the activity feed, follows, likes, comments and the to-be-listened list."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

import usernames
from auth import current_user_id
from db import supabase_admin

router = APIRouter(tags=["social"])

# album_entries.rank is a 1-10 score; the app shows it as a tier letter.
TIER_BOUNDS = [(9, "S"), (7, "A"), (5, "B"), (3, "C"), (1, "D")]

def _handle() -> str:
    """", username" once the column exists, otherwise nothing."""
    return ", username" if usernames.supported() else ""


def entry_select() -> str:
    return (
        "id, user_id, spotify_album_id, album_name, artist_name, cover_url, rank,"
        " review, visibility, created_at,"
        f" author:profiles!album_entries_user_id_fkey(id, name{_handle()}, avatar_url),"
        " likes:entry_likes(count),"
        " comments:entry_comments(count)"
    )


def profile_select() -> str:
    return f"id, name{_handle()}, email, avatar_url, bio, created_at"

# Profile pictures live in a public Supabase Storage bucket: they are shown on
# every feed post, so a signed URL per render would be a lot of round trips
# for something that is public anyway.
AVATAR_BUCKET = "avatars"
AVATAR_MAX_BYTES = 6 * 1024 * 1024
AVATAR_TYPES = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heic",
}
# A picker can hand over a type we do not recognise, or none at all, for a file
# that is perfectly fine — iOS in particular is inconsistent about HEIC. The
# file name still says what it is, so fall back to that before refusing.
AVATAR_EXTENSIONS = {
    "jpg": ("jpg", "image/jpeg"),
    "jpeg": ("jpg", "image/jpeg"),
    "png": ("png", "image/png"),
    "webp": ("webp", "image/webp"),
    "heic": ("heic", "image/heic"),
    "heif": ("heic", "image/heic"),
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── schemas ──────────────────────────────────────────────────────────────
class EntryInput(BaseModel):
    spotifyAlbumId: str
    albumName: str
    artistName: str
    coverUrl: Optional[str] = None
    rank: int = Field(ge=1, le=10)
    review: Optional[str] = Field(default=None, max_length=500)
    visibility: str = Field(default="public", pattern="^(public|private)$")


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=40)
    username: Optional[str] = Field(default=None, min_length=3, max_length=20)
    bio: Optional[str] = Field(default=None, max_length=200)
    avatarUrl: Optional[str] = None


class CommentInput(BaseModel):
    body: str = Field(min_length=1, max_length=500)


class SaveInput(BaseModel):
    spotifyAlbumId: str
    albumName: str
    artistName: str
    coverUrl: Optional[str] = None


# ── helpers ──────────────────────────────────────────────────────────────
def tier_for(rank: int) -> str:
    for floor, letter in TIER_BOUNDS:
        if rank >= floor:
            return letter
    return "D"


def _embedded_count(value: Any) -> int:
    """PostgREST returns embedded aggregates as [{'count': n}] (or {} / [])."""
    if isinstance(value, list):
        return value[0].get("count", 0) if value else 0
    if isinstance(value, dict):
        return value.get("count", 0)
    return 0


def shape_entry(row: Dict[str, Any], liked_ids: Optional[set] = None) -> Dict[str, Any]:
    author = row.get("author") or {}
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "albumId": row["spotify_album_id"],
        "albumName": row["album_name"],
        "artistName": row["artist_name"],
        "coverUrl": row.get("cover_url"),
        "rank": row["rank"],
        "tier": tier_for(row["rank"]),
        "review": row.get("review"),
        "visibility": row.get("visibility", "public"),
        "createdAt": row.get("created_at"),
        "author": {
            "id": author.get("id"),
            "name": author.get("name"),
            "username": author.get("username"),
            "avatarUrl": author.get("avatar_url"),
        },
        "likeCount": _embedded_count(row.get("likes")),
        "commentCount": _embedded_count(row.get("comments")),
        "likedByMe": bool(liked_ids and row["id"] in liked_ids),
    }


def liked_entry_ids(user_id: str, entry_ids: List[str]) -> set:
    if not entry_ids:
        return set()
    res = (
        supabase_admin.table("entry_likes")
        .select("entry_id")
        .eq("user_id", user_id)
        .in_("entry_id", entry_ids)
        .execute()
    )
    return {r["entry_id"] for r in (res.data or [])}


def shape_entries(rows: List[Dict[str, Any]], viewer_id: str) -> List[Dict[str, Any]]:
    liked = liked_entry_ids(viewer_id, [r["id"] for r in rows])
    return [shape_entry(r, liked) for r in rows]


def shape_profile(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "username": row.get("username"),
        "email": row.get("email"),
        "avatarUrl": row.get("avatar_url"),
        "bio": row.get("bio"),
        "createdAt": row.get("created_at"),
    }


def count_rows(table: str, column: str, value: str) -> int:
    res = (
        supabase_admin.table(table)
        .select(column, count="exact")
        .eq(column, value)
        .limit(1)
        .execute()
    )
    return res.count or 0


def following_ids(user_id: str) -> List[str]:
    res = (
        supabase_admin.table("user_follows")
        .select("following_id")
        .eq("follower_id", user_id)
        .execute()
    )
    return [r["following_id"] for r in (res.data or [])]


def require_profile(user_id: str) -> Dict[str, Any]:
    res = (
        supabase_admin.table("profiles")
        .select(profile_select())
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data[0]


def profile_stats(user_id: str, viewer_id: str) -> Dict[str, Any]:
    followers = count_rows("user_follows", "following_id", user_id)
    following = count_rows("user_follows", "follower_id", user_id)
    rankings = count_rows("album_entries", "user_id", user_id)
    saved = count_rows("saved_albums", "user_id", user_id)

    is_following = False
    if viewer_id != user_id:
        res = (
            supabase_admin.table("user_follows")
            .select("follower_id")
            .eq("follower_id", viewer_id)
            .eq("following_id", user_id)
            .limit(1)
            .execute()
        )
        is_following = bool(res.data)

    return {
        "followers": followers,
        "following": following,
        "rankingCount": rankings,
        "savedCount": saved,
        "isFollowing": is_following,
        "isMe": viewer_id == user_id,
    }


# ── profiles ─────────────────────────────────────────────────────────────
@router.get("/users/search")
def search_users(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    user_id: str = Depends(current_user_id),
):
    """Find people by display name or handle."""
    needle = q.strip().lstrip("@")
    res = (
        supabase_admin.table("profiles")
        .select(profile_select())
        .or_(
            f"name.ilike.%{needle}%,username.ilike.%{needle}%"
            if usernames.supported()
            else f"name.ilike.%{needle}%"
        )
        .neq("id", user_id)
        .limit(limit)
        .execute()
    )
    rows = res.data or []
    followed = set(following_ids(user_id))
    return [
        {**shape_profile(r), "email": None, "isFollowing": r["id"] in followed}
        for r in rows
    ]


@router.get("/users/me")
def get_my_profile(user_id: str = Depends(current_user_id)):
    profile = require_profile(user_id)
    return {**shape_profile(profile), **profile_stats(user_id, user_id)}


@router.patch("/users/me")
def update_my_profile(data: ProfileUpdate, user_id: str = Depends(current_user_id)):
    patch: Dict[str, Any] = {}
    if data.name is not None:
        patch["name"] = data.name.strip()
    if data.username is not None and usernames.supported():
        patch["username"] = usernames.require_available(
            usernames.normalize(data.username), except_user_id=user_id
        )
    if data.bio is not None:
        patch["bio"] = data.bio.strip() or None
    if data.avatarUrl is not None:
        patch["avatar_url"] = data.avatarUrl.strip() or None

    if not patch:
        return {**shape_profile(require_profile(user_id)), **profile_stats(user_id, user_id)}

    patch["updated_at"] = now_iso()
    supabase_admin.table("profiles").update(patch).eq("id", user_id).execute()
    return {**shape_profile(require_profile(user_id)), **profile_stats(user_id, user_id)}


def _avatar_kind(file: UploadFile) -> tuple[str, str]:
    """The extension to store an upload under, and the type to store it as."""
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    extension = AVATAR_TYPES.get(content_type)
    if extension:
        return extension, content_type

    suffix = (file.filename or "").rsplit(".", 1)[-1].lower()
    known = AVATAR_EXTENSIONS.get(suffix)
    if known:
        return known

    raise HTTPException(status_code=400, detail="Pick a JPEG, PNG, WebP or HEIC image.")


def _ensure_avatar_bucket() -> None:
    """Create the avatars bucket once, the first time anyone uploads."""
    try:
        supabase_admin.storage.get_bucket(AVATAR_BUCKET)
        return
    except Exception:
        pass

    try:
        supabase_admin.storage.create_bucket(
            AVATAR_BUCKET,
            options={"public": True, "file_size_limit": AVATAR_MAX_BYTES},
        )
    except Exception as e:
        # A parallel request may have created it in the meantime. Anything
        # else and the upload would fail as a bare "bucket not found", which
        # says nothing about why, so say it here instead.
        try:
            supabase_admin.storage.get_bucket(AVATAR_BUCKET)
        except Exception:
            raise HTTPException(
                status_code=502, detail=f"Could not prepare avatar storage: {e}"
            )


@router.post("/users/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...), user_id: str = Depends(current_user_id)
):
    """Upload a profile picture and point the profile at it."""
    extension, content_type = _avatar_kind(file)

    body = await file.read()
    if not body:
        raise HTTPException(status_code=400, detail="That image was empty.")
    if len(body) > AVATAR_MAX_BYTES:
        raise HTTPException(status_code=400, detail="That image is too large (max 6MB).")

    _ensure_avatar_bucket()

    # A fresh name each time, so caches and CDNs never serve the old face.
    path = f"{user_id}/{int(datetime.now(timezone.utc).timestamp())}.{extension}"
    try:
        supabase_admin.storage.from_(AVATAR_BUCKET).upload(
            path, body, {"content-type": content_type, "upsert": "true"}
        )
        # storage3 hands back the url with a bare "?" on the end.
        url = supabase_admin.storage.from_(AVATAR_BUCKET).get_public_url(path).rstrip("?")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upload failed: {e}")

    supabase_admin.table("profiles").update(
        {"avatar_url": url, "updated_at": now_iso()}
    ).eq("id", user_id).execute()

    return {"avatarUrl": url}


@router.get("/users/{profile_id}")
def get_profile(profile_id: str, user_id: str = Depends(current_user_id)):
    profile = shape_profile(require_profile(profile_id))
    if profile_id != user_id:
        # Only you get to see your own email address.
        profile["email"] = None
    return {**profile, **profile_stats(profile_id, user_id)}


@router.post("/users/{profile_id}/follow", status_code=201)
def follow_user(profile_id: str, user_id: str = Depends(current_user_id)):
    if profile_id == user_id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
    require_profile(profile_id)
    supabase_admin.table("user_follows").upsert(
        {"follower_id": user_id, "following_id": profile_id},
        on_conflict="follower_id,following_id",
        ignore_duplicates=True,
    ).execute()
    return {"isFollowing": True, "followers": count_rows("user_follows", "following_id", profile_id)}


@router.delete("/users/{profile_id}/follow")
def unfollow_user(profile_id: str, user_id: str = Depends(current_user_id)):
    (
        supabase_admin.table("user_follows")
        .delete()
        .eq("follower_id", user_id)
        .eq("following_id", profile_id)
        .execute()
    )
    return {"isFollowing": False, "followers": count_rows("user_follows", "following_id", profile_id)}


def _connection_list(rows: List[Dict[str, Any]], key: str, viewer_id: str):
    profiles = [r[key] for r in rows if r.get(key)]
    followed = set(following_ids(viewer_id))
    return [
        {
            **shape_profile(p),
            "email": None,
            "isFollowing": p["id"] in followed,
            "isMe": p["id"] == viewer_id,
        }
        for p in profiles
    ]


@router.get("/users/{profile_id}/followers")
def get_followers(profile_id: str, user_id: str = Depends(current_user_id)):
    res = (
        supabase_admin.table("user_follows")
        .select("profile:profiles!user_follows_follower_id_fkey(" + profile_select() + ")")
        .eq("following_id", profile_id)
        .order("created_at", desc=True)
        .execute()
    )
    return _connection_list(res.data or [], "profile", user_id)


@router.get("/users/{profile_id}/following")
def get_following(profile_id: str, user_id: str = Depends(current_user_id)):
    res = (
        supabase_admin.table("user_follows")
        .select("profile:profiles!user_follows_following_id_fkey(" + profile_select() + ")")
        .eq("follower_id", profile_id)
        .order("created_at", desc=True)
        .execute()
    )
    return _connection_list(res.data or [], "profile", user_id)


@router.get("/users/{profile_id}/entries")
def get_user_entries(
    profile_id: str,
    limit: int = Query(200, ge=1, le=500),
    user_id: str = Depends(current_user_id),
):
    """A user's ranked albums, newest first. Private entries are owner-only."""
    query = (
        supabase_admin.table("album_entries")
        .select(entry_select())
        .eq("user_id", profile_id)
        .order("rank", desc=True)
        .order("created_at", desc=True)
        .limit(limit)
    )
    if profile_id != user_id:
        query = query.eq("visibility", "public")
    return shape_entries(query.execute().data or [], user_id)


@router.get("/users/{profile_id}/watchlist")
def get_user_watchlist(
    profile_id: str,
    limit: int = Query(100, ge=1, le=500),
    user_id: str = Depends(current_user_id),
):
    """Someone's to-be-listened list, newest first.

    Shown on their profile, so unlike a ranking it has no private mode — a
    saved album is only ever "I mean to hear this".
    """
    require_profile(profile_id)
    res = (
        supabase_admin.table("saved_albums")
        .select("*")
        .eq("user_id", profile_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return [shape_saved(r) for r in without_ranked(profile_id, res.data or [])]


# ── entries ──────────────────────────────────────────────────────────────
@router.get("/entries/me")
def get_my_entries(user_id: str = Depends(current_user_id)):
    return get_user_entries(user_id, 500, user_id)


@router.post("/entries", status_code=201)
def upsert_entry(data: EntryInput, user_id: str = Depends(current_user_id)):
    """Rank an album. Ranking the same album again updates the existing entry."""
    payload = {
        "user_id": user_id,
        "spotify_album_id": data.spotifyAlbumId,
        "album_name": data.albumName,
        "artist_name": data.artistName,
        "cover_url": data.coverUrl,
        "rank": data.rank,
        "review": (data.review or "").strip() or None,
        "visibility": data.visibility,
        "updated_at": now_iso(),
    }
    supabase_admin.table("album_entries").upsert(
        payload, on_conflict="user_id,spotify_album_id"
    ).execute()

    # Ranking an album takes it off the to-be-listened list.
    (
        supabase_admin.table("saved_albums")
        .delete()
        .eq("user_id", user_id)
        .eq("spotify_album_id", data.spotifyAlbumId)
        .execute()
    )

    res = (
        supabase_admin.table("album_entries")
        .select(entry_select())
        .eq("user_id", user_id)
        .eq("spotify_album_id", data.spotifyAlbumId)
        .limit(1)
        .execute()
    )
    return shape_entry(res.data[0], set()) if res.data else {}


@router.get("/entries/{entry_id}")
def get_entry(entry_id: str, user_id: str = Depends(current_user_id)):
    res = (
        supabase_admin.table("album_entries")
        .select(entry_select())
        .eq("id", entry_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    row = res.data[0]
    if row["visibility"] == "private" and row["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Entry not found")
    return shape_entry(row, liked_entry_ids(user_id, [entry_id]))


@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: str, user_id: str = Depends(current_user_id)):
    res = (
        supabase_admin.table("album_entries")
        .delete()
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"deleted": entry_id}


def _visible_entry(entry_id: str, user_id: str) -> Dict[str, Any]:
    res = (
        supabase_admin.table("album_entries")
        .select("id, user_id, visibility")
        .eq("id", entry_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    row = res.data[0]
    if row["visibility"] == "private" and row["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Entry not found")
    return row


@router.post("/entries/{entry_id}/like", status_code=201)
def like_entry(entry_id: str, user_id: str = Depends(current_user_id)):
    _visible_entry(entry_id, user_id)
    supabase_admin.table("entry_likes").upsert(
        {"user_id": user_id, "entry_id": entry_id},
        on_conflict="user_id,entry_id",
        ignore_duplicates=True,
    ).execute()
    return {"likedByMe": True, "likeCount": count_rows("entry_likes", "entry_id", entry_id)}


@router.delete("/entries/{entry_id}/like")
def unlike_entry(entry_id: str, user_id: str = Depends(current_user_id)):
    (
        supabase_admin.table("entry_likes")
        .delete()
        .eq("user_id", user_id)
        .eq("entry_id", entry_id)
        .execute()
    )
    return {"likedByMe": False, "likeCount": count_rows("entry_likes", "entry_id", entry_id)}


@router.get("/entries/{entry_id}/comments")
def list_comments(entry_id: str, user_id: str = Depends(current_user_id)):
    _visible_entry(entry_id, user_id)
    res = (
        supabase_admin.table("entry_comments")
        .select(
            "id, body, created_at, user_id,"
            f" author:profiles!entry_comments_user_id_fkey(id, name{_handle()}, avatar_url)"
        )
        .eq("entry_id", entry_id)
        .order("created_at", desc=False)
        .execute()
    )
    return [
        {
            "id": r["id"],
            "body": r["body"],
            "createdAt": r["created_at"],
            "isMine": r["user_id"] == user_id,
            "author": {
                "id": (r.get("author") or {}).get("id"),
                "name": (r.get("author") or {}).get("name"),
                "username": (r.get("author") or {}).get("username"),
                "avatarUrl": (r.get("author") or {}).get("avatar_url"),
            },
        }
        for r in (res.data or [])
    ]


@router.post("/entries/{entry_id}/comments", status_code=201)
def add_comment(entry_id: str, data: CommentInput, user_id: str = Depends(current_user_id)):
    _visible_entry(entry_id, user_id)
    supabase_admin.table("entry_comments").insert(
        {"entry_id": entry_id, "user_id": user_id, "body": data.body.strip()}
    ).execute()
    return list_comments(entry_id, user_id)


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: str, user_id: str = Depends(current_user_id)):
    res = (
        supabase_admin.table("entry_comments")
        .delete()
        .eq("id", comment_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"deleted": comment_id}


# ── feed ─────────────────────────────────────────────────────────────────
@router.get("/feed")
def get_feed(
    limit: int = Query(30, ge=1, le=100),
    user_id: str = Depends(current_user_id),
):
    """Rankings from the people you follow, plus your own, newest first."""
    author_ids = following_ids(user_id) + [user_id]
    res = (
        supabase_admin.table("album_entries")
        .select(entry_select())
        .in_("user_id", author_ids)
        .eq("visibility", "public")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return shape_entries(res.data or [], user_id)


# ── to-be-listened list ──────────────────────────────────────────────────
def shape_saved(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "albumId": row["spotify_album_id"],
        "albumName": row["album_name"],
        "artistName": row["artist_name"],
        "coverUrl": row.get("cover_url"),
        "createdAt": row.get("created_at"),
    }


def ranked_album_ids(owner_id: str, album_ids: Optional[List[str]] = None) -> set:
    """Which of these albums the owner has already ranked."""
    if album_ids is not None and not album_ids:
        return set()
    query = (
        supabase_admin.table("album_entries")
        .select("spotify_album_id")
        .eq("user_id", owner_id)
    )
    if album_ids is not None:
        query = query.in_("spotify_album_id", album_ids)
    res = query.execute()
    return {r["spotify_album_id"] for r in (res.data or [])}


def without_ranked(owner_id: str, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Saved rows, minus anything its owner has since ranked.

    Ranking takes an album off the list, but rows saved before that rule — or
    by an older build — can still be sitting there, and a record you have
    already ranked is not something you mean to listen to.
    """
    ids = [r["spotify_album_id"] for r in rows]
    ranked = ranked_album_ids(owner_id, ids)
    return [r for r in rows if r["spotify_album_id"] not in ranked]


@router.get("/watchlist")
def get_watchlist(user_id: str = Depends(current_user_id)):
    res = (
        supabase_admin.table("saved_albums")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [shape_saved(r) for r in without_ranked(user_id, res.data or [])]


@router.post("/watchlist", status_code=201)
def add_to_watchlist(data: SaveInput, user_id: str = Depends(current_user_id)):
    # An album you have ranked is one you have heard, so it has no business
    # on a list of albums to get to.
    if ranked_album_ids(user_id, [data.spotifyAlbumId]):
        raise HTTPException(
            status_code=409, detail="You've already ranked this album."
        )

    supabase_admin.table("saved_albums").upsert(
        {
            "user_id": user_id,
            "spotify_album_id": data.spotifyAlbumId,
            "album_name": data.albumName,
            "artist_name": data.artistName,
            "cover_url": data.coverUrl,
        },
        on_conflict="user_id,spotify_album_id",
    ).execute()
    return {"saved": True, "albumId": data.spotifyAlbumId}


@router.delete("/watchlist/{album_id}")
def remove_from_watchlist(album_id: str, user_id: str = Depends(current_user_id)):
    (
        supabase_admin.table("saved_albums")
        .delete()
        .eq("user_id", user_id)
        .eq("spotify_album_id", album_id)
        .execute()
    )
    return {"saved": False, "albumId": album_id}


# ── album social data ────────────────────────────────────────────────────
@router.get("/albums/{album_id}/social")
def album_social(album_id: str, user_id: str = Depends(current_user_id)):
    """Everything the album page needs on top of the Spotify payload."""
    res = (
        supabase_admin.table("album_entries")
        .select(entry_select())
        .eq("spotify_album_id", album_id)
        .eq("visibility", "public")
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    rows = res.data or []

    ranks = [r["rank"] for r in rows]
    average = round(sum(ranks) / len(ranks), 1) if ranks else None

    followed = set(following_ids(user_id))
    liked = liked_entry_ids(user_id, [r["id"] for r in rows])

    mine = next((shape_entry(r, liked) for r in rows if r["user_id"] == user_id), None)
    if mine is None:
        # A private entry of my own still counts as "already ranked".
        own = (
            supabase_admin.table("album_entries")
            .select(entry_select())
            .eq("spotify_album_id", album_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if own.data:
            mine = shape_entry(own.data[0], liked)

    friends = [shape_entry(r, liked) for r in rows if r["user_id"] in followed]
    others = [
        shape_entry(r, liked)
        for r in rows
        if r["user_id"] not in followed and r["user_id"] != user_id
    ]

    saved = (
        supabase_admin.table("saved_albums")
        .select("spotify_album_id")
        .eq("user_id", user_id)
        .eq("spotify_album_id", album_id)
        .limit(1)
        .execute()
    )

    return {
        "average": average,
        "ratingCount": len(ranks),
        "myEntry": mine,
        "saved": bool(saved.data),
        "friends": friends,
        "everyone": others,
    }


@router.get("/ratings")
def album_ratings(
    albumIds: str = Query(..., description="Comma-separated Spotify album ids"),
    user_id: str = Depends(current_user_id),
):
    """Average rating for a batch of albums, keyed by album id."""
    ids = [a for a in (albumIds or "").split(",") if a][:60]
    if not ids:
        return {}

    res = (
        supabase_admin.table("album_entries")
        .select("spotify_album_id, rank")
        .in_("spotify_album_id", ids)
        .eq("visibility", "public")
        .execute()
    )

    buckets: Dict[str, List[int]] = {}
    for row in res.data or []:
        buckets.setdefault(row["spotify_album_id"], []).append(row["rank"])

    return {
        album_id: {
            "average": round(sum(ranks) / len(ranks), 1),
            "count": len(ranks),
        }
        for album_id, ranks in buckets.items()
    }
