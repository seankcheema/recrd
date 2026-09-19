import os
import re
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

        self.auth = self._init_supabase_auth_client(
            auth_url=self.auth_url,
            client_options=options,
        )
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


supabase_auth: Client = create_supabase_client_compat(SUPABASE_URL, SUPABASE_PUBLIC_KEY)
supabase_admin: Client = create_supabase_client_compat(SUPABASE_URL, SUPABASE_SECRET_KEY)

# Create a router for auth-related endpoints
router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = HTTPBearer()

# Pydantic schemas
class SignUpInput(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    accessToken: str
    refreshToken: str
    expiresIn: int
    tokenType: str


@router.post("/signup", status_code=201)
def signup(data: SignUpInput):
    """
    Register a new user in Supabase Auth and create a profile row.
    """
    try:
        auth_response = supabase_auth.auth.sign_up(
            {
                "email": data.email,
                "password": data.password,
                "options": {"data": {"name": data.name}},
            }
        )

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sign up failed",
            )

        supabase_admin.table("profiles").upsert(
            {"id": auth_response.user.id, "name": data.name, "email": data.email},
            on_conflict="id",
        ).execute()

        return {
            "uid": auth_response.user.id,
            "email": auth_response.user.email,
            "message": "User created successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginInput):
    """
    Verify credentials against Supabase Auth and return tokens.
    """
    try:
        auth_response = supabase_auth.auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not auth_response.session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Login failed",
        )

    return {
        "accessToken": auth_response.session.access_token,
        "refreshToken": auth_response.session.refresh_token,
        "expiresIn": auth_response.session.expires_in,
        "tokenType": auth_response.session.token_type,
    }


@router.get("/me")
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme)
):
    """
    Verify Supabase JWT and return user info.
    """
    token = credentials.credentials
    try:
        user_response = supabase_auth.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        profile_name = None
        profile_data = (
            supabase_admin.table("profiles")
            .select("name")
            .eq("id", user_response.user.id)
            .limit(1)
            .execute()
        )
        if profile_data.data:
            profile_name = profile_data.data[0].get("name")

        return {
            "uid": user_response.user.id,
            "name": profile_name or (user_response.user.user_metadata or {}).get("name"),
            "email": user_response.user.email,
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

