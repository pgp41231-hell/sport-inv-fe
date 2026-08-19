# Courtyard — IIM Lucknow Sports Frontend

React/Vite frontend for the Spot-InV venue, equipment, booking, approval, and sports-content API.

## Run locally

```powershell
Copy-Item .env.example .env
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

Set `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` in `.env` when connecting to a local or preview backend.

## Authentication

The application uses Supabase Auth for email/password signup, login, session restoration, and password changes. New users must match the administrator-managed email rule. Only `sportscomm@iiml.ac.in` can open Administration, where committee roles, the email regex, sports, teams, captains, POCs, and the inventory kiosk are managed.

### Required email-verification setup

The signup code requests a Supabase confirmation email and sends the verification link back to `VITE_SITE_URL`. Email delivery is controlled by the Supabase project and cannot be enabled by pushing application code alone. Before deploying:

1. In Supabase, open **Authentication > Providers > Email**. Enable the Email provider and turn **Confirm email** on.
2. Open **Authentication > URL Configuration**. Set **Site URL** to the deployed frontend URL and add the deployed URL and `http://localhost:5173` to **Redirect URLs**.
3. In the frontend hosting environment, set `VITE_SITE_URL` to the deployed frontend URL, along with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. For production delivery, configure **Project Settings > Authentication > SMTP Settings**. Supabase's built-in email service is rate-limited and intended for limited testing.

The confirmation is delivered to the signup address. If an `@iiml.ac.in` mailbox is hosted by Google Workspace, the message appears in that Google/Gmail inbox. The app signs the user out after signup and asks them to confirm the address before signing in.

The equipment module requires the Supabase database migration; it intentionally has no in-memory fallback. The `inventory@iiml.ac.in` account receives a scanner-only interface. QR input works with a keyboard-style scanner or by pasting the opaque token.

Venue and equipment photos are compressed to WebP in the browser and uploaded to the public `sports-media` Supabase Storage bucket. The administrator form accepts JPG, PNG, and WebP files up to 5MB. Equipment configuration reads sports, categories, and campus locations live from the database, and the Inventory overview separates in-store, student-held, team-held, damaged, and missing stock.

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
