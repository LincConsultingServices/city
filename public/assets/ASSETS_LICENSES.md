# Asset & dependency licenses (mandatory, CI-relevant — PRD §14.1)

Every imported art/audio pack **and** runtime dependency must be logged here with
its source, author, license, and commercial-use proof **before** any work builds
on it. License verified before use.

## Art / audio packs

The city is a hybrid: procedural ground/roads/buildings (Pixi `Graphics`) plus
real CC0 sprite props from Kenney. One row per pack:

| Pack | Type | Source URL | Author | License | Commercial-use proof | Date added |
|---|---|---|---|---|---|---|
| Isometric Tiles City (`tree` prop used → `city/tree.png`) | 2D iso sprites | https://kenney.nl/assets/isometric-tiles-city | Kenney (kenney.nl) | CC0 1.0 | CC0 = public domain, commercial use unrestricted (stated on pack page + bundled License.txt) | 2026-07-22 |

Only the assets actually used are committed under `public/assets/city/`; the full
pack (128+ tiles) was downloaded, the license verified, and the unused files
removed to keep the repo lean. Re-download from the source URL to use more tiles.

## Runtime dependencies (all permissively licensed)

Pinned in `package.json`. Spot-checked licenses:

| Package | License |
|---|---|
| react, react-dom | MIT |
| vite, @vitejs/plugin-react | MIT |
| pixi.js | MIT |
| zustand | MIT |
| @tanstack/react-query | MIT |
| zod | MIT |
| tailwindcss | MIT |
| @radix-ui/* | MIT |
| framer-motion | MIT |
| howler | MIT |
| easystarjs | MIT |
| firebase (JS SDK) | Apache-2.0 |

Dev tooling (typescript, vitest, playwright, eslint, prettier, testing-library)
are MIT / Apache-2.0. Add a `license-checker` gate in CI when dependencies grow.
