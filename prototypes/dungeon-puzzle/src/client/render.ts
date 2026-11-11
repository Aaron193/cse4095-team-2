// Draws a game state onto a canvas. Pure presentation: reads the engine state, never
// changes it. Tiles are drawn with rectangles on a 16px grid, creatures with sprites.ts.

import type { State } from '../engine/index.ts';
import { CARDS, DX, DY, ENEMIES, fireAt, gasAt, isSolid, spikesUp } from '../engine/index.ts';
import { sprite } from './sprites.ts';

export const TILE = 16;
export const EL_COLOR: Record<string, string> = { fire: '#ff7a2a', frost: '#5ad4ff', poison: '#8ad43a' };

export interface Flash { x: number; y: number; color: string; until: number }
export interface View { aim: number | null; flashes: Flash[] }

const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

export function draw(ctx: CanvasRenderingContext2D, s: State, now: number, view: View) {
  const frame = Math.floor(now / 250);
  // traps and vents are shown as they will be when your next move resolves
  const next = s.stasis > 0 ? s : { ...s, clock: s.clock + 1 };
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const i = y * s.w + x;
      drawTile(ctx, s, s.tiles[i], x, y, frame, next);
    }
  }
  // aim preview
  if (view.aim !== null && s.cards[view.aim]) {
    const def = CARDS[s.cards[view.aim].id];
    ctx.fillStyle = EL_COLOR[def.el] + '55';
    if (def.shape === 'burst') {
      const r = def.radius!;
      ctx.fillRect((s.px - r) * TILE, (s.py - r) * TILE, (2 * r + 1) * TILE, (2 * r + 1) * TILE);
    } else {
      const range = def.range ?? (def.shape === 'skate' ? 12 : 1);
      for (let d = 0; d < 4; d++) {
        for (let k = 1; k <= range; k++) {
          const x = s.px + DX[d] * k, y = s.py + DY[d] * k;
          if (x < 0 || y < 0 || x >= s.w || y >= s.h) break;
          ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
          if (isSolid(s.tiles[y * s.w + x])) break;
        }
      }
    }
  }
  // overlays: fire, gas, bait
  for (const f of s.fires) drawFlame(ctx, (f.i % s.w) * TILE, ((f.i / s.w) | 0) * TILE, frame + f.i, true);
  for (let i = 0; i < s.tiles.length; i++) {
    if (isSolid(s.tiles[i]) || !gasAt(next, i)) continue;
    const x = (i % s.w) * TILE, y = ((i / s.w) | 0) * TILE;
    ctx.fillStyle = 'rgba(138,212,58,0.35)';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(190,255,120,0.6)';
    for (let k = 0; k < 3; k++) {
      const h = hash(i + k * 7, frame + k);
      ctx.fillRect(x + (h % 14), y + ((h >> 4) % 14), 2, 2);
    }
  }
  if (s.bait) ctx.drawImage(sprite('bait'), (s.bait.i % s.w) * TILE, ((s.bait.i / s.w) | 0) * TILE);
  // things
  for (const it of s.items) {
    const bob = it.kind === 'chest' ? 0 : frame % 4 === 0 ? -1 : 0;
    ctx.drawImage(sprite(it.kind), it.x * TILE, it.y * TILE + bob);
  }
  for (const b of s.blocks) ctx.drawImage(sprite(b.kind), b.x * TILE, b.y * TILE);
  for (const e of s.enemies) {
    const x = e.x * TILE, y = e.y * TILE;
    const name = e.type === 'mimic' && !e.awake ? 'mimic_idle' : e.type;
    const hop = e.frozen || e.sleep || (e.type === 'mimic' && !e.awake) ? 0 : (frame + e.id) % 4 === 0 ? -1 : 0;
    ctx.drawImage(sprite(name), x, y + hop);
    if (e.type === 'mimic' && !e.awake) continue;
    if (e.frozen > 0) {
      ctx.fillStyle = 'rgba(159,232,255,0.55)';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = '#e6f8ff';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
    if (e.sleep > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 11, y + 1, 3, 1); ctx.fillRect(x + 12, y + 2, 1, 1); ctx.fillRect(x + 11, y + 3, 3, 1); }
    if (e.burn > 0 && frame % 2 === 0) { ctx.fillStyle = '#ff7a2a'; ctx.fillRect(x + 1, y + 1, 2, 3); ctx.fillStyle = '#ffe060'; ctx.fillRect(x + 1, y + 3, 2, 1); }
    if (e.poison > 0) { ctx.fillStyle = '#8ad43a'; ctx.fillRect(x + 13, y + 12, 2, 2); ctx.fillRect(x + 11, y + 14, 2, 2); }
    if (e.charge > 0 && frame % 2 === 0) { ctx.fillStyle = '#ff3030'; ctx.fillRect(x + 7, y - 5, 2, 4); ctx.fillRect(x + 7, y, 2, 1); }
    // health pips
    const max = ENEMIES[e.type].hp;
    if (!ENEMIES[e.type].quench) {
      ctx.fillStyle = '#15121c';
      ctx.fillRect(x + 1, y - 2, 14, 2);
      ctx.fillStyle = e.hp * 2 > max ? '#5ac54f' : '#e04a2a';
      ctx.fillRect(x + 1, y - 2, Math.max(1, Math.round((14 * e.hp) / max)), 2);
    }
  }
  // player
  const px = s.px * TILE, py = s.py * TILE;
  ctx.globalAlpha = s.veil > 0 ? 0.4 : 1;
  ctx.drawImage(sprite('player'), px, py);
  ctx.globalAlpha = 1;
  if (s.shield > 0) { ctx.strokeStyle = '#5ad4ff'; ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1); }
  if (s.inner > 0) { ctx.strokeStyle = '#ff7a2a'; ctx.strokeRect(px - 0.5, py - 0.5, TILE + 1, TILE + 1); }
  if (s.stasis > 0) { ctx.fillStyle = 'rgba(90,212,255,0.12)'; ctx.fillRect(0, 0, s.w * TILE, s.h * TILE); }
  // hit flashes
  for (const f of view.flashes) {
    if (f.until < now) continue;
    ctx.globalAlpha = Math.min(1, (f.until - now) / 200);
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x * TILE, f.y * TILE, TILE, TILE);
    ctx.globalAlpha = 1;
  }
}

