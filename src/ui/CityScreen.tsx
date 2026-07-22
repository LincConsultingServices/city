// CityScreen — the "in the city" composition: the Pixi world canvas, the
// world-anchored prompt, and the HUD. All DOM UI sits above the single canvas.

import { CityCanvas } from '@/world/CityCanvas';
import { WorldPrompt } from '@/ui/venue/WorldPrompt';
import { Hud } from '@/ui/hud/Hud';

export function CityScreen() {
  return (
    <div className="relative h-full w-full">
      <CityCanvas />
      <WorldPrompt />
      <Hud />
    </div>
  );
}
