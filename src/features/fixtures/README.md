# Fixtures module (demo)

A horizontally-scrolling strip of live/upcoming fixture cards, a full
day-by-day schedule modal, and add/edit/delete for both — scoped to the
scorekeeper and admin identities.

If you have never opened this repository, this file should be enough to
understand, run, and extend the module in a few minutes.

---

## 1. Why this exists

The backend has no fixtures, live-score, or schedule API yet — `GET
/public/matches` is the only related endpoint that exists, and it returns no
score data and is empty on the live deployment. Rather than leave the
"Fixtures & events" page with nothing to show, this module previews the
intended UI end to end against realistic example data
([`demoData.js`](demoData.js)), with full add/edit/delete so the interaction
model can be evaluated now, ahead of any backend work.

**None of it is real.** Every mutation is a local React state update in
`App.jsx`; nothing is sent over the network, and a page refresh resets
everything back to `FIXTURES_DEMO` / `SCHEDULE_DEMO`. Every "not saved to a
server" toast is deliberate, not an oversight.

## 2. Component map

| File | What it does |
|---|---|
| `FixturesPanel.jsx` | The card strip: arrow-scroll, per-card edit/delete, the "Add fixture" and "Schedule" entry points |
| `AddFixtureModal.jsx` | Form to append a new card to the strip |
| `ScheduleModal.jsx` | The full schedule, grouped by day, with the same edit/delete/add pattern |
| `AddScheduleModal.jsx` | Form to append a row to a chosen day |
| `demoData.js` | `FIXTURES_DEMO` and `SCHEDULE_DEMO` — the only two arrays this whole module reads from |
| `fixtures.css` | All styling, classes prefixed `fx-`, so merges never conflict — mirrors the booking module's `bk-` convention |
| `../../lib/format.js` | `titleCase`, shared with `App.jsx` |

`App.jsx` owns the `fixtures` and `schedule` state (seeded from
`demoData.js`) and the six handlers that mutate them, the same way it already
owns `bookings` and passes `onCancel` down to `MyBookingsPanel`. `SportsPage`
in `App.jsx` renders one `<FixturesPanel>` and passes all of it through.

## 3. Data flow

```
SportsPage (App.jsx)
    │  fixtures, schedule state + 6 handlers
    ▼
FixturesPanel
    │  card strip, scroll-by-arrow
    │
    ├─ Edit / Delete (per card)   ──▶ onUpdateFixture / onDeleteFixture
    ├─ "Add fixture"              ──▶ AddFixtureModal ──▶ onAddFixture
    │
    └─ "Schedule"                 ──▶ ScheduleModal
                                        │  same pattern, one level down
                                        ├─ Edit / Delete (per row) ──▶ onUpdateScheduleMatch / onDeleteScheduleMatch
                                        └─ "Add"                   ──▶ AddScheduleModal ──▶ onAddScheduleMatch
```

Every handler follows the same shape: read `current` state, return a new
array/object with the one match changed/added/removed, then a toast. See
`updateFixture`, `addFixture`, `deleteFixture`, `updateScheduleMatch`,
`addScheduleMatch`, `deleteScheduleMatch` in `App.jsx`.

## 4. The edit lifecycle

Both `FixturesPanel` and `ScheduleModal` use the same three-state pattern per
row/card, independently of each other:

```
  viewing ──"Edit"──▶ editing ──"Save"──▶ viewing (with the new values)
     │                   │
     │                "Cancel"
     │                   ▼
     │                viewing (unchanged)
     │
  "Delete"
     ▼
  confirming ──"Keep"──▶ viewing
     │
  "Delete" (again)
     ▼
  gone
```

- **Delete always confirms first**, inline (`Keep` / `Delete`), matching the
  pattern `MyBookingsPanel` already uses for cancelling a booking — no
  browser `confirm()` popup.
- **Sport and live/upcoming/completed status are never editable** on an
  existing card or row. Changing what a fixture fundamentally *is* goes
  through delete-and-re-add, not an edit form — kept out of scope on purpose.
- **Only one row/card can be mid-edit or mid-confirm at a time** per panel
  (`editingId` / `confirmDeleteId` are single values, not sets).

## 5. Box sizing, worth knowing before you touch the CSS

`.fx-track` uses `align-items: flex-start`, not flexbox's default `stretch`.
That's deliberate: editing one card adds input rows and grows it, and with
`stretch` that growth would cascade to every sibling card in the row. With
`flex-start`, each card only ever resizes itself. Combined with `.fx-card`'s
`min-height`, cards line up evenly when nothing is being edited.

All fixture/schedule text (team names, stage, venue, notes) truncates with an
ellipsis rather than wrapping — every place that does this needs
`min-width: 0` on the flex/grid item as well as the ellipsis rules on the
text itself, or the browser never shrinks the box enough for the ellipsis to
apply. `fixtures.css` has comments at the two spots (`.fx-panel`,
`.fx-schedule-main`) where skipping this previously let a single long string
stretch the whole page.

## 6. Known limits and where to go next

- This is a preview, not a feature. Wiring it to a real backend means: an
  actual `matches`/`fixtures` table with live scores, `POST`/`PATCH`/`DELETE`
  endpoints, and swapping every handler in `App.jsx` from local `setState`
  to an `api.js` call. `FixturesPanel`'s props (`onUpdateFixture`,
  `onAddFixture`, `onDeleteFixture`, and the schedule equivalents) already
  take a plain callback, so making them `async` later shouldn't require
  changing anything inside `FixturesPanel`/`ScheduleModal` themselves.
- `FIXTURES_DEMO` and `SCHEDULE_DEMO` are two separate arrays that happen to
  share `id`s for today's live matches, but nothing keeps them in sync — an
  edit made in one does not reflect in the other. A real backend would make
  the schedule a view over the same fixtures table, not a parallel dataset.
- No tests yet. `features/booking/` has 41 component cases precisely because
  the hold-lifecycle state machine is easy to get subtly wrong; this module
  has a comparable edit/confirm state machine and would benefit from the
  same treatment before it's anything more than a demo.
- Only scorekeeper/admin can add/edit/delete; requester/approver see the
  cards and schedule read-only. There's no per-fixture ownership — any
  scorekeeper can edit any fixture, mirroring how the real backend's
  scorekeeper role is described in the top-level README, not something this
  module invented.
