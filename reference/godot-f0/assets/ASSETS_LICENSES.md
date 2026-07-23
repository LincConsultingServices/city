# Asset Licenses — MANDATORY, CI-checked (PRD §14.1)

**No asset merges without an entry here.** Every imported pack must log its
source URL, author, license, commercial-use proof, and date — and its license
must be verified **before** any work builds on it. This is a paid product: many
"free" itch.io packs are non-commercial and are disqualified.

Rules (PRD §14.1):
- Free **with explicit commercial license only**. CC0 preferred (Kenney.nl first).
- Verify the license page yourself; screenshot/quote the commercial-use grant.
- One base style, chosen at F0, that everything conforms to (PRD §14.2).

## Log

| Pack / asset | Source URL | Author | License | Commercial-use proof | Imported by | Date |
|---|---|---|---|---|---|---|
| _(none yet — F0 renders gray-box primitives; no third-party art imported)_ | | | | | | |

## F0 decision (pending license audit — Open Decisions, PRD §20)

- **Working base pack:** Kenney "Isometric" city/roads/vehicles/characters sets
  (kenney.nl), CC0. Chosen as the F0 default for stylistic consistency and a
  clean commercial license. **Action before any art builds on it:** paste the
  CC0 grant quote + a dated screenshot reference into the table above, then flip
  this from "working default" to a logged row.
- Everything that joins later is rescaled to one tile size (256×128) and passed
  through a palette-normalization step so mixed sources read as one city
  (PRD §14.2). See `docs/STYLE_SHEET.md`.
