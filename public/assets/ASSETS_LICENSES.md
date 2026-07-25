# Asset licenses (PRD §14 — mandatory log)

Every asset pack used by The City is logged here **before** work builds on it.
All sprites under `public/assets/city/` are a **curated, renamed subset** of the
packs below (full packs are not committed).

| Pack | Source URL | Author | License | Downloaded | Used for |
|---|---|---|---|---|---|
| Isometric Tiles Buildings | https://kenney.nl/assets/isometric-tiles-buildings | Kenney (kenney.nl) | CC0 1.0 | 2026-07-23, expanded 2026-07-25 | venue/filler building pieces (`g_*`, `f_*`, `r_*`) |
| Isometric Tiles City | https://kenney.nl/assets/isometric-tiles-city | Kenney (kenney.nl) | CC0 1.0 | 2026-07-23, expanded 2026-07-25 | streets, plaza/pavement/parking tiles, lamps, benches, barriers, fountain (`ground_*`, `road_*`, `prop_*`) |
| Isometric Roads | https://kenney.nl/assets/isometric-roads | Kenney (kenney.nl) | CC0 1.0 | 2026-07-23 | standalone trees (`tree_*`, `conifer_*`) |
| Isometric Tiles Landscape | https://kenney.nl/assets/isometric-tiles-landscape | Kenney (kenney.nl) | CC0 1.0 | 2026-07-23, expanded 2026-07-25 | grass/dirt ground (`ground_grass*`, `ground_dirt*`) |
| Isometric Tiles Vehicles | https://kenney.nl/assets/isometric-tiles-vehicles | Kenney (kenney.nl) | CC0 1.0 | 2026-07-23, expanded 2026-07-25 | ambient traffic (`car_*`) and parked cars (`parked_*`) |

**License:** all five packs are Creative Commons CC0 1.0 Universal — free for
personal and commercial use, no permission or attribution required. Attribution
is given anyway, and in-game on the founders' plaque: thanks, Kenney!

## Provenance of the 2026-07-25 expansion

kenney.nl is not reachable from the build sandbox, so the expansion sprites were
taken from **[ETdoFresh/kenney.nl](https://github.com/ETdoFresh/kenney.nl)** — a
public GitHub mirror of Kenney's asset zips, extracted and re-published under the
same CC0 1.0 terms (its README reproduces the licence verbatim).

The mirror was verified as a faithful copy before use: **69 of the 72 sprites
already in this repo matched a mirror file byte-for-byte (MD5)**, and the
remaining 3 (`tree_tall`, `tree_short`, `conifer_tall`) matched the mirror's
roads pack. Same bytes, same packs, same licence — the mirror is only a transport
for assets this project already shipped.

Vehicle note: the named vehicle folders (Taxi/Police/Ambulance/Garbage) carry
explicit `_N/_E/_S/_W` suffixes, so moving traffic uses only those — their facing
is certain. The civilian cars are numbered rather than named, and automated
attempts to infer their compass directions proved unreliable (silhouettes of N/S
and E/W are near-identical), so they ship **only as parked cars**, where
orientation carries no meaning.

Rule going forward: no asset merges without an entry here (CI-checked at F3).
