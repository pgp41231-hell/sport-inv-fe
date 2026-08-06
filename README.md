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

## Test

```powershell
pnpm test              # pure slot logic, node --test, no dependencies needed
pnpm test:components   # component behaviour, vitest + jsdom
pnpm test:all          # both
```

## Booking calendar and recommendations (EPIC-03 / EPIC-04)

The venue booking flow, in `src/features/booking/`:

1. **Pick a slot on a calendar.** Seven days of slots for the chosen venue, each
   marked available, booked, closed for maintenance, being booked by someone
   else, yours, or already passed. Peak hours are dotted, because they take
   longer to get approved.
2. **The slot is held for you for five minutes.** A countdown runs while you
   fill in the details, and nobody else can take the slot until it expires. It
   is released automatically if you go back, close the form, or run out of time.
3. **Confirm.** If someone beat you to it, you are offered up to three
   alternative slots of the same length — same day first, off-peak first if your
   original was in the evening rush — each with a one-line reason. If genuinely
   nothing is free, you are told that plainly, with a suggestion of what to try
   instead.
4. **Track it in My bookings.** Upcoming and past are separated and filterable
   by status, each upcoming booking shows how long until it starts, and cancel
   asks for confirmation before it acts.

The module degrades on purpose: if the backend has not yet deployed the slot-lock
or recommendation APIs, booking still works — the lock is skipped with a visible
note, and alternatives are computed in the browser instead.

Details, including the hold state machine and the degradation matrix:
[`src/features/booking/README.md`](src/features/booking/README.md).
Verification checklist: [`docs/EPIC-03-04-ACCEPTANCE.md`](docs/EPIC-03-04-ACCEPTANCE.md).
