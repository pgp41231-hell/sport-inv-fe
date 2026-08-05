# Courtyard — IIM Lucknow Sports Frontend

React/Vite frontend for the Spot-InV venue, equipment, booking, approval, and sports-content API.

## Run locally

```powershell
Copy-Item .env.example .env
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

The default API is `https://spot-inv-be.vercel.app/api/v1`. Change `VITE_API_BASE_URL` in `.env` when connecting to a local or preview backend.

## Current authentication mode

The backend currently uses demo authentication. The profile menu switches among requester, approver, scorekeeper, and admin test identities by sending the backend's temporary `x-user-*` headers. Replace this with an OAuth/OIDC token provider when institutional login is introduced.

## Build

```powershell
pnpm build
pnpm preview
```
