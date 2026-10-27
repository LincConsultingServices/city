# Character art

Drop each character's painted art here as `<id>.png` (or `.webp`). The game
picks it up at build time and shows it in place of the drawn stand-in — no
code change needed. Ids are the keys in `src/ui/characters.ts`: `player`,
`player_uniform`, `player_professional`, `priya`, `owen`, `tomas`, `marcus`, `nadia`, `ray`, `ellery`, `crew_till`,
`crew_kitchen`, `elise`, `kobby`, `vera`, `ines`, `helene`, `dov`, `rio`.

What each image should be — size, framing, pose, and every character's brief —
is in [docs/CHARACTER_ART_BRIEF.md](../../../../docs/CHARACTER_ART_BRIEF.md) at the
repo root. Open the dev server at `/?characters` to see everyone at once.
