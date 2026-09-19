# recrd/backend/auth.py

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from gotrue.errors import AuthApiError, AuthRetryableError
from pydantic import BaseModel, EmailStr, Field

import usernames
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
    username: str = Field(min_length=3, max_length=20)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class RefreshInput(BaseModel):
    refreshToken: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=10)
    newPassword: str = Field(min_length=6)


class PasswordChangeInput(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=6)


class DeleteAccountInput(BaseModel):
    password: str


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
@router.get("/username-available")
def username_available(username: str):
    """Whether a handle is free, for the sign up form to check as you type."""
    if not usernames.supported():
        return {"available": True, "username": username}
    try:
        handle = usernames.normalize(username)
    except HTTPException as e:
        return {"available": False, "reason": e.detail}
    if usernames.is_taken(handle):
        return {"available": False, "reason": "That username is taken."}
    return {"available": True, "username": handle}


@router.post("/signup", status_code=201)
def signup(data: SignUpInput):
    """Register a new user in Supabase Auth and create their profile row."""
    name = data.name.strip()
    # Check the handle before creating the auth user, so a taken one does not
    # leave an account behind with no profile.
    username = (
        usernames.require_available(usernames.normalize(data.username))
        if usernames.supported()
        else None
    )
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

    profile_row = {"id": auth_response.user.id, "name": name, "email": data.email}
    if username:
        profile_row["username"] = username
    supabase_admin.table("profiles").upsert(profile_row, on_conflict="id").execute()

    session = auth_response.session
    return {
        "uid": auth_response.user.id,
        "email": auth_response.user.email,
        "name": name,
        "username": username,
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
        existing = (
            supabase_admin.table("profiles")
            .select("id")
            .eq("id", user.id)
            .limit(1)
            .execute()
        )
        if not existing.data:
            healed = {
                "id": user.id,
                "email": user.email,
                "name": (user.user_metadata or {}).get("name")
                or user.email.split("@")[0],
            }
            if usernames.supported():
                healed["username"] = usernames.suggest_from(user.email.split("@")[0])
            supabase_admin.table("profiles").insert(healed).execute()

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
        .select(
            "id, name, username, email, avatar_url, bio, created_at"
            if usernames.supported()
            else "id, name, email, avatar_url, bio, created_at"
        )
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
        "username": row.get("username"),
        "email": row["email"],
        "avatarUrl": row.get("avatar_url"),
        "bio": row.get("bio"),
    }


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordInput):
    """Email a recovery code to an address that has an account.

    Always answers the same way. Telling a caller "no account with that
    email" turns this endpoint into a way to find out who has signed up.
    """
    try:
        supabase_auth.auth.reset_password_for_email(data.email)
    except AuthRetryableError as e:
        raise auth_error(e, "Could not reach the auth service")
    except Exception:
        # Unknown address, or rate limited. Neither is the caller's business.
        pass
    return {"sent": True}


@router.post("/reset-password", response_model=TokenResponse)
def reset_password(data: ResetPasswordInput):
    """Exchange a recovery code for a new password, and sign the user in."""
    try:
        verified = supabase_auth.auth.verify_otp(
            {"email": data.email, "token": data.code.strip(), "type": "recovery"}
        )
    except AuthRetryableError as e:
        raise auth_error(e, "Could not reach the auth service")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That code is wrong or has expired. Request a new one.",
        )

    if not verified or not verified.user or not verified.session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That code is wrong or has expired. Request a new one.",
        )

    try:
        supabase_admin.auth.admin.update_user_by_id(
            verified.user.id, {"password": data.newPassword}
        )
    except Exception as e:
        raise auth_error(e, "Could not set that password")

    # The code is single-use and now spent, so hand back the session it
    # bought rather than making them log in again.
    return {
        "accessToken": verified.session.access_token,
        "refreshToken": verified.session.refresh_token,
        "expiresIn": verified.session.expires_in,
        "tokenType": verified.session.token_type,
    }


@router.post("/password")
def change_password(
    data: PasswordChangeInput, user_id: str = Depends(current_user_id)
):
    """Change the signed-in user's password.

    The access token alone is not enough: a borrowed phone would be able to
    lock the owner out of their own account, so the current password has to be
    re-entered and is checked by actually signing in with it.
    """
    if data.newPassword == data.currentPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That is already your password.",
        )

    profile = (
        supabase_admin.table("profiles")
        .select("email")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    try:
        supabase_auth.auth.sign_in_with_password(
            {"email": profile.data[0]["email"], "password": data.currentPassword}
        )
    except Exception as e:
        if isinstance(e, AuthRetryableError):
            raise auth_error(e, "Could not reach the auth service")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    try:
        supabase_admin.auth.admin.update_user_by_id(
            user_id, {"password": data.newPassword}
        )
    except Exception as e:
        raise auth_error(e, "Could not change password")

    return {"changed": True}


@router.post("/delete-account")
def delete_account(data: DeleteAccountInput, user_id: str = Depends(current_user_id)):
    """Delete the account and everything attached to it.

    Required by the App Store: an account created in the app has to be
    deletable from it. Every recrd table cascades off auth.users, so removing
    the auth user takes the profile, rankings, likes, comments, follows and
    saved albums with it.
    """
    profile = (
        supabase_admin.table("profiles")
        .select("email")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    try:
        supabase_auth.auth.sign_in_with_password(
            {"email": profile.data[0]["email"], "password": data.password}
        )
    except Exception as e:
        if isinstance(e, AuthRetryableError):
            raise auth_error(e, "Could not reach the auth service")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Password is incorrect."
        )

    try:
        supabase_admin.auth.admin.delete_user(user_id)
    except Exception as e:
        raise auth_error(e, "Could not delete account")

    return {"deleted": True}
