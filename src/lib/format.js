// Tiny text-formatting helpers shared by the app shell and feature modules.
// Same spirit as lib/slots.js: plain ESM, no React, so anything can import it
// without pulling in a component tree.

export const titleCase = (value = "") =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

// "12 Sep 2026" — used for dates that have no time component (unlike
// App.jsx's own formatDate, which always shows a time).
export const formatDay = (value) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
