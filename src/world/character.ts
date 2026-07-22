// Gray-box character (PRD §14.3 — the layered sprite composition lands in the
// art pass). F0 draws a simple shadow + body + head so movement, camera-follow,
// and y-sorting are all demonstrable without assets.

import { Container, Graphics } from 'pixi.js';

const BODY = 0xf2c14e; // accent gold — reads clearly on the gray city
const OUTLINE = 0x40424d;

export function createCharacter(): Container {
  const c = new Container();

  // Ground shadow (at the feet = container origin).
  const shadow = new Graphics();
  shadow.ellipse(0, 0, 18, 9).fill({ color: 0x000000, alpha: 0.22 });
  c.addChild(shadow);

  // Body.
  const body = new Graphics();
  body
    .roundRect(-11, -46, 22, 40, 8)
    .fill({ color: BODY })
    .stroke({ width: 2, color: OUTLINE, alpha: 0.85 });
  c.addChild(body);

  // Head.
  const head = new Graphics();
  head
    .circle(0, -54, 10)
    .fill({ color: 0xf6d78a })
    .stroke({ width: 2, color: OUTLINE, alpha: 0.85 });
  c.addChild(head);

  return c;
}
