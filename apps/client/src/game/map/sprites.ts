// 8x8 pixel sprites, drawn at 2x onto 16px tiles (task P2-C1). Ported from the grid-dungeon
// prototype (prototypes/dungeon-puzzle/src/client/sprites.ts), keeping only what the MVP map
// shows: the player and one sprite per site type. Each sprite is 8 rows separated by '/', one
// character per pixel; '.' is transparent and every other character is a palette key.
import type { MapNode } from '@daily-delve/shared';

const PAL: Record<string, string> = {
  k: '#15121c',
  w: '#ffffff',
  h: '#e8c170',
  c: '#3d6bb8',
  d: '#243a6b',
  g: '#5ac54f',
  G: '#2f8a3a',
  s: '#b8c0d0',
  S: '#6a7288',
  r: '#e04a2a',
  y: '#ffe060',
  Y: '#c89a20',
  v: '#7a4ab8',
  i: '#9fe8ff',
  I: '#4aa0d0',
};

export type SpriteName = 'player' | MapNode['type'];

const ART: Record<SpriteName, string> = {
  player: '..cccc../.cccccc./.chhhhc./.chkhkc./..hhhh../.cccccc./.cdccdc./..d..d..',
  // A slime for an ordinary fight.
  fight: '......../......../..gggg../.gggggg./gwkggwkg/gggggggg/GggggggG/.GGGGGG.',
  // A crested knight for an elite.
  elite: '...r..../..ssss../.sskkss./.ssssss./SssssssS/.sSSSSs./.ss..ss./.SS..SS.',
  // A glowing font for a shrine.
  shrine: '...ii.../..iwwi../...ii.../.YyyyyY./..YyyY../...Yy.../..YyyY../.YYYYYY.',
  // The crowned warden for the boss.
  boss: '.y.yy.y./.yyyyyy./.vkvvkv./.vvvvvv./vvvyyvvv/.vvvvvv./.vv..vv./.kk..kk.',
};

/** The pixels of a sprite as [x, y, color] squares on a 16px tile. */
export function spritePixels(name: SpriteName): [number, number, string][] {
  const pixels: [number, number, string][] = [];
  ART[name].split('/').forEach((row, y) => {
    for (let x = 0; x < 8; x++) {
      const key = row[x];
      if (key === undefined || key === '.') continue;
      pixels.push([x * 2, y * 2, PAL[key] ?? '#ff00ff']);
    }
  });
  return pixels;
}

/** Draws a sprite with its top-left corner at (x, y). */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: SpriteName,
  x: number,
  y: number,
): void {
  for (const [dx, dy, color] of spritePixels(name)) {
    ctx.fillStyle = color;
    ctx.fillRect(x + dx, y + dy, 2, 2);
  }
}
