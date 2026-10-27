// Every character on one page, for checking the designs side by side and for
// handing to whoever paints the real art. Dev builds only, at `?characters`.
//
// Each card shows the painted art when assets/characters has it, and the drawn
// stand-in otherwise, so the page doubles as a checklist of what is still to do.
import { Portrait } from "./Portrait";
import { hasArt } from "./paintedArt";
import {
  CAFE_CAST,
  CAFE_CREW,
  MAISON_CAST,
  PLAYER,
  PLAYER_OUTFITS,
  type CharacterDesign,
} from "./characters";

const GROUPS: readonly [string, Readonly<Record<string, CharacterDesign>>][] = [
  [
    "The player",
    {
      player: PLAYER,
      player_uniform: PLAYER_OUTFITS.uniform,
      player_professional: PLAYER_OUTFITS.professional,
    },
  ],
  ["The Café", CAFE_CAST],
  ["The Café's crew", CAFE_CREW],
  ["MAISON", MAISON_CAST],
];

export function CharacterGallery() {
  return (
    <main className="min-h-screen bg-ink px-4 py-8 text-text sm:px-8">
      <h1 className="font-display text-3xl font-semibold text-gold">Characters</h1>
      <p className="mt-1 text-sm text-muted">
        Drawn stand-ins until painted art is dropped into src/assets/characters as &lt;id&gt;.png.
      </p>
      {GROUPS.map(([title, designs]) => (
        <section key={title} className="mt-8">
          <h2 className="text-lg font-semibold">{title}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {Object.entries(designs).map(([id, d]) => (
              <li key={id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <Portrait look={d.look} artId={id} className="mx-auto h-56 w-auto" />
                <p className="mt-2 font-semibold">{d.name}</p>
                <p className="text-xs text-muted">
                  {d.role}
                  {d.look.age !== undefined && ` · ${d.look.age}`}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {id} {hasArt(id) ? "· painted" : "· stand-in"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
