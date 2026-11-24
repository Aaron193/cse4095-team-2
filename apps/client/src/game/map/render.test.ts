// The dungeon renderer (task P2-C1), against a canvas context that records what it is told.
import { describe, expect, it } from 'vitest';
import { fixtureMapRun } from '../fixtures/index.ts';
import { drawDungeon, siteAt, TILE, tileKind } from './render.ts';
import { spritePixels } from './sprites.ts';

/** A stand-in 2D context: records each filled square and the alpha it was drawn with. */
function recordingContext() {
  const fills: { x: number; y: number; w: number; h: number; color: string; alpha: number }[] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    fillRect(x: number, y: number, w: number, h: number) {
      fills.push({ x, y, w, h, color: String(this.fillStyle), alpha: this.globalAlpha });
    },
    strokeRect() {},
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills };
}

describe('tileKind', () => {
  const state = fixtureMapRun();

  it('reads the five R4 tile kinds', () => {
    expect(tileKind(state, 0, 0)).toBe('wall');
    expect(tileKind(state, 2, 2)).toBe('floor');
    expect(tileKind(state, 24, 3)).toBe('brambles');
    expect(tileKind(state, 16, 9)).toBe('water');
    expect(tileKind(state, 8, 15)).toBe('bars');
  });

  it('treats off the grid as wall', () => {
    expect(tileKind(state, -1, 4)).toBe('wall');
    expect(tileKind(state, 33, 4)).toBe('wall');
    expect(tileKind(state, 4, 19)).toBe('wall');
  });

  it('draws an opened gate as floor', () => {
    const opened = fixtureMapRun((s) => (s.openedGates = [3 * s.dungeon.width + 24]));
    expect(tileKind(opened, 24, 3)).toBe('floor');
  });
});

describe('siteAt', () => {
  it('finds a site by its tile', () => {
    expect(siteAt(fixtureMapRun(), 24, 15)?.type).toBe('boss');
    expect(siteAt(fixtureMapRun(), 2, 2)).toBeUndefined();
  });
});

describe('drawDungeon', () => {
  it('fills every tile and draws the player on its tile', () => {
    const state = fixtureMapRun();
    const { ctx, fills } = recordingContext();
    drawDungeon(ctx, state);
    for (let y = 0; y < state.dungeon.height; y++) {
      for (let x = 0; x < state.dungeon.width; x++) {
        expect(fills.some((f) => f.x === x * TILE && f.y === y * TILE && f.w === 16)).toBe(true);
      }
    }
    // The player's sprite comes last.
    const player = spritePixels('player');
    const last = fills.slice(-player.length);
    expect(last[0]).toMatchObject({ x: 4 * TILE + player[0]![0], y: 8 * TILE + player[0]![1] });
  });

  it('dims cleared sites only', () => {
    const state = fixtureMapRun();
    const { ctx, fills } = recordingContext();
    drawDungeon(ctx, state);
    const onTile = (x: number, y: number) =>
      fills.filter(
        (f) => f.w === 2 && Math.floor(f.x / TILE) === x && Math.floor(f.y / TILE) === y,
      );
    expect(onTile(4, 6).some((f) => f.alpha < 1)).toBe(true); // n2, cleared
    expect(onTile(24, 15).some((f) => f.alpha < 1)).toBe(false); // the boss
  });
});
