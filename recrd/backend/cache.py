# recrd/backend/cache.py
"""A small in-process TTL cache.

Spotify metadata and the artwork colour taken from it are the same every time
they are asked for, but working them out means a Spotify call, an image
download and a pass over its pixels. Holding the answer for a while turns a
page someone revisits into no outside calls at all.

Per process and in memory: restarting the server drops it, which is fine for
something that can always be recomputed.
"""

import threading
import time
from typing import Any, Callable, Dict, Optional, Tuple


class TTLCache:
    """Values held under a key until they go stale."""

    def __init__(self, ttl_seconds: float, max_entries: int = 512):
        self.ttl = ttl_seconds
        self.max_entries = max_entries
        self._entries: Dict[Any, Tuple[float, Any]] = {}
        self._lock = threading.Lock()
        # One lock per key, so a cold entry is computed once rather than once
        # per request that arrives while it is cold.
        self._build_locks: Dict[Any, threading.Lock] = {}

    def get(self, key: Any) -> Optional[Any]:
        with self._lock:
            hit = self._entries.get(key)
        if not hit:
            return None
        stored_at, value = hit
        if time.time() - stored_at > self.ttl:
            return None
        return value

    def set(self, key: Any, value: Any) -> None:
        with self._lock:
            self._entries[key] = (time.time(), value)
            if len(self._entries) > self.max_entries:
                # Drop the oldest quarter: what is in use is also what was
                # stored most recently.
                oldest = sorted(self._entries.items(), key=lambda kv: kv[1][0])
                for stale_key, _ in oldest[: len(self._entries) // 4]:
                    self._entries.pop(stale_key, None)

    def _build_lock(self, key: Any) -> threading.Lock:
        with self._lock:
            lock = self._build_locks.get(key)
            if lock is None:
                lock = threading.Lock()
                self._build_locks[key] = lock
            return lock

    def fetch(self, key: Any, build: Callable[[], Any]) -> Any:
        """The cached value for `key`, or `build()` stored under it."""
        hit = self.get(key)
        if hit is not None:
            return hit

        with self._build_lock(key):
            # Someone may have built it while we waited for the lock.
            hit = self.get(key)
            if hit is not None:
                return hit

            value = build()
            self.set(key, value)
            return value

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
