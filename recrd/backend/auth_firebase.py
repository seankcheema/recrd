import os
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
import firebase_admin
from firebase_admin import auth as fb_auth, credentials
import httpx
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Initialize Firebase Admin SDK once at import
if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    firebase_admin.initialize_app(cred)

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
    idToken: str
    refreshToken: str
    expiresIn: str


@router.post("/signup", status_code=201)
def signup(data: SignUpInput):
    """
    Register a new user in Firebase.
    """
    try:
        user = fb_auth.create_user(
            email=data.email,
            password=data.password,
            display_name=data.name,
        )
        # Optionally issue a custom token
        custom_token = fb_auth.create_custom_token(user.uid).decode('utf-8')
        return {"uid": user.uid, "customToken": custom_token}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginInput):
    """
    Verify credentials against Firebase Auth REST API and return tokens.
    """
    api_key = os.getenv("FIREBASE_API_KEY")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    payload = {"email": data.email, "password": data.password, "returnSecureToken": True}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, timeout=10)
    if resp.status_code != 200:
        error_msg = resp.json().get("error", {}).get("message", "Login failed")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
    return resp.json()


@router.get("/me")
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme)
):
    """
    Verify Firebase ID token and return user info.
    """
    token = credentials.credentials
    try:
        decoded = fb_auth.verify_id_token(token)
        user = fb_auth.get_user(decoded["uid"])
        return {"uid": user.uid, "name": user.display_name, "email": user.email}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

