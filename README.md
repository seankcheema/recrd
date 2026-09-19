# recrd

a mobile social media app where users can rank albums they've listened to and see what others like too!

Albums are scored 1–10 in the database and shown as **S / A / B / C / D** tiers in the app
(`TIER_BOUNDS` in `backend/social.py` and `app/components/tiers.ts` define the mapping —
keep them in step).

## Stack
- **Front end** — Expo / React Native (expo-router), Liquid Glass surfaces via
  `expo-glass-effect` on iOS 26+ with an `expo-blur` fallback everywhere else.
- **Back end** — FastAPI, Spotify (spotipy) for catalogue data, Supabase for auth and storage.
- **Charts** — Apple's iTunes RSS top-albums feed (overall and per genre) resolved to
  Spotify albums; see `backend/charts.py`. Spotify's own `featured-playlists` and
  `recommendations` endpoints now return 404, and its `genre:` search filter returns
  noise, so Apple is the only usable source of real chart data.
- **Database** — Postgres on Supabase. The full schema is in `backend/schema.sql`.

## Setting up the database
Run `backend/schema.sql` once against your Supabase project (dashboard → SQL Editor,
or `psql "<connection string>" -f backend/schema.sql`). It is idempotent, so re-running
it is safe.

Supabase sends a confirmation email on sign up by default; until the address is confirmed
the API returns no session and the app asks the user to check their inbox. Turn that off
under **Authentication → Sign In / Providers → Confirm email** for a faster dev loop.

Migrations that came after the first release live in `backend/migrations/` and are listed
in order; `schema.sql` already includes them, so a fresh project only needs that file.

### Password reset
Reset uses a 6-digit code rather than a magic link, so it behaves the same in Expo Go as
in a standalone build — a link would need a different redirect URL for each. Supabase's
default **Reset Password** template only sends `{{ .ConfirmationURL }}`, so add the code
to it under **Authentication → Emails → Reset Password**:

```html
<p>Your recrd reset code is <strong>{{ .Token }}</strong>. It expires in an hour.</p>
```

## How to run:
### Back end
1. `cd recrd/backend`
2. `python3 -m venv venv`
3. `.\venv\Scripts\Activate.ps1` (Windows) | `source venv/bin/activate` (Mac/Linux)
4. `pip3 install -r requirements.txt`
5. Create `.env` with `SPOTIPY_CLIENT_ID`, `SPOTIPY_CLIENT_SECRET`, `SUPABASE_URL`,
   `SUPABASE_PUBLIC_KEY` and `SUPABASE_SECRET_KEY`
6. `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

### Front end
1. `cd recrd`
2. `npm install`
3. Set `EXPO_PUBLIC_API_URL` in `.env` (defaults to `http://localhost:8000`; on a device
   the app rewrites `localhost` to the Expo dev host automatically)
4. `npx expo start`

## API
Everything below `/auth` is public; everything else needs a `Bearer` access token.

| | |
|---|---|
| `POST /auth/signup` · `POST /auth/login` · `POST /auth/refresh` · `GET /auth/me` | accounts and sessions |
| `GET /auth/username-available` | is a handle free (public, for the sign up form) |
| `POST /auth/forgot-password` · `POST /auth/reset-password` | reset by emailed code |
| `POST /auth/password` · `POST /auth/delete-account` | change password, delete account |
| `GET /users/me` · `PATCH /users/me` · `GET /users/{id}` · `GET /users/search` | profiles |
| `POST /users/me/avatar` | profile picture upload (multipart, Supabase Storage) |
| `POST`/`DELETE /users/{id}/follow` · `GET /users/{id}/followers` · `/following` | the social graph |
| `POST /entries` · `GET /entries/me` · `GET /users/{id}/entries` · `DELETE /entries/{id}` | rankings |
| `POST`/`DELETE /entries/{id}/like` · `GET`/`POST /entries/{id}/comments` · `DELETE /comments/{id}` | likes and comments |
| `GET /feed` | rankings from the people you follow, plus your own |
| `GET`/`POST /watchlist` · `DELETE /watchlist/{albumId}` | the to-be-listened list |
| `GET /users/{id}/watchlist` | someone else's to-be-listened list |
| `GET /albums/{id}/social` · `GET /ratings?albumIds=` | recrd's own data for an album |
| `GET /albums/{id}` · `GET /artists/{id}` · `GET /search/` | Spotify catalogue |
| `GET /trending_albums/?genre=` · `GET /genres/` | charts (cached 30 min) |
| `GET /album_genres/?albumIds=` | coarse genres per album, for list filtering (cached 24h) |
