# Asset licenses (PRD §14 — mandatory log)

Every asset pack used by The City is logged here **before** work builds on it.
All sprites under `public/assets/city/` are a **curated, renamed subset** of the
packs below (full packs are not committed). License verified on each pack's page
("Creative Commons CC0" shown on kenney.nl) at download time.

| Pack | Source URL | Author | License | Downloaded | Used for |
|---|---|---|---|---|---|
| Isometric Tiles Buildings | https://kenney.nl/assets/isometric-tiles-buildings | Kenney (kenney.nl) | CC0 1.0 | 2026-07-23 | venue/filler building pieces (`g_*`, `f_*`, `r_*`) |
| Isometric Tiles City | https://kenney.nl/assets/isometric-tiles-city | Kenney (kenney.nl) | CC0 1.0 | 2026-07-23 | streets, plaza/pavement tiles, lamps, fountain (`ground_*`, `road_*`, `prop_lamp*`, `prop_billboard`, `prop_tree`) |
| Isometric Roads | https://kenney.nl/assets/isometric-roads | Kenney (kenney.nl) | CC0 1.0 | 2026-07-23 | standalone trees (`tree_*`, `conifer_*`) |
| Isometric Tiles Landscape | https://kenney.nl/assets/isometric-tiles-landscape | Kenney (kenney.nl) | CC0 1.0 | 2026-07-23 | grass/dirt ground (`ground_grass*`, `ground_dirt`) |
| Isometric Tiles Vehicles | https://kenney.nl/assets/isometric-tiles-vehicles | Kenney (kenney.nl) | CC0 1.0 | 2026-07-23 | ambient vehicles (`car_*`) |
| Isometric Miniature Library | https://kenney.nl/assets/isometric-miniature-library | Kenney (kenney.nl) | CC0 1.0 | 2026-07-24 | Café interior furniture, cropped to bbox and renamed under `public/assets/cafe/` (`cafe_counter`, `cafe_shelf`, `cafe_table`, `cafe_chair`, `cafe_lamp`, `cafe_rug`) — no dedicated café/restaurant pack exists in Kenney's isometric series, so this is a kitbash per PRD §14.2 (wood-toned library furniture reads as café furniture without recoloring) |

Proof of license: each asset page displays "Creative Commons CC0" (verified
2026-07-23; CC0 = no attribution required — credited anyway: thanks, Kenney!).

Rule going forward: no asset merges without an entry here (CI-checked at F3).