function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, big: boolean) {
  const f = frame % 3;
  ctx.fillStyle = '#e04a2a';
  if (big) { ctx.fillRect(x + 2, y + 6 - f, 4, 10 + f); ctx.fillRect(x + 6, y + 3 + f, 5, 13 - f); ctx.fillRect(x + 11, y + 7 - f, 3, 9 + f); }
  else ctx.fillRect(x + 5, y + 1 + f, 6, 5 - f);
  ctx.fillStyle = '#ffa030';
  if (big) { ctx.fillRect(x + 3, y + 9, 3, 7); ctx.fillRect(x + 7, y + 7 + f, 3, 9 - f); ctx.fillRect(x + 11, y + 11, 2, 5); }
  else ctx.fillRect(x + 6, y + 3 + f, 4, 3 - f);
  ctx.fillStyle = '#ffe060';
  ctx.fillRect(x + 7, y + (big ? 12 : 4), 2, big ? 4 : 2);
}

function drawTile(ctx: CanvasRenderingContext2D, s: State, c: string, tx: number, ty: number, frame: number, next: State) {
  const x = tx * TILE, y = ty * TILE, h = hash(tx, ty);
  const r = (dx: number, dy: number, w: number, hh: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(x + dx, y + dy, w, hh); };
  const floor = () => {
    r(0, 0, 16, 16, '#2b2536');
    r(h % 13, (h >> 4) % 13, 2, 2, '#342d42');
    r((h >> 8) % 14, (h >> 12) % 14, 2, 1, '#241f2e');
  };
  const wall = () => {
    r(0, 0, 16, 16, '#5b5270');
    r(0, 0, 16, 1, '#766c8c');
    r(0, 7, 16, 1, '#3d3650'); r(0, 15, 16, 1, '#3d3650');
    r(h % 2 ? 4 : 10, 0, 1, 7, '#3d3650'); r(h % 2 ? 11 : 5, 8, 1, 7, '#3d3650');
  };
  switch (c) {
    case '#': wall(); break;
    case '=': r(0, 0, 16, 16, '#15121c'); for (let k = 0; k < 4; k++) { r(1, k * 4, 14, 3, '#8a5a2b'); r(1, k * 4 + 2, 14, 1, '#6b4420'); } break;
    case '~': {
      r(0, 0, 16, 16, '#24539b');
      const o = (frame + tx) % 4;
      r((o * 4) % 16, 4, 5, 1, '#3f7fd0'); r((o * 4 + 8) % 16, 11, 5, 1, '#3f7fd0'); r((o * 4 + 3) % 16, 8, 2, 1, '#7fb4f0');
      break;
    }
    case 'i': r(0, 0, 16, 16, '#9fd6ee'); r(2, 3, 6, 1, '#e6f8ff'); r(8, 9, 5, 1, '#e6f8ff'); r(4, 12, 3, 1, '#6fb4d8'); break;
    case 'L': {
      r(0, 0, 16, 16, '#c73d12');
      const o = (frame + tx * 3 + ty) % 4;
      r(2 + o * 2, 3, 4, 3, '#ff8a1f'); r(9 - o, 10, 4, 3, '#ff8a1f'); r(3 + o * 2, 4, 2, 1, '#ffd23f'); r(10 - o, 11, 2, 1, '#ffd23f');
      break;
    }
    case 'o': r(0, 0, 16, 16, '#3a2f45'); r(h % 12, 3, 3, 1, '#6a4f8a'); r((h >> 5) % 12, 10, 2, 2, '#221a2c'); break;
    case 'P': r(0, 0, 16, 16, '#08060c'); r(0, 0, 16, 2, '#1a1524'); r(0, 0, 1, 16, '#120f1a'); r(15, 0, 1, 16, '#120f1a'); break;
    case 'B':
      floor();
      r(1, 2, 14, 12, '#2f7a3a'); r(3, 1, 4, 2, '#2f7a3a'); r(9, 13, 5, 2, '#2f7a3a');
      r(3, 4, 3, 2, '#5fbf4f'); r(9, 6, 4, 2, '#5fbf4f'); r(5, 10, 3, 2, '#5fbf4f');
      r(7, 3, 1, 1, '#1d4d25'); r(2, 8, 1, 1, '#1d4d25'); r(12, 10, 1, 1, '#1d4d25'); r(8, 8, 1, 1, '#e8e4d0'); r(4, 12, 1, 1, '#e8e4d0'); r(12, 4, 1, 1, '#e8e4d0');
      break;
    case 'I': r(0, 0, 16, 16, '#7cc4ea'); r(0, 0, 16, 1, '#e6f8ff'); r(0, 0, 1, 16, '#e6f8ff'); r(15, 0, 1, 16, '#4a8fc0'); r(0, 15, 16, 1, '#4a8fc0'); r(3, 3, 4, 1, '#e6f8ff'); r(3, 4, 1, 3, '#e6f8ff'); r(10, 10, 3, 1, '#4a8fc0'); break;
    case 'R': floor(); for (let k = 1; k < 16; k += 4) { r(k, 0, 2, 16, '#8a6a4a'); r(k, 0, 1, 16, '#b08a5a'); } r(0, 3, 16, 2, '#6b4a30'); r(0, 11, 16, 2, '#6b4a30'); break;
    case 'D': r(0, 0, 16, 16, '#4a2c10'); r(2, 1, 12, 15, '#7a4a20'); r(7, 1, 1, 15, '#5d3716'); r(10, 7, 3, 3, '#ffd040'); r(11, 8, 1, 2, '#15121c'); break;
    case 'C': wall(); r(7, 1, 1, 4, '#1d1826'); r(8, 4, 1, 3, '#1d1826'); r(6, 6, 2, 1, '#1d1826'); r(5, 7, 1, 4, '#1d1826'); r(9, 6, 2, 1, '#1d1826'); r(10, 7, 1, 5, '#1d1826'); r(6, 11, 1, 3, '#1d1826'); break;
    case '^': {
      floor();
      const up = spikesUp(next.clock);
      for (const [dx, dy] of [[2, 2], [9, 2], [2, 9], [9, 9]]) {
        r(dx, dy + 3, 4, 2, '#15121c');
        if (up) { r(dx + 1, dy - 1, 2, 5, '#c8ccd8'); r(dx + 1, dy - 1, 1, 5, '#ffffff'); r(dx, dy + 2, 4, 2, '#8a90a0'); }
      }
      if (up) { ctx.strokeStyle = '#e04a2a'; ctx.strokeRect(x + 0.5, y + 0.5, 15, 15); }
      break;
    }
    case 'x': floor(); r(1, 1, 14, 14, '#9fd6ee'); r(3, 3, 5, 1, '#e6f8ff'); r(2, 2, 2, 2, '#15121c'); r(9, 9, 2, 2, '#15121c'); break;
    case 'V': floor(); r(3, 3, 10, 10, '#15121c'); for (let k = 4; k < 12; k += 3) r(k, 3, 1, 10, '#6a6480'); r(3, 7, 10, 1, '#6a6480'); r(6, 6, 4, 4, '#8ad43a'); break;
    case 'v': floor(); r(3, 3, 10, 10, '#9fd6ee'); r(4, 4, 4, 1, '#e6f8ff'); break;
    case 'O': floor(); r(2, 4, 12, 9, '#120e18'); r(4, 2, 8, 12, '#120e18'); r(5, 5, 4, 1, '#6a4f8a'); r(9, 9, 3, 1, '#4a3a6a'); break;
    case 'W': floor(); r(0, 7, 16, 1, '#cfcfe0'); r(7, 0, 1, 16, '#cfcfe0'); for (let k = 0; k < 16; k += 2) { r(k, k, 1, 1, '#cfcfe0'); r(15 - k, k, 1, 1, '#cfcfe0'); } r(4, 4, 8, 1, '#9a9ab0'); r(4, 11, 8, 1, '#9a9ab0'); r(4, 4, 1, 8, '#9a9ab0'); r(11, 4, 1, 8, '#9a9ab0'); break;
    case '_': floor(); r(3, 3, 10, 10, '#6a6480'); r(4, 4, 8, 8, '#8a84a0'); r(4, 11, 8, 1, '#4a4460'); break;
    case 'G': r(0, 0, 16, 16, '#1d1826'); for (let k = 1; k < 16; k += 4) r(k, 0, 2, 16, '#9a9ab0'); r(0, 4, 16, 2, '#6a6480'); r(0, 11, 16, 2, '#6a6480'); break;
    case 'g': floor(); r(0, 0, 16, 2, '#9a9ab0'); r(1, 2, 2, 2, '#6a6480'); r(5, 2, 2, 2, '#6a6480'); r(9, 2, 2, 2, '#6a6480'); r(13, 2, 2, 2, '#6a6480'); break;
    case 'T': case 't':
      floor(); r(3, 8, 10, 3, '#8a6a4a'); r(4, 11, 8, 2, '#6b4a30'); r(6, 13, 4, 3, '#4a3020'); r(4, 7, 8, 1, c === 't' ? '#ffa030' : '#15121c');
      if (c === 't') drawFlame(ctx, x, y, frame + tx, false);
      break;
    case 'E': {
      r(0, 0, 16, 16, '#15121c');
      for (let k = 0; k < 4; k++) r(k * 3, 2 + k * 3, 16 - k * 3, 3, k % 2 ? '#a88a40' : '#c8a850');
      if (frame % 4 < 2) { ctx.strokeStyle = '#ffe060'; ctx.strokeRect(x + 0.5, y + 0.5, 15, 15); }
      break;
    }
    default: floor();
  }
  // a darker front face under walls gives the rooms some depth
  if (c !== '#' && c !== 'C' && ty > 0) {
    const above = s.tiles[(ty - 1) * s.w + tx];
    if (above === '#' || above === 'C') { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x, y, 16, 3); }
  }
  if (fireAt(s, ty * s.w + tx)) { ctx.fillStyle = 'rgba(255,122,42,0.25)'; ctx.fillRect(x, y, 16, 16); }
}
