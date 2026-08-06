// DEMO DATA — no fixtures/live-score/schedule/points-table endpoint exists
// in the backend yet: src/api.js has nothing for it, and GET /public/matches
// (the one real content endpoint) returns no score fields and is currently
// empty on the live backend. These arrays stand in for that future API so
// the Fixtures & Schedule UI can be previewed end to end now — see the
// README in this directory for how add/edit/delete work against them.
//
// Every fixture/schedule row carries a `status` of "live", "upcoming", or
// (schedule only) "completed". "live" fixture cards additionally carry a
// score per team; the others don't. All of it is editable and deletable by
// the scorekeeper/admin identities — see FixturesPanel and ScheduleModal.

export const FIXTURES_DEMO = [
  {
    id: "demo-badminton-1",
    sport: "badminton",
    tournament: "Sangram",
    stage: "Men's Singles · Semifinal",
    venue: "Indoor Court 2",
    status: "live",
    teams: [
      { name: "Arjun Mehta", score: "21 · 18 · 11" },
      { name: "Rohan Iyer", score: "15 · 21 · 9" },
    ],
    note: "3rd game, 11–9",
  },
  {
    id: "demo-cricket-1",
    sport: "cricket",
    tournament: "Sangram",
    stage: "Group B · League match",
    venue: "Main Cricket Ground",
    status: "live",
    teams: [
      { name: "Section B", score: "142/6" },
      { name: "Section D", score: "Yet to bat" },
    ],
    note: "18.3 overs · Section B batting",
  },
  {
    id: "demo-football-1",
    sport: "football",
    tournament: "Sangram",
    stage: "Quarterfinal",
    venue: "Football Turf",
    status: "live",
    teams: [
      { name: "Section A", score: "2" },
      { name: "Section C", score: "1" },
    ],
    note: "72' · Second half",
  },
  {
    id: "demo-tabletennis-1",
    sport: "table tennis",
    tournament: "Sangram",
    stage: "Women's Doubles · Quarterfinal",
    venue: "Indoor Court 1",
    status: "upcoming",
    teams: [
      { name: "Priya & Kavya" },
      { name: "Meera & Sana" },
    ],
    note: "Tomorrow · 5:00 PM",
  },
  {
    id: "demo-basketball-1",
    sport: "basketball",
    tournament: "Sangram",
    stage: "Group A · League match",
    venue: "Basketball Court",
    status: "upcoming",
    teams: [
      { name: "Section E" },
      { name: "Section F" },
    ],
    note: "Thu · 6:30 PM",
  },
  {
    id: "demo-volleyball-1",
    sport: "volleyball",
    tournament: "Sangram",
    stage: "Group C · League match",
    venue: "Volleyball Court",
    status: "upcoming",
    teams: [
      { name: "Section G" },
      { name: "Section H" },
    ],
    note: "Fri · 4:00 PM",
  },
];

// The full tournament schedule (past results + today's live matches +
// upcoming), grouped by day, for ScheduleModal. Same caveat as above.
export const SCHEDULE_DEMO = [
  {
    day: "Yesterday",
    matches: [
      { id: "sch-1", time: "07:00 AM", sport: "badminton", stage: "Men's Singles · Quarterfinal", teams: "Arjun Mehta vs Karan Shah", venue: "Indoor Court 2", status: "completed", result: "Arjun Mehta won 21–15, 21–18" },
      { id: "sch-2", time: "05:00 PM", sport: "football", stage: "Round of 16", teams: "Section A vs Section B", venue: "Football Turf", status: "completed", result: "Section A won 3–1" },
    ],
  },
  {
    day: "Today",
    matches: [
      { id: "demo-badminton-1", time: "09:00 AM", sport: "badminton", stage: "Men's Singles · Semifinal", teams: "Arjun Mehta vs Rohan Iyer", venue: "Indoor Court 2", status: "live" },
      { id: "demo-cricket-1", time: "02:00 PM", sport: "cricket", stage: "Group B · League match", teams: "Section B vs Section D", venue: "Main Cricket Ground", status: "live" },
      { id: "demo-football-1", time: "06:00 PM", sport: "football", stage: "Quarterfinal", teams: "Section A vs Section C", venue: "Football Turf", status: "live" },
    ],
  },
  {
    day: "Tomorrow",
    matches: [
      { id: "demo-tabletennis-1", time: "05:00 PM", sport: "table tennis", stage: "Women's Doubles · Quarterfinal", teams: "Priya & Kavya vs Meera & Sana", venue: "Indoor Court 1", status: "upcoming" },
    ],
  },
  {
    day: "In 2 days",
    matches: [
      { id: "demo-basketball-1", time: "06:30 PM", sport: "basketball", stage: "Group A · League match", teams: "Section E vs Section F", venue: "Basketball Court", status: "upcoming" },
    ],
  },
  {
    day: "In 3 days",
    matches: [
      { id: "demo-volleyball-1", time: "04:00 PM", sport: "volleyball", stage: "Group C · League match", teams: "Section G vs Section H", venue: "Volleyball Court", status: "upcoming" },
    ],
  },
];

// The sports columns for PointsTableModal, in display order. `key` is what
// each row's `scores` object is keyed by; `label` is what the column header
// shows. Fixed and not user-editable — see PointsTableModal's README note on
// why adding/removing a sport is out of scope for this demo.
export const POINTS_SPORTS = [
  { key: "badminton", label: "Badminton" },
  { key: "cricket", label: "Cricket" },
  { key: "football", label: "Football" },
  { key: "tableTennis", label: "Table Tennis" },
  { key: "basketball", label: "Basketball" },
  { key: "volleyball", label: "Volleyball" },
];

// One row per section, Sangram A–I. `scores` holds a point value per sport
// in POINTS_SPORTS; the Total column PointsTableModal shows is always
// derived by summing these, never stored or edited directly.
export const POINTS_TABLE_DEMO = [
  { section: "Section A", scores: { badminton: 12, cricket: 8, football: 18, tableTennis: 6, basketball: 10, volleyball: 9 } },
  { section: "Section B", scores: { badminton: 9, cricket: 15, football: 7, tableTennis: 11, basketball: 8, volleyball: 12 } },
  { section: "Section C", scores: { badminton: 14, cricket: 6, football: 12, tableTennis: 9, basketball: 13, volleyball: 7 } },
  { section: "Section D", scores: { badminton: 7, cricket: 10, football: 9, tableTennis: 14, basketball: 6, volleyball: 15 } },
  { section: "Section E", scores: { badminton: 11, cricket: 9, football: 8, tableTennis: 7, basketball: 16, volleyball: 6 } },
  { section: "Section F", scores: { badminton: 6, cricket: 12, football: 10, tableTennis: 8, basketball: 9, volleyball: 11 } },
  { section: "Section G", scores: { badminton: 8, cricket: 7, football: 11, tableTennis: 13, basketball: 7, volleyball: 10 } },
  { section: "Section H", scores: { badminton: 10, cricket: 11, football: 6, tableTennis: 9, basketball: 8, volleyball: 8 } },
  { section: "Section I", scores: { badminton: 5, cricket: 8, football: 9, tableTennis: 6, basketball: 11, volleyball: 9 } },
];
