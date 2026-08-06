# Tournaments module (demo)

Two big boxes on the Fixtures & events page — **Upcoming** (a list with
dates) and **Past Tournaments** (a link into a photo-gallery-style grid) —
plus add/edit/delete for both, admin-only.

## 1. Why this exists

`GET /public/tournaments` is the one real endpoint here, and it only returns
`{id, name, status}` for tournaments currently on campus — no future date,
no history to browse. This module previews the intended UI against example
data ([`demoData.js`](demoData.js)) ahead of that backend work. Nothing here
is real: every mutation is local React state in `App.jsx`, and a page
refresh resets everything back to the demo data.

## 2. Component map

| File | What it does |
|---|---|
| `TournamentsPanel.jsx` | The two boxes; owns whether the gallery is open (see §4) and all Upcoming-list editing |
| `TournamentGallery.jsx` | The past-tournaments grid; owns its own editing |
| `AddUpcomingModal.jsx` / `AddPastModal.jsx` | Their respective "Add" forms |
| `demoData.js` | `UPCOMING_TOURNAMENTS_DEMO` and `PAST_TOURNAMENTS_DEMO` |
| `tournaments.css` | All styling, classes prefixed `tm-` |
| `../../lib/format.js` | `formatDay`, shared with the rest of the app |

`App.jsx` owns the `upcomingTournaments`/`pastTournaments` state and the six
handlers that mutate them — same pattern as `fixtures`/`schedule`/`points` in
`features/fixtures/`.

## 3. Why editing is admin-only, not scorekeeper too

Every other editable thing on this page (fixtures, schedule, points table)
is scorekeeper **and** admin, because scoring a match is a scorekeeper's
job. Standing up or archiving a tournament is treated as an operations/admin
decision instead — that's the actual distinction this module encodes, not
an oversight.

## 4. "Past Tournaments" is not a real page

Clicking it doesn't navigate the app shell anywhere — `TournamentsPanel`
just swaps its own rendered content for `<TournamentGallery>` via a local
`galleryOpen` boolean. It reads like its own page (own heading, its own
"Back" link) without touching `App.jsx`'s `page`/`NAV` routing at all, and
resets back to the two-box view for free whenever this panel unmounts (i.e.
you navigate to a different top-level tab and back). If this ever becomes a
real route, that's the one thing to unwind.

## 5. Known limits

- Gallery cards cycle through 4 fixed cover gradients by index
  (`tm-cover-1`…`tm-cover-4`) with a plain Trophy icon — a deliberate choice
  over hotlinking real stock photos, so the page never depends on a
  third-party image host being reachable. Matches how venue/equipment cards
  already do a gradient-plus-icon "cover" elsewhere in the app.
- No tests yet, same caveat as `features/fixtures/README.md` §6.
