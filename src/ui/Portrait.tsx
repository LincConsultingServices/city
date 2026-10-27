// A character's portrait — the art in the visual-novel conversation box.
//
// Drawn in code as a flat, cel-shaded half-body in the comic style the box
// calls for: a heavy ink outline, one hard shadow on the side away from the
// light, a highlight in the hair and the eyes. Every person is the same
// skeleton dressed from their design (ui/characters.ts): skin, hair and one of
// nine hairstyles, beard, eyes, glasses, earrings, hat, and one of ten outfits.
//
// The layers go back to front: hair that falls behind the head, the body and
// its clothes, the neck, the head, the face, the hair over the forehead, and
// last whatever sits on top — a hat, glasses, sunglasses pushed into the hair.
import type { CharacterLook } from "./characters";
import { artFor } from "./paintedArt";

export type { CharacterLook as PortraitLook } from "./characters";

const INK = "#24180f";
const LINE = 4;

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** Darken (k < 1) or lighten (k > 1) a 0xRRGGBB colour. */
function shade(n: number, k: number): string {
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) * k));
  const b = Math.min(255, Math.round((n & 0xff) * k));
  return hex((r << 16) | (g << 8) | b);
}

export function Portrait({
  look,
  artId,
  className = "",
  title,
}: {
  look: CharacterLook;
  /** The character's id in ui/characters.ts, to use their painted art when present. */
  artId?: string;
  className?: string;
  /** Spoken by assistive tech; omit when the name is already on screen. */
  title?: string;
}) {
  const art = artFor(artId);
  if (art) {
    // Full-body art, cropped from the top: the conversation box shows head to
    // waist, the same framing as the drawn stand-in.
    return (
      <img
        src={art}
        alt={title ?? ""}
        aria-hidden={title ? undefined : true}
        className={`aspect-[3/4] object-cover object-top ${className}`}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 300 400"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g strokeLinejoin="round" strokeLinecap="round">
        <BackHair look={look} />
        <Body look={look} />
        <Neck look={look} />
        <Head look={look} />
        <Face look={look} />
        <FrontHair look={look} />
        <Topping look={look} />
      </g>
    </svg>
  );
}

// ── Hair behind the head ─────────────────────────────────────────────────────

function BackHair({ look }: { look: CharacterLook }) {
  const fill = hex(look.hair);
  switch (look.hairStyle) {
    case "long":
      return (
        <path
          d="M88 140 C 78 210, 82 290, 100 330 L 200 330 C 218 290, 222 210, 212 140 C 200 100, 100 100, 88 140 Z"
          fill={fill}
          stroke={INK}
          strokeWidth={LINE}
        />
      );
    case "bob":
      return (
        <path
          d="M86 146 C 80 210, 92 252, 112 258 L 188 258 C 208 252, 220 210, 214 146 C 204 96, 96 96, 86 146 Z"
          fill={fill}
          stroke={INK}
          strokeWidth={LINE}
        />
      );
    case "ponytail":
      return (
        <path
          d="M196 116 C 240 128, 252 214, 222 274 C 226 226, 218 176, 194 150 Z"
          fill={fill}
          stroke={INK}
          strokeWidth={LINE}
        />
      );
    case "bun":
      return (
        <g>
          <circle cx="150" cy="62" r="28" fill={fill} stroke={INK} strokeWidth={LINE} />
          <path
            d="M132 56 Q 150 46 168 58"
            stroke={shade(look.hair, 1.6)}
            strokeWidth="3"
            fill="none"
          />
        </g>
      );
    default:
      return null;
  }
}

// ── Body and clothes ─────────────────────────────────────────────────────────

const TORSO = "M28 400 C 32 318, 72 282, 150 276 C 228 282, 268 318, 272 400 Z";
const TORSO_SHADE = "M150 276 C 228 282, 268 318, 272 400 L 200 400 C 200 344, 184 300, 150 276 Z";

function Body({ look }: { look: CharacterLook }) {
  const top = hex(look.top);
  const accent = hex(look.accent ?? look.top);
  const dark = shade(look.top, 0.72);

  return (
    <g>
      <path d={TORSO} fill={top} stroke={INK} strokeWidth={LINE} />
      <Clothes look={look} top={top} accent={accent} dark={dark} />
      {/* The cel shadow on the side away from the light, over all of it. */}
      <path d={TORSO_SHADE} fill="#000" opacity="0.13" />
      {look.tapeMeasure && (
        <g>
          <path
            d="M118 282 C 116 320, 112 356, 108 400"
            stroke="#e2be78"
            strokeWidth="9"
            fill="none"
          />
          <path
            d="M182 282 C 184 320, 188 356, 192 400"
            stroke="#e2be78"
            strokeWidth="9"
            fill="none"
          />
          {[300, 324, 348, 372].map((y) => (
            <g key={y}>
              <path d={`M110 ${y} l6 0`} stroke={INK} strokeWidth="1.5" />
              <path d={`M184 ${y} l6 0`} stroke={INK} strokeWidth="1.5" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

function Clothes({
  look,
  top,
  accent,
  dark,
}: {
  look: CharacterLook;
  top: string;
  accent: string;
  dark: string;
}) {
  switch (look.clothes) {
    case "uniform":
      return (
        <g>
          {/* White shirt collar, then the black bib apron and its straps. */}
          <path d="M122 280 L 150 306 L 130 316 Z" fill="#fff" stroke={INK} strokeWidth="3" />
          <path d="M178 280 L 150 306 L 170 316 Z" fill="#fff" stroke={INK} strokeWidth="3" />
          <path
            d="M100 330 L 200 330 L 210 400 L 90 400 Z"
            fill={accent}
            stroke={INK}
            strokeWidth={LINE}
          />
          <path d="M106 330 L 120 286" stroke={accent} strokeWidth="9" />
          <path d="M194 330 L 180 286" stroke={accent} strokeWidth="9" />
          {/* The apron's pocket, and a name badge on the shirt. */}
          <path
            d="M132 360 L 168 360 L 168 384 L 132 384"
            fill="none"
            stroke={shade(look.accent ?? 0, 2.4)}
            strokeWidth="2.5"
          />
          <rect
            x="196"
            y="300"
            width="28"
            height="12"
            rx="3"
            fill="#e2be78"
            stroke={INK}
            strokeWidth="2"
          />
        </g>
      );
    case "chef":
      return (
        <g>
          {/* A mandarin collar and two rows of buttons. */}
          <path
            d="M118 282 Q 150 296 182 282 L 182 292 Q 150 306 118 292 Z"
            fill="#fff"
            stroke={INK}
            strokeWidth="3"
          />
          <path d="M150 300 L 150 400" stroke={shade(0xf4f4f2, 0.75)} strokeWidth="3" />
          {[322, 350, 378].map((y) => (
            <g key={y}>
              <circle
                cx="132"
                cy={y}
                r="4.5"
                fill={shade(0xf4f4f2, 0.7)}
                stroke={INK}
                strokeWidth="1.5"
              />
              <circle
                cx="168"
                cy={y}
                r="4.5"
                fill={shade(0xf4f4f2, 0.7)}
                stroke={INK}
                strokeWidth="1.5"
              />
            </g>
          ))}
        </g>
      );
    case "suit":
    case "blazer": {
      const isSuit = look.clothes === "suit";
      return (
        <g>
          {/* The shirt or top in the opening, then the lapels over it. */}
          <path
            d="M124 280 L 176 280 L 150 372 Z"
            fill={isSuit ? "#f4f4f2" : accent}
            stroke={INK}
            strokeWidth="3"
          />
          {isSuit && (
            <g>
              <path
                d="M142 290 L 158 290 L 154 300 L 146 300 Z"
                fill={accent}
                stroke={INK}
                strokeWidth="2.5"
              />
              <path
                d="M146 300 L 154 300 L 160 352 L 150 366 L 140 352 Z"
                fill={accent}
                stroke={INK}
                strokeWidth="2.5"
              />
            </g>
          )}
          <path
            d="M124 280 L 98 300 L 116 316 L 108 330 L 148 378 Z"
            fill={dark}
            stroke={INK}
            strokeWidth="3"
          />
          <path
            d="M176 280 L 202 300 L 184 316 L 192 330 L 152 378 Z"
            fill={dark}
            stroke={INK}
            strokeWidth="3"
          />
          {isSuit && (
            <path
              d="M210 330 L 232 326 L 234 336 L 212 340 Z"
              fill="#f4f4f2"
              stroke={INK}
              strokeWidth="2"
            />
          )}
          <circle cx="150" cy="390" r="4" fill={dark} stroke={INK} strokeWidth="1.5" />
        </g>
      );
    }
    case "cardigan":
      return (
        <g>
          {/* The tee underneath, and the cardigan's open front with buttons. */}
          <path
            d="M120 282 Q 150 300 180 282 L 172 400 L 128 400 Z"
            fill={accent}
            stroke={INK}
            strokeWidth="3"
          />
          <path d="M128 400 L 120 282" stroke={INK} strokeWidth="3" />
          <path d="M172 400 L 180 282" stroke={INK} strokeWidth="3" />
          {[322, 352, 382].map((y) => (
            <circle key={y} cx="122" cy={y} r="4" fill={dark} stroke={INK} strokeWidth="1.5" />
          ))}
        </g>
      );
    case "bomber":
      return (
        <g>
          {/* Ribbed collar, the zip, and a patch on the chest. */}
          <path
            d="M112 286 Q 150 312 188 286 L 188 296 Q 150 322 112 296 Z"
            fill={accent}
            stroke={INK}
            strokeWidth="3"
          />
          <path d="M150 312 L 150 400" stroke={INK} strokeWidth="3" />
          <path d="M150 312 L 150 400" stroke="#d6d2c8" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="196" cy="336" r="11" fill={accent} stroke={INK} strokeWidth="2.5" />
          <path d="M191 336 L 196 341 L 202 331" stroke="#f3eadb" strokeWidth="2.5" fill="none" />
        </g>
      );
    case "hoodie":
      return (
        <g>
          {/* The hood bunched around the neck, and its two drawstrings. */}
          <path
            d="M92 290 C 108 262, 192 262, 208 290 C 190 312, 110 312, 92 290 Z"
            fill={accent}
            stroke={INK}
            strokeWidth="3"
          />
          <path d="M138 304 L 136 346" stroke="#f3eadb" strokeWidth="3" />
          <path d="M162 304 L 164 346" stroke="#f3eadb" strokeWidth="3" />
          <path d="M108 370 Q 150 384 192 370" stroke={dark} strokeWidth="3" fill="none" />
        </g>
      );
    case "coat":
      return (
        <g>
          {/* Big lapels, and a scarf wrapped once with its end hanging. */}
          <path
            d="M120 284 L 92 306 L 118 360 L 150 330 Z"
            fill={dark}
            stroke={INK}
            strokeWidth="3"
          />
          <path
            d="M180 284 L 208 306 L 182 360 L 150 330 Z"
            fill={dark}
            stroke={INK}
            strokeWidth="3"
          />
          <path
            d="M112 280 Q 150 306 188 280 L 190 298 Q 150 326 110 298 Z"
            fill={accent}
            stroke={INK}
            strokeWidth="3"
          />
          <path
            d="M160 310 L 176 312 L 170 380 L 154 378 Z"
            fill={accent}
            stroke={INK}
            strokeWidth="3"
          />
          <path d="M156 360 L 172 362" stroke={shade(look.accent ?? 0, 0.7)} strokeWidth="2" />
        </g>
      );
    case "shirt":
      return (
        <g>
          {/* An open collar, a placket of buttons, and a pocket. */}
          <path d="M120 280 L 150 312 L 128 322 Z" fill={top} stroke={INK} strokeWidth="3" />
          <path d="M180 280 L 150 312 L 172 322 Z" fill={top} stroke={INK} strokeWidth="3" />
          <path d="M150 312 L 150 400" stroke={dark} strokeWidth="3" />
          {[336, 362, 388].map((y) => (
            <circle key={y} cx="156" cy={y} r="3" fill={dark} />
          ))}
          <path
            d="M184 330 L 210 330 L 210 352 L 184 352"
            fill="none"
            stroke={dark}
            strokeWidth="2.5"
          />
        </g>
      );
    case "tee":
    default:
      return (
        <g>
          <path d="M120 282 Q 150 306 180 282" stroke={dark} strokeWidth="6" fill="none" />
          <path d="M70 330 Q 76 360 74 400" stroke={dark} strokeWidth="2.5" fill="none" />
          <path d="M230 330 Q 224 360 226 400" stroke={dark} strokeWidth="2.5" fill="none" />
        </g>
      );
  }
}

// ── Neck and head ────────────────────────────────────────────────────────────

const FACE =
  "M96 142 C 96 84, 204 84, 204 142 L 201 184 C 196 224, 174 248, 150 250 C 126 248, 104 224, 99 184 Z";

function Neck({ look }: { look: CharacterLook }) {
  const skin = hex(look.skin);
  return (
    <g>
      <path
        d="M128 226 L 128 282 Q 150 294 172 282 L 172 226 Z"
        fill={skin}
        stroke={INK}
        strokeWidth={LINE}
      />
      {/* The jaw's shadow on the neck. */}
      <path
        d="M128 232 Q 150 262 172 232 L 172 252 Q 150 270 128 252 Z"
        fill={shade(look.skin, 0.78)}
      />
    </g>
  );
}

function Head({ look }: { look: CharacterLook }) {
  const skin = hex(look.skin);
  const skinShade = shade(look.skin, 0.82);
  return (
    <g>
      <ellipse cx="97" cy="170" rx="11" ry="17" fill={skin} stroke={INK} strokeWidth={LINE} />
      <ellipse cx="203" cy="170" rx="11" ry="17" fill={skin} stroke={INK} strokeWidth={LINE} />
      <path d="M97 162 Q 92 170 97 178" stroke={skinShade} strokeWidth="3" fill="none" />
      <path d="M203 162 Q 208 170 203 178" stroke={skinShade} strokeWidth="3" fill="none" />
      <path d={FACE} fill={skin} stroke={INK} strokeWidth={LINE} />
      {/* One hard shadow down the far side of the face. */}
      <path
        d="M176 104 C 200 118, 206 152, 200 186 C 194 222, 176 242, 158 248 C 178 228, 186 198, 186 170 C 186 142, 182 122, 176 104 Z"
        fill={skinShade}
        opacity="0.7"
      />
      {look.earrings === "hoops" && (
        <g fill="none" stroke="#d4af37" strokeWidth="3">
          <circle cx="96" cy="196" r="7" />
          <circle cx="204" cy="196" r="7" />
        </g>
      )}
      {look.earrings === "studs" && (
        <g fill="#e8e4da" stroke={INK} strokeWidth="1.5">
          <circle cx="95" cy="186" r="3.5" />
          <circle cx="205" cy="186" r="3.5" />
        </g>
      )}
    </g>
  );
}

// ── The face ─────────────────────────────────────────────────────────────────

function Face({ look }: { look: CharacterLook }) {
  const iris = hex(look.eyes ?? 0x5a3a24);
  const brow = shade(look.hair, look.hair > 0xb00000 ? 0.6 : 0.8);
  const skinShade = shade(look.skin, 0.72);
  const expression = look.expression ?? "smile";

  return (
    <g>
      {look.beard && <Beard look={look} />}

      {/* Brows: level when calm, lifted when grinning. */}
      <path
        d={expression === "grin" ? "M110 144 Q 126 132 140 142" : "M110 146 Q 126 138 140 146"}
        stroke={brow}
        strokeWidth="6"
        fill="none"
      />
      <path
        d={expression === "grin" ? "M160 142 Q 174 132 190 144" : "M160 146 Q 174 138 190 146"}
        stroke={brow}
        strokeWidth="6"
        fill="none"
      />

      {/* Eyes: white, iris, pupil, a catch-light, and a heavy upper lash line. */}
      {[126, 174].map((cx) => (
        <g key={cx}>
          <path
            d={`M${cx - 13} 172 Q ${cx} 158 ${cx + 13} 172 Q ${cx} 182 ${cx - 13} 172 Z`}
            fill="#fbf8f2"
          />
          <circle cx={cx} cy="171" r="7.5" fill={iris} />
          <circle cx={cx} cy="171" r="3.6" fill={INK} />
          <circle cx={cx + 2.5} cy="167.5" r="2.4" fill="#fff" />
          <path
            d={`M${cx - 14} 171 Q ${cx} 156 ${cx + 14} 170`}
            stroke={INK}
            strokeWidth="4"
            fill="none"
          />
          <path
            d={`M${cx - 9} 179 Q ${cx} 182 ${cx + 9} 179`}
            stroke={INK}
            strokeWidth="1.5"
            fill="none"
            opacity="0.6"
          />
        </g>
      ))}

      {/* The nose: a shadow line and a highlight. */}
      <path d="M152 178 Q 146 196 154 200" stroke={skinShade} strokeWidth="3.5" fill="none" />
      <circle cx="147" cy="188" r="2.2" fill="#fff" opacity="0.35" />

      {/* The mouth, by expression. */}
      {expression === "grin" ? (
        <g>
          <path
            d="M132 214 Q 150 236 168 214 Q 150 220 132 214 Z"
            fill="#7a2f2f"
            stroke={INK}
            strokeWidth="3"
          />
          <path d="M136 216 Q 150 221 164 216 L 162 220 Q 150 224 138 220 Z" fill="#fff" />
        </g>
      ) : expression === "calm" ? (
        <path d="M138 218 Q 150 222 162 218" stroke={INK} strokeWidth="3.5" fill="none" />
      ) : (
        <path d="M134 214 Q 150 228 166 214" stroke={INK} strokeWidth="3.5" fill="none" />
      )}

      {/* Age, from fifty: lines at the corners of the eyes, across the brow,
          and from the nose to the mouth. */}
      {(look.age ?? 0) >= 50 && (
        <g stroke={skinShade} strokeWidth="2.2" fill="none" opacity="0.8">
          <path d="M108 166 l-7 -3 M108 172 l-8 1 M192 166 l7 -3 M192 172 l8 1" />
          <path d="M128 128 Q 150 122 172 128 M134 120 Q 150 116 166 120" />
          <path d="M134 198 Q 128 210 132 220 M166 198 Q 172 210 168 220" />
        </g>
      )}

      {/* Colour in the cheeks, and freckles across the nose. */}
      <ellipse cx="114" cy="198" rx="11" ry="6" fill="#e0607a" opacity="0.2" />
      <ellipse cx="186" cy="198" rx="11" ry="6" fill="#e0607a" opacity="0.2" />
      {look.freckles && (
        <g fill={shade(look.skin, 0.62)}>
          {[
            [128, 192],
            [134, 196],
            [122, 196],
            [166, 192],
            [172, 196],
            [178, 192],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />
          ))}
        </g>
      )}
    </g>
  );
}

function Beard({ look }: { look: CharacterLook }) {
  const fill = hex(look.hair);
  const jaw =
    "M99 182 C 102 228, 124 264, 150 266 C 176 264, 198 228, 201 182 C 190 208, 176 220, 150 220 C 124 220, 110 208, 99 182 Z";
  const moustache = "M130 208 Q 150 198 170 208 Q 162 214 150 210 Q 138 214 130 208 Z";
  if (look.beard === "stubble") {
    return <path d={jaw} fill={fill} opacity="0.28" />;
  }
  if (look.beard === "goatee") {
    return (
      <g>
        <path
          d="M134 220 Q 150 252 166 220 Q 150 228 134 220 Z"
          fill={fill}
          stroke={INK}
          strokeWidth="3"
        />
        <path d={moustache} fill={fill} stroke={INK} strokeWidth="2.5" />
      </g>
    );
  }
  return (
    <g>
      <path d={jaw} fill={fill} stroke={INK} strokeWidth="3.5" />
      <path d={moustache} fill={fill} stroke={INK} strokeWidth="2.5" />
    </g>
  );
}

// ── Hair over the forehead ───────────────────────────────────────────────────

function FrontHair({ look }: { look: CharacterLook }) {
  const fill = hex(look.hair);
  const shine = shade(look.hair, look.hair > 0xb00000 ? 1.15 : 1.9);
  const common = { fill, stroke: INK, strokeWidth: LINE };

  switch (look.hairStyle) {
    case "short":
      return (
        <g>
          <path
            d="M94 150 C 86 92, 120 64, 154 64 C 192 64, 216 94, 206 152 C 200 122, 188 108, 172 102 C 150 116, 116 116, 100 114 C 96 126, 95 138, 94 150 Z"
            {...common}
          />
          <path d="M100 114 C 122 90, 162 82, 198 104 C 176 104, 150 112, 122 132 Z" {...common} />
          <path d="M126 94 Q 150 84 176 90" stroke={shine} strokeWidth="4" fill="none" />
        </g>
      );
    case "swept":
      return (
        <g>
          <path
            d="M94 146 C 88 86, 124 60, 156 62 C 194 64, 216 92, 206 146 C 202 118, 192 102, 176 96 C 148 92, 118 100, 100 118 C 96 128, 95 136, 94 146 Z"
            {...common}
          />
          <path d="M120 98 C 140 78, 178 76, 200 100 C 178 92, 150 92, 120 98 Z" fill={fill} />
          <path d="M120 84 Q 156 70 190 86" stroke={shine} strokeWidth="4" fill="none" />
          <path
            d="M134 74 Q 128 86 126 96"
            stroke={INK}
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
        </g>
      );
    case "buzz":
      return (
        <g>
          <path
            d="M96 138 C 96 84, 204 84, 204 138 C 192 110, 108 110, 96 138 Z"
            fill={fill}
            stroke={INK}
            strokeWidth="3"
          />
          <path d="M96 138 C 96 84, 204 84, 204 138" fill="none" stroke={INK} strokeWidth={LINE} />
        </g>
      );
    case "curly":
      return (
        <g>
          {[
            [100, 128, 18],
            [110, 100, 20],
            [132, 80, 22],
            [160, 76, 22],
            [186, 90, 21],
            [202, 116, 19],
            [146, 96, 18],
          ].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} {...common} />
          ))}
          {[
            [126, 112],
            [160, 108],
            [186, 120],
          ].map(([cx, cy]) => (
            <path
              key={`${cx}`}
              d={`M${cx - 6} ${cy} q 6 -8 12 0`}
              stroke={shine}
              strokeWidth="3"
              fill="none"
            />
          ))}
        </g>
      );
    case "bun":
    case "ponytail":
      return (
        <g>
          {/* Pulled back: a smooth cap with the parting showing, and loose
              strands at the temples. */}
          <path
            d="M94 148 C 88 88, 122 66, 154 66 C 190 66, 214 90, 206 148 C 202 116, 186 100, 150 98 C 116 100, 98 116, 94 148 Z"
            {...common}
          />
          <path
            d="M150 70 Q 146 84 150 98"
            stroke={INK}
            strokeWidth="2"
            fill="none"
            opacity="0.5"
          />
          <path d="M98 140 Q 92 166 100 186" stroke={fill} strokeWidth="5" fill="none" />
          <path d="M202 140 Q 208 166 200 186" stroke={fill} strokeWidth="5" fill="none" />
          <path d="M120 80 Q 140 72 160 74" stroke={shine} strokeWidth="4" fill="none" />
        </g>
      );
    case "long":
      return (
        <g>
          <path
            d="M94 150 C 92 86, 208 86, 206 150 C 196 112, 170 98, 150 108 C 130 98, 104 112, 94 150 Z"
            {...common}
          />
          <path d="M118 96 Q 134 88 148 96" stroke={shine} strokeWidth="4" fill="none" />
        </g>
      );
    case "bob":
      return (
        <g>
          {/* A straight fringe cut just above the brows. */}
          <path
            d="M94 150 C 92 84, 208 84, 206 150 C 206 136, 202 126, 196 124 L 104 124 C 98 126, 94 136, 94 150 Z"
            {...common}
          />
          <path d="M120 98 Q 150 86 180 98" stroke={shine} strokeWidth="4" fill="none" />
          <path
            d="M130 106 L 128 124 M150 104 L 150 124 M170 106 L 172 124"
            stroke={INK}
            strokeWidth="1.5"
            opacity="0.4"
          />
        </g>
      );
    case "receding":
      return (
        <g>
          <path d="M96 156 C 92 126, 98 106, 112 98 L 116 140 Z" {...common} />
          <path d="M204 156 C 208 126, 202 106, 188 98 L 184 140 Z" {...common} />
          <path
            d="M118 96 Q 150 84 182 96"
            stroke={fill}
            strokeWidth="5"
            fill="none"
            opacity="0.7"
          />
        </g>
      );
  }
}

// ── On top ───────────────────────────────────────────────────────────────────

function Topping({ look }: { look: CharacterLook }) {
  return (
    <g>
      {look.hat === "toque" && (
        <g>
          <path
            d="M104 106 C 86 72, 110 40, 134 52 C 140 26, 172 26, 176 52 C 200 40, 216 72, 196 106 Z"
            fill="#f6f6f4"
            stroke={INK}
            strokeWidth={LINE}
          />
          <rect
            x="100"
            y="98"
            width="100"
            height="20"
            rx="6"
            fill="#f6f6f4"
            stroke={INK}
            strokeWidth={LINE}
          />
          <path
            d="M140 60 Q 144 80 140 98 M164 58 Q 162 80 166 98"
            stroke={shade(0xf6f6f4, 0.8)}
            strokeWidth="2.5"
            fill="none"
          />
        </g>
      )}
      {look.hat === "cap" && (
        <g>
          <path
            d="M94 124 C 94 66, 206 66, 206 124 Z"
            fill={hex(look.hatColor ?? 0x333333)}
            stroke={INK}
            strokeWidth={LINE}
          />
          <path
            d="M94 120 Q 50 122 58 136 Q 100 132 150 126 Z"
            fill={shade(look.hatColor ?? 0x333333, 0.75)}
            stroke={INK}
            strokeWidth={LINE}
          />
          <circle
            cx="150"
            cy="70"
            r="4"
            fill={shade(look.hatColor ?? 0x333333, 0.75)}
            stroke={INK}
            strokeWidth="2"
          />
        </g>
      )}

      {look.sunglasses && (
        <g>
          {/* Pushed up into the hair, not worn. */}
          <rect
            x="108"
            y="88"
            width="34"
            height="18"
            rx="8"
            fill="#1b1d22"
            stroke={INK}
            strokeWidth="3"
          />
          <rect
            x="158"
            y="88"
            width="34"
            height="18"
            rx="8"
            fill="#1b1d22"
            stroke={INK}
            strokeWidth="3"
          />
          <path d="M142 96 L 158 96" stroke={INK} strokeWidth="3" />
          <path d="M114 92 l8 0" stroke="#fff" strokeWidth="2" opacity="0.5" />
        </g>
      )}

      {look.glasses !== undefined &&
        (look.glassesUp ? (
          <g fill="none" stroke={hex(look.glasses)} strokeWidth="3.5">
            <rect x="112" y="96" width="30" height="18" rx="7" />
            <rect x="158" y="96" width="30" height="18" rx="7" />
            <path d="M142 104 L 158 104" />
          </g>
        ) : (
          <g fill="none" stroke={hex(look.glasses)} strokeWidth="4">
            <rect x="106" y="158" width="40" height="28" rx="10" fill="#fff" fillOpacity="0.08" />
            <rect x="154" y="158" width="40" height="28" rx="10" fill="#fff" fillOpacity="0.08" />
            <path d="M146 168 Q 150 164 154 168" />
            <path d="M106 166 L 96 162 M194 166 L 204 162" />
          </g>
        ))}
    </g>
  );
}
