# recrd/backend/db.py
"""Shared Supabase clients.

The supabase-py sync client validates the API key format before it will build,
and it does not yet recognise the newer ``sb_publishable_`` / ``sb_secret_``
keys, so ``CompatSyncClient`` skips that check while keeping the rest of the
client construction identical.
"""

import os
import re
import threading

import httpx
from dotenv import load_dotenv
from supabase import Client, create_client
from supabase._sync.client import (
    ClientOptions,
    SupabaseException,
    SyncClient,
    SyncMemoryStorage,
)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLIC_KEY = os.getenv("SUPABASE_PUBLIC_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_PUBLIC_KEY or not SUPABASE_SECRET_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL, SUPABASE_PUBLIC_KEY, or SUPABASE_SECRET_KEY"
    )

# gotrue leaves httpx on its 5s default, which a cold TLS handshake to Supabase
# can overrun — and every worker thread opens its own connection, so every
# thread pays that cost once.
NETWORK_TIMEOUT = httpx.Timeout(20.0, connect=20.0)


class CompatSyncClient(SyncClient):
    """SyncClient variant that accepts both JWT and sb_* API key formats."""

    def __init__(self, supabase_url: str, supabase_key: str, options: ClientOptions = None):
        if not supabase_url:
            raise SupabaseException("supabase_url is required")
        if not supabase_key:
            raise SupabaseException("supabase_key is required")

        if not re.match(r"^(https?)://.+", supabase_url):
            raise SupabaseException("Invalid URL")

        if options is None:
            options = ClientOptions(storage=SyncMemoryStorage())

        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.options = options
        options.headers.update(self._get_auth_headers())
        self.rest_url = f"{supabase_url}/rest/v1"
        self.realtime_url = f"{supabase_url}/realtime/v1".replace("http", "ws")
        self.auth_url = f"{supabase_url}/auth/v1"
        self.storage_url = f"{supabase_url}/storage/v1"
        self.functions_url = f"{supabase_url}/functions/v1"

        options.postgrest_client_timeout = NETWORK_TIMEOUT
        options.storage_client_timeout = NETWORK_TIMEOUT
        options.function_client_timeout = NETWORK_TIMEOUT

        self.auth = self._init_supabase_auth_client(
            auth_url=self.auth_url,
            client_options=options,
        )
        self.auth._http_client.timeout = NETWORK_TIMEOUT
        self.realtime = self._init_realtime_client(
            realtime_url=self.realtime_url,
            supabase_key=self.supabase_key,
            options=options.realtime if options else None,
        )
        self._postgrest = None
        self._storage = None
        self._functions = None
        self.auth.on_auth_state_change(self._listen_to_auth_events)


def create_supabase_client_compat(supabase_url: str, supabase_key: str) -> Client:
    if supabase_key.startswith("sb_publishable_") or supabase_key.startswith("sb_secret_"):
        return CompatSyncClient.create(supabase_url=supabase_url, supabase_key=supabase_key)
    return create_client(supabase_url, supabase_key)


class ThreadLocalClient:
    """A Supabase client per worker thread.

    FastAPI runs ``def`` route handlers in a threadpool, so a single shared
    client means several threads reading from one httpx connection pool at
    once, which intermittently blows up with ``httpx.ReadError`` (EAGAIN).
    Giving each thread its own client keeps requests independent, and it also
    means one request's signed-in session can never leak into another's.
    """

    def __init__(self, api_key: str):
        self._api_key = api_key
        self._local = threading.local()

    def _client(self) -> Client:
        client = getattr(self._local, "client", None)
        if client is None:
            client = create_supabase_client_compat(SUPABASE_URL, self._api_key)
            self._local.client = client
        return client

    def __getattr__(self, name):
        return getattr(self._client(), name)


# Anon-key client: used for sign up / sign in / token verification.
supabase_auth = ThreadLocalClient(SUPABASE_PUBLIC_KEY)
# Service-key client: bypasses RLS, used for every table read/write.
supabase_admin = ThreadLocalClient(SUPABASE_SECRET_KEY)
