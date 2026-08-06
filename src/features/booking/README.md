# Booking module (EPIC-03 / EPIC-04)

The venue booking experience: a calendar, a five-minute slot lock, safe
confirmation, alternative suggestions when a slot is taken, and the My Bookings
list.

If you have never opened this repository, this file should be enough to
understand, run, and extend the module in about ten minutes.

---

## 1. Why this exists

Before this, booking a venue meant typing two `datetime-local` values into a
form and hoping. Three things were wrong with that:

1. **You could not see what was free.** You guessed a time, submitted, and found
   out. Blackout windows were completely invisible, because the only endpoint
   that lists them requires an admin.
2. **Two people could race.** Both open the same slot, both spend a minute
   typing a title and purpose, one loses. Nothing was technically broken; one
   person simply wasted their time.
3. **A refusal was a dead end.** "The resource is unavailable for that time",
   and nothing else. You re-guessed by hand until something worked.

## 2. Component map

Every file owns one user story, so a reviewer can go straight to the code for
the story they care about.

| File | Story | What it does |
|---|---|---|
| `AvailabilityCalendar.jsx` | **US-04A** | Seven days of slots, each marked available / booked / blacked-out / held / yours / past |
| `SlotHoldBar.jsx` | **US-04B** | The live `mm:ss` countdown, release action, and expiry |
| `BookingWizard.jsx` | **US-04B, US-04C** | The two-step flow, and the owner of the hold lifecycle |
| `AlternativeSlots.jsx` | **US-05C, US-05D** | Up to three alternatives, and a real answer when there are none |
| `MyBookingsPanel.jsx` | **US-04D** | Upcoming/past tabs, status filter, countdown, cancellation |
| `booking.css` | — | All styling. Separate file, all classes prefixed `bk-`, so merges never conflict |
| `../../lib/slots.js` | US-04A, US-05A | Pure slot maths, and a local mirror of the backend's recommendation rules |

`src/App.jsx` changes by four lines: two imports, the CSS import, and swapping
`BookingModal` → `BookingWizard` and the bookings list → `MyBookingsPanel`.

## 3. Data flow

```
Venues page
    │  "Reserve venue"
    ▼
BookingWizard ─── step "calendar" ──▶ AvailabilityCalendar
    │                                     │  GET /public/availability
    │                                     │  → { data, blackouts, holds }
    │                                     │  buildDaySlots() turns three lists
    │                                     ▼  into one grid of labelled slots
    │  ◀───────────── onSelect(slot) ─────┘
    │
    │  POST /holds                     (US-04B)
    ▼
  step "details" ─── SlotHoldBar counts down from 05:00
    │
    │  POST /bookings { ..., holdId }  (US-04C)
    │
    ├── 201 ─────────▶ onSaved() → toast, refresh, go to My bookings
    │                  (the backend consumes the hold; we do NOT release it)
    │
    └── 409 ─────────▶ step "alternatives" ──▶ AlternativeSlots  (US-05C/05D)
                          alternatives come from, in order:
                          1. error.details.alternatives  (no extra request)
                          2. GET /public/recommendations
                          3. recommendSlotsLocally()     (offline fallback)
```

## 4. The hold lifecycle

This is the part worth understanding before changing anything.

```
        pick a slot
  idle ─────────────▶ held ─────────────▶ booked
                       │  │   confirm      (backend consumes the hold)
                       │  │
     timer reaches 0   │  │  close / back / cancel / unmount
              expired ◀┘  └▶ released
                       │
                       └──▶ back to the calendar with an explanation
```

Rules that are easy to break:

- **A hold is released on every exit except a successful booking.** Closing the
  modal, going back, and unmounting all release it. On success the backend marks
  it consumed instead — releasing it too would be a second write against a hold
  that no longer exists.
- **`onExpire` fires exactly once.** `SlotHoldBar` guards with a ref, because the
  interval keeps ticking for a tick or two while React re-renders.
- **The hold is held in a ref as well as state.** The unmount cleanup needs the
  current hold without re-running (and therefore releasing) on every change.
- **A hold only authorises its exact slot.** If the user changes the time, the
  backend rejects the stale `holdId` — so the wizard takes a fresh hold whenever
  a new slot is picked.

## 5. Degradation matrix

The fork this branch lives on gets no preview deployment, so the frontend runs
against whatever backend is deployed — possibly one without the EPIC-03 APIs.
**Every new endpoint is therefore optional.**

| Endpoint | If it 404s | What the user sees |
|---|---|---|
| `POST /holds` | `holdUnavailable` is set; booking proceeds | "Slot lock unavailable — this slot is not reserved while you fill in the form, so book promptly" |
| `DELETE /holds/:id` | Swallowed | Nothing. The hold expires on its own within five minutes |
| `GET /public/recommendations` | `recommendSlotsLocally()` computes them from availability, with the same rules and weights | Alternatives, indistinguishable from the server-side ones |
| `GET /public/availability` without `blackouts` / `holds` | Those layers render empty | A calendar with booked and available slots only |
| `GET /public/availability` fails outright | Surfaced as an error | An alert. This is the one call the calendar cannot do without, so a false "everything is free" would be worse than saying so |

`isMissingEndpoint(error)` in `src/api.js` is the single place that decides what
counts as "feature unavailable" (404 or 501) rather than a real error.

## 6. Running the tests

```bash
npm test              # 17 pure-logic cases, node --test, zero dependencies
npm run test:components   # 41 component cases, vitest + jsdom
npm run test:all      # both
```

The split is deliberate. `src/lib/slots.js` is plain ESM with no React, so it
runs under Node's own test runner with nothing installed — which keeps the most
important logic (slot maths, peak windows, overlap) testable in any environment.
`vitest` is only there for behaviour that genuinely needs a render and a clock:
the countdown, the calendar's slot states, cancellation, and the 404 fallbacks.

`vitest` is pinned to `^4` to match the repo's Vite 8. Version 2 silently skips
the JSX transform against Vite 8 and every test fails with `React is not defined`.

## 7. Known limits and where to go next

- The calendar shows one venue at a time. "This court is busy, try the other
  one" needs cross-venue search, in the backend first.
- Slot durations are fixed at 1 / 1.5 / 2 hours, and the bookable day is
  06:00–23:00 IST for every venue. Per-venue opening hours belong in
  `venues.rules`, which nothing reads yet.
- The calendar re-polls every 30 seconds only while holds are visible. Bookings
  made by others in between appear on the next refresh, and are caught by the
  server on submit either way.
- `recommendSlotsLocally` duplicates the backend's weights. If those change,
  change both — the tests in `test/slots.test.js` and the backend's
  `test/recommendations.test.js` assert the same ranking rules.
- Equipment booking reuses the same wizard but the calendar treats quantity as
  all-or-nothing. Partial-quantity availability would need a different grid.

---

Backend counterpart: [`spot-inv-be/docs/epic-03-04-holds-and-recommendations.md`](https://github.com/pgp41231-hell/spot-inv-be/blob/main/docs/epic-03-04-holds-and-recommendations.md).
Verification checklist: [`docs/EPIC-03-04-ACCEPTANCE.md`](../../../docs/EPIC-03-04-ACCEPTANCE.md).
