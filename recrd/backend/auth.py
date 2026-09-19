# recrd/backend/auth.py

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from gotrue.errors import AuthApiError, AuthRetryableError
from pydantic import BaseModel, EmailStr, Field

from db import supabase_admin, supabase_auth

router = APIRouter(prefix="/auth", tags=["auth"])

bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)


def auth_error(exc: Exception, fallback: str) -> HTTPException:
    """Map a gotrue failure onto a status code.

    A network hiccup reaching Supabase is not the user getting their password
    wrong, and telling them it is sends them off fixing the wrong thing.
    """
    if isinstance(exc, AuthRetryableError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach the auth service. Check your connection and try again.",
        )
    if isinstance(exc, AuthApiError):
        return HTTPException(
            status_code=exc.status or status.HTTP_400_BAD_REQUEST,
            detail=exc.message or fallback,
        )
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=fallback)


# ── schemas ──────────────────────────────────────────────────────────────
class SignUpInput(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class RefreshInput(BaseModel):
    refreshToken: str


class TokenResponse(BaseModel):
    accessToken: str
    refreshToken: str
    expiresIn: int
    tokenType: str


# ── dependencies ─────────────────────────────────────────────────────────
def current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Verify the Supabase JWT and return the caller's user id."""
    try:
        user_response = supabase_auth.auth.get_user(credentials.credentials)
    except AuthRetryableError as e:
        raise auth_error(e, "Could not verify session")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    if not user_response or not user_response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    return user_response.user.id


def optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer_scheme),
) -> Optional[str]:
    """Same as ``current_user_id`` but returns None instead of rejecting."""
    if not credentials:
        return None
    try:
        user_response = supabase_auth.auth.get_user(credentials.credentials)
    except Exception:
        return None
    return user_response.user.id if user_response and user_response.user else None


# ── routes ───────────────────────────────────────────────────────────────
@router.post("/signup", status_code=201)
def signup(data: SignUpInput):
    """Register a new user in Supabase Auth and create their profile row."""
    name = data.name.strip()
    try:
        auth_response = supabase_auth.auth.sign_up(
            {
                "email": data.email,
                "password": data.password,
                "options": {"data": {"name": name}},
            }
        )
    except Exception as e:
        raise auth_error(e, "Sign up failed")

    if not auth_response.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Sign up failed"
        )

    supabase_admin.table("profiles").upsert(
        {"id": auth_response.user.id, "name": name, "email": data.email},
        on_conflict="id",
    ).execute()

    session = auth_response.session
    return {
        "uid": auth_response.user.id,
        "email": auth_response.user.email,
        "name": name,
        # Supabase returns a session straight away when email confirmation is
        # off; when it is on the client has to log in after confirming.
        "accessToken": session.access_token if session else None,
        "refreshToken": session.refresh_token if session else None,
        "expiresIn": session.expires_in if session else None,
        "tokenType": session.token_type if session else None,
        "message": "User created successfully",
    }


@router.post("/login", response_model=TokenResponse)
def login(data: LoginInput):
    """Verify credentials against Supabase Auth and return tokens."""
    try:
        auth_response = supabase_auth.auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
    except Exception as e:
        raise auth_error(e, "Incorrect email or password")

    if not auth_response.session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Login failed"
        )

    # A profile row can be missing if sign up half-failed; heal it on login.
    user = auth_response.user
    if user:
        supabase_admin.table("profiles").upsert(
            {
                "id": user.id,
                "email": user.email,
                "name": (user.user_metadata or {}).get("name") or user.email.split("@")[0],
            },
            on_conflict="id",
            ignore_duplicates=True,
        ).execute()

    return {
        "accessToken": auth_response.session.access_token,
        "refreshToken": auth_response.session.refresh_token,
        "expiresIn": auth_response.session.expires_in,
        "tokenType": auth_response.session.token_type,
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshInput):
    """Exchange a refresh token for a fresh access token."""
    try:
        auth_response = supabase_auth.auth.refresh_session(data.refreshToken)
    except AuthRetryableError as e:
        raise auth_error(e, "Could not refresh session")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not refresh session"
        )

    if not auth_response or not auth_response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not refresh session"
        )

    return {
        "accessToken": auth_response.session.access_token,
        "refreshToken": auth_response.session.refresh_token,
        "expiresIn": auth_response.session.expires_in,
        "tokenType": auth_response.session.token_type,
    }


@router.get("/me")
def get_me(user_id: str = Depends(current_user_id)):
    """Return the signed-in user's profile row."""
    profile = (
        supabase_admin.table("profiles")
        .select("id, name, email, avatar_url, bio, created_at")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    row = profile.data[0]
    return {
        "uid": row["id"],
        "name": row["name"],
        "email": row["email"],
        "avatarUrl": row.get("avatar_url"),
        "bio": row.get("bio"),
    }
