Drop the 5 Sangram 2025 photos in this folder, named:

```
1.jpg
2.jpg
3.jpg
4.jpg
5.jpg
```

(Any image format works — `.png`/`.webp` too, just update the paths in
`src/features/tournaments/demoData.js`'s `PAST_TOURNAMENTS_DEMO` entry for
`"Sangram 2025"` to match the actual filenames/extensions.)

Vite serves everything under `public/` as-is from the site root, so a file
at `public/tournaments/sangram-2025/1.jpg` is reachable at
`/tournaments/sangram-2025/1.jpg` — which is exactly what `demoData.js`
already points at. Once the 5 files are here, the "Photos" section on the
Sangram 2025 detail page (Fixtures & events → Tournaments → Past Tournaments
→ Sangram 2025) picks them up with no other change needed.

This file is harmless to leave in place — it's just documentation, not
referenced by the app.
