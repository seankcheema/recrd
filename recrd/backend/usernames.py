# recrd/backend/usernames.py
"""Handles.

A profile has two names: `name` is the display name, which is whatever the
person wants and can repeat, and `username` is the unique handle people are
found and @-mentioned by. Kept in its own module because both auth.py and
social.py need it and they already import in one direction.
"""

import re
import threading
from typing import Optional

from fastapi import HTTPException

from db import supabase_admin

USERNAME_RE = re.compile(r"^[a-z0-9][a-z0-9._]{2,19}$")
USERNAME_RULE = (
    "Usernames are 3-20 characters, lowercase letters, numbers, dots and "
    "underscores, starting with a letter or number."
)

# Handles the app itself uses, or that would read as official.
RESERVED = {"admin", "recrd", "support", "help", "about", "settings", "me", "you"}


_supported: Optional[bool] = None
_probe_lock = threading.Lock()


def supported() -> bool:
    """Whether profiles.username exists yet.

    The column arrives with a migration run by hand against Supabase, so until
    someone applies schema.sql every query that mentions it would 500. Probed
    once and remembered: the answer only changes on a deploy.
    """
    global _supported
    if _supported is None:
        with _probe_lock:
            if _supported is None:
                try:
                    supabase_admin.table("profiles").select("username").limit(1).execute()
                    _supported = True
                except Exception:
                    _supported = False
    return _supported


def normalize(raw: str) -> str:
    """Lowercase and trim, then check it against the rules."""
    username = (raw or "").strip().lower().lstrip("@")
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail=USERNAME_RULE)
    if username in RESERVED:
        raise HTTPException(status_code=400, detail="That username is taken.")
    return username


def is_taken(username: str, except_user_id: Optional[str] = None) -> bool:
    query = supabase_admin.table("profiles").select("id").eq("username", username)
    if except_user_id:
        query = query.neq("id", except_user_id)
    return bool((query.limit(1).execute()).data)


def require_available(username: str, except_user_id: Optional[str] = None) -> str:
    if is_taken(username, except_user_id):
        raise HTTPException(status_code=409, detail="That username is taken.")
    return username


def suggest_from(seed: str) -> str:
    """A valid, free handle derived from an email or display name.

    Used when a profile row has to be healed into existence without the
    person there to choose one.
    """
    base = re.sub(r"[^a-z0-9._]", "", (seed or "").strip().lower())[:18] or "listener"
    if len(base) < 3:
        base = f"{base}user"[:20]

    candidate = base
    suffix = 1
    while is_taken(candidate):
        suffix += 1
        tail = str(suffix)
        candidate = f"{base[: 20 - len(tail)]}{tail}"
    return candidate
