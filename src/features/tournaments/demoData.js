// DEMO DATA — see README.md. No tournament-management endpoint exists in the
// backend yet: GET /public/tournaments (the one real endpoint) returns
// {id, name, status} for tournaments currently on campus, with no concept of
// a future date or a browsable history of past ones. These two arrays stand
// in for that so the "Tournaments" section can be previewed end to end now.
export const UPCOMING_TOURNAMENTS_DEMO = [
  { id: "up-1", name: "Sangram", date: "2026-09-12", note: "Flagship inter-section tournament" },
  { id: "up-2", name: "Mahasangram", date: "2026-10-24", note: "Postgraduate championship" },
  { id: "up-3", name: "Hell's League", date: "2026-11-08", note: "Late-night 5-a-side football" },
];

// One entry per past tournament. `blurb` is the one-line subtitle under the
// name in the gallery card; `description` is the longer paragraph on that
// tournament's own detail page, along with `date`/`venue` and `sports`
// (which sports it covered — driving the small "Moments" strip on the
// detail page). Cover color in both the gallery and the detail page cycles
// through a fixed set by position (see TournamentGallery/TournamentDetail)
// rather than being stored per row — there's no real image to pick a color
// to match, so there's nothing meaningful to store here for that.
//
// `photos` (optional) is a list of `{id, url}` — real image paths, shown as
// an actual photo grid on that tournament's detail page — see
// TournamentDetail's "Photos" section. Unlike everything else here, these
// are genuine static assets, not a fake gradient placeholder: drop the
// files under `public/tournaments/<slug>/` (served at
// `/tournaments/<slug>/…` — see the README in `public/tournaments/`) and
// list their paths here. A tournament with no `photos` (or an empty array)
// just doesn't render that section. `{id, url}`, not a bare string, so this
// shape matches a real gallery record from the backend exactly — the id is
// what a real remove-photo click deletes; for these demo ones it's never
// looked up anywhere, so any unique string does.
export const PAST_TOURNAMENTS_DEMO = [
  {
    id: "past-1",
    name: "Sangram 2025",
    blurb: "Last-over drama under the lights",
    date: "2025-09-14",
    venue: "Sports Complex",
    description: "Sangram 2025 brought the whole campus out for four days of cricket, football, and badminton, capped by a last-over cricket final that went down to the wire.",
    sports: ["cricket", "football", "badminton"],
    photos: [
      { id: "demo-photo-1", url: "/tournaments/sangram-2025/1.jpeg" },
      { id: "demo-photo-2", url: "/tournaments/sangram-2025/2.jpeg" },
      { id: "demo-photo-3", url: "/tournaments/sangram-2025/3.jpeg" },
      { id: "demo-photo-4", url: "/tournaments/sangram-2025/4.jpeg" },
      { id: "demo-photo-5", url: "/tournaments/sangram-2025/5.jpeg" },
    ],
  },
  {
    id: "past-2",
    name: "Sangram 2024",
    blurb: "PGP-1 United's unbeaten run",
    date: "2024-09-08",
    venue: "Sports Complex",
    description: "PGP-1 United went unbeaten through the group stage and the knockouts alike, anchoring Sangram 2024's football competition from start to finish.",
    sports: ["football", "cricket", "volleyball"],
  },
  {
    id: "past-3",
    name: "Mahasangram 2024",
    blurb: "Smash Championship semi-final",
    date: "2024-10-19",
    venue: "Indoor Courts",
    description: "The postgraduate championship's badminton draw came down to a three-set Smash Championship semi-final that had the indoor courts packed past capacity.",
    sports: ["badminton", "table tennis", "basketball"],
  },
  {
    id: "past-4",
    name: "Hell's League 2024",
    blurb: "Midnight knockout football",
    date: "2024-11-30",
    venue: "Football Turf",
    description: "A midnight knockout football league that lived up to its name — floodlit five-a-side matches running well past 1 AM across three straight weekends.",
    sports: ["football"],
  },
  {
    id: "past-5",
    name: "Varchasva 2024",
    blurb: "Hostel league tip-off",
    date: "2024-08-22",
    venue: "Basketball Court",
    description: "The hostel league's basketball tip-off kicked off Varchasva 2024, with every hostel fielding a team across a full round-robin season.",
    sports: ["basketball", "volleyball"],
  },
  {
    id: "past-6",
    name: "Sangharsh 2024",
    blurb: "Campus track & field",
    date: "2024-07-15",
    venue: "Campus Track",
    description: "Sangharsh 2024 turned the campus track into the main stage for a full day of athletics — sprints, relays, and distance events back to back.",
    sports: ["athletics"],
  },
];
