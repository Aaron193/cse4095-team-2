// Draws the dungeon of a RunState onto a canvas (task P2-C1). Pure presentation: it reads the
// state and never changes it. The tile drawing is ported from the grid-dungeon prototype
// (prototypes/dungeon-puzzle/src/client/render.ts), cut down to the five R4 tile kinds:
// '#' wall, '.' floor, 'B' brambles (Fire), '~' water (Frost), 'R' bars (Poison).
import type { Dungeon, MapNode, RunState } from '@daily-delve/shared';
import { drawSprite } from './sprites.ts';

/** What the renderer reads from a run: enough to draw a dungeon before a run starts, too. */
export type MapView = Pick<RunState, 'dungeon' | 'pos' | 'cleared' | 'openedGates'>;

/** A dungeon as it looks at the start of a run, for the Today screen's preview. */
export function startView(dungeon: Dungeon): MapView {
  return { dungeon, pos: { ...dungeon.start }, cleared: [], openedGates: [] };
}

/** One tile is 16 by 16 canvas pixels. */
export const TILE = 16;

export type TileKind = 'wall' | 'floor' | 'brambles' | 'water' | 'bars';

const KINDS: Record<string, TileKind> = {
  '#': 'wall',
  '.': 'floor',
  B: 'brambles',
  '~': 'water',
  R: 'bars',
};

/**
 * What the tile at (x, y) is now. Off the grid is wall, and an opened gate is floor for the
 * rest of the run (`openedGates` holds tile indexes, y * width + x).
 */
export function tileKind(state: MapView, x: number, y: number): TileKind {
  const { dungeon } = state;
  if (x < 0 || y < 0 || x >= dungeon.width || y >= dungeon.height) return 'wall';
  const kind = KINDS[dungeon.tiles[y]?.[x] ?? '#'] ?? 'wall';
  if (kind !== 'wall' && kind !== 'floor' && state.openedGates.includes(y * dungeon.width + x)) {
    return 'floor';
  }
  return kind;
}

/** The site on (x, y), if any. */
export function siteAt(state: MapView, x: number, y: number): MapNode | undefined {
  return state.dungeon.nodes.find((node) => node.x === x && node.y === y);
}

/** A fixed per-tile number, so the floor speckles look the same on every draw. */
const speckle = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

function drawTile(ctx: CanvasRenderingContext2D, state: MapView, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  const h = speckle(tx, ty);
  const r = (dx: number, dy: number, w: number, hh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + dx, y + dy, w, hh);
  };
  const floor = () => {
    r(0, 0, 16, 16, '#2b2536');
    r(h % 13, (h >> 4) % 13, 2, 2, '#342d42');
    r((h >> 8) % 14, (h >> 12) % 14, 2, 1, '#241f2e');
  };
  const kind = tileKind(state, tx, ty);
  switch (kind) {
    case 'wall':
      r(0, 0, 16, 16, '#5b5270');
      r(0, 0, 16, 1, '#766c8c');
      r(0, 7, 16, 1, '#3d3650');
      r(0, 15, 16, 1, '#3d3650');
      r(h % 2 ? 4 : 10, 0, 1, 7, '#3d3650');
      r(h % 2 ? 11 : 5, 8, 1, 7, '#3d3650');
      break;
    case 'water':
      r(0, 0, 16, 16, '#24539b');
      r((tx * 4) % 16, 4, 5, 1, '#3f7fd0');
      r((tx * 4 + 8) % 16, 11, 5, 1, '#3f7fd0');
      r((tx * 4 + 3) % 16, 8, 2, 1, '#7fb4f0');
      break;
    case 'brambles':
      floor();
      r(1, 2, 14, 12, '#2f7a3a');
      r(3, 1, 4, 2, '#2f7a3a');
      r(9, 13, 5, 2, '#2f7a3a');
      r(3, 4, 3, 2, '#5fbf4f');
      r(9, 6, 4, 2, '#5fbf4f');
      r(5, 10, 3, 2, '#5fbf4f');
      r(7, 3, 1, 1, '#1d4d25');
      r(2, 8, 1, 1, '#1d4d25');
      r(12, 10, 1, 1, '#1d4d25');
      r(8, 8, 1, 1, '#e8e4d0');
      r(4, 12, 1, 1, '#e8e4d0');
      r(12, 4, 1, 1, '#e8e4d0');
      break;
    case 'bars':
      floor();
      for (let k = 1; k < 16; k += 4) {
        r(k, 0, 2, 16, '#8a6a4a');
        r(k, 0, 1, 16, '#b08a5a');
      }
      r(0, 3, 16, 2, '#6b4a30');
      r(0, 11, 16, 2, '#6b4a30');
      break;
    case 'floor':
      floor();
      break;
  }
  // A darker front face under walls gives the rooms some depth.
  if (kind !== 'wall' && tileKind(state, tx, ty - 1) === 'wall') {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x, y, 16, 3);
  }
}

/** The whole dungeon: tiles, then every site (cleared ones dimmed), then the player. */
export function drawDungeon(ctx: CanvasRenderingContext2D, state: MapView): void {
  const { dungeon } = state;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) drawTile(ctx, state, x, y);
  }
  // The start tile is marked with a faint gold square.
  ctx.strokeStyle = 'rgba(232,163,61,0.55)';
  ctx.strokeRect(dungeon.start.x * TILE + 1.5, dungeon.start.y * TILE + 1.5, TILE - 3, TILE - 3);

  for (const node of dungeon.nodes) {
    const cleared = state.cleared.includes(node.id);
    ctx.globalAlpha = cleared ? 0.3 : 1;
    drawSprite(ctx, node.type, node.x * TILE, node.y * TILE);
    ctx.globalAlpha = 1;
  }
  drawSprite(ctx, 'player', state.pos.x * TILE, state.pos.y * TILE);
}
