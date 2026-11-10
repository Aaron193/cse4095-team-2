// Seeded dungeon generator + the bot gate that decides whether a dungeon ships.
//
// Layout: a 4x3 grid of rooms. Two different routes (A and B) run from the start room to
// the exit room; the rooms left over become side rooms holding treasure and keys. Each
// route's doorways are "locked" with obstacles from a different element, so the two
// routes ask for different cards. The bot then proves which card sets actually win.

import type { Answer, Block, Item, MapDef, Mech } from './types.ts';
import { rng } from './rng.ts';
import { CARD_LIST, CARDS } from './cards.ts';
import { solve } from './solver.ts';

const COLS = 4, ROWS = 3, PW = 8, PH = 6;
export const MAP_W = COLS * PW + 1;
export const MAP_H = ROWS * PH + 1;

type LockKind = 'icewall' | 'brazier' | 'brambles' | 'water' | 'lava' | 'hulk' | 'bars' | 'spikes' | 'plate' | 'key' | 'guard' | 'pit' | 'cracked';
const POOLS: Record<string, LockKind[]> = {
  fire: ['icewall', 'brazier', 'brambles', 'icewall'],
  frost: ['water', 'lava', 'hulk', 'water'],
  poison: ['bars', 'brambles', 'bars'],
  neutral: ['spikes', 'plate', 'key', 'guard', 'pit', 'cracked'],
};
// Cards that open a lock. The offer always contains at least one for every lock used.
const FIRE_HITS = ['ember_bolt', 'fireball', 'flame_wave', 'torch', 'fire_ring', 'scorch', 'combust'];
const FROST_HITS = ['frost_bolt', 'glacial_path', 'shatter', 'blizzard', 'icicle_lance'];
const OPENERS: Partial<Record<LockKind, string[]>> = {
  icewall: FIRE_HITS, brazier: FIRE_HITS,
  water: [...FROST_HITS, 'skate'], lava: FROST_HITS, hulk: FROST_HITS,
  bars: ['acid_flask'], cracked: ['fireball', 'icicle_lance'], pit: ['cinder_step'],
};

const ENEMY_WEIGHTS: [string, number][] = [
  ['slime', 3], ['bat', 2], ['spider', 2], ['shambler', 2], ['knight', 1.5],
  ['wraith', 1.5], ['imp', 1.5], ['beetle', 1.5], ['troll', 1], ['mimic', 1],
];
export const NAME_A = ['Ashen', 'Sunken', 'Hollow', 'Frostbitten', 'Venomous', 'Forgotten', 'Howling', 'Gilded', 'Smoldering', 'Weeping', 'Crooked', 'Silent', 'Rusted', 'Moonlit', 'Thorned'];
export const NAME_B = ['Vault', 'Cellar', 'Crypt', 'Warren', 'Cistern', 'Gallery', 'Undercroft', 'Maze', 'Foundry', 'Sanctum', 'Catacomb', 'Den', 'Archive', 'Grotto', 'Keep'];

export function generateCandidate(seed: number, difficulty: number, id = 0): MapDef {
  const rl = rng(seed, 'layout'), ro = rng(seed, 'locks'), re = rng(seed, 'enemies'), ri = rng(seed, 'loot'), rc = rng(seed, 'cards');
  const g: string[][] = Array.from({ length: MAP_H }, () => Array<string>(MAP_W).fill('#'));
  const used = new Set<number>();
  const idx = (x: number, y: number) => y * MAP_W + x;
  const enemies: MapDef['enemies'] = [];
  const blocks: Block[] = [];
  const items: Item[] = [];
  const mechs: Mech[] = [];
  const need: string[][] = [];
  const ox = (room: number) => (room % COLS) * PW; // room-local (1..7, 1..5) -> map
  const oy = (room: number) => Math.floor(room / COLS) * PH;

  for (let room = 0; room < COLS * ROWS; room++)
    for (let y = 1; y < PH; y++) for (let x = 1; x < PW; x++) g[oy(room) + y][ox(room) + x] = '.';

  // ----- room graph: two routes plus side rooms -----
  const nbrs = (r: number) => {
    const c = r % COLS, out: number[] = [];
    if (c > 0) out.push(r - 1);
    if (c < COLS - 1) out.push(r + 1);
    if (r >= COLS) out.push(r - COLS);
    if (r < COLS * (ROWS - 1)) out.push(r + COLS);
    return out;
  };
  // opposite corners, so the shortest route still crosses five rooms
  const startRow = rl.pick([0, ROWS - 1]);
  const start = startRow * COLS;
  const exit = (ROWS - 1 - startRow) * COLS + COLS - 1;
  const walk = (cur: number, path: number[], seen: Set<number>): number[] | null => {
    if (cur === exit) return path;
    if (path.length >= 7) return null;
    for (const n of rl.shuffle(nbrs(cur))) {
      if (seen.has(n)) continue;
      seen.add(n);
      const r = walk(n, [...path, n], seen);
      if (r) return r;
      seen.delete(n);
    }
    return null;
  };
  const pathA = walk(start, [start], new Set([start]))!;
  const ekey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const edgesOf = (p: number[]) => p.slice(1).map((r, i) => ekey(p[i], r));
  const bfs = (blockedRooms: Set<number>, blockedEdges: Set<string>): number[] | null => {
    const prev = new Map<number, number>([[start, -1]]);
    const q = [start];
    for (let h = 0; h < q.length; h++) {
      const cur = q[h];
      if (cur === exit) {
        const p: number[] = [];
        for (let c = cur; c !== -1; c = prev.get(c)!) p.push(c);
        return p.reverse();
      }
      for (const n of rl.shuffle(nbrs(cur))) {
        if (prev.has(n) || blockedRooms.has(n) || blockedEdges.has(ekey(cur, n))) continue;
        prev.set(n, cur);
        q.push(n);
      }
    }
    return null;
  };
  const pathB = bfs(new Set(pathA.slice(1, -1)), new Set(edgesOf(pathA))) ?? bfs(new Set(), new Set(edgesOf(pathA))) ?? pathA;
  const route = new Map<string, string>(); // edge -> 'A' | 'B' | 'AB' | 'side'
  for (const e of edgesOf(pathA)) route.set(e, 'A');
  for (const e of edgesOf(pathB)) route.set(e, route.has(e) ? 'AB' : 'B');
  const connected = new Set([...pathA, ...pathB]);
  const sideRooms: number[] = [];
  while (connected.size < COLS * ROWS) {
    const open = rl.shuffle([...Array(COLS * ROWS).keys()].filter((r) => !connected.has(r) && nbrs(r).some((n) => connected.has(n))));
    const r = open[0];
    const to = rl.pick(nbrs(r).filter((n) => connected.has(n)));
    route.set(ekey(r, to), 'side');
    connected.add(r);
    sideRooms.push(r);
  }
  // depth from start, so every door knows its "near" (start-side) room
  const depth = new Map<number, number>([[start, 0]]);
  for (const q = [start]; q.length; ) {
    const cur = q.shift()!;
    for (const n of nbrs(cur)) if (route.has(ekey(cur, n)) && !depth.has(n)) { depth.set(n, depth.get(cur)! + 1); q.push(n); }
  }

  // ----- helpers for placing things -----
  const free = (room: number, r: typeof rl, inner = false): [number, number] | null => {
    for (let t = 0; t < 40; t++) {
      const x = ox(room) + (inner ? 2 + r.int(5) : 1 + r.int(7));
      const y = oy(room) + (inner ? 2 + r.int(3) : 1 + r.int(5));
      if (g[y][x] === '.' && !used.has(idx(x, y))) { used.add(idx(x, y)); return [x, y]; }
    }
    return null;
  };
  const weighted = (r: typeof rl, table: [string, number][]) => {
    let roll = r.next() * table.reduce((n, t) => n + t[1], 0);
    for (const [v, w] of table) if ((roll -= w) < 0) return v;
    return table[0][0];
  };

  // start and exit
  const sx = ox(start) + 2, sy = oy(start) + 3;
  g[sy][sx] = 'S'; used.add(idx(sx, sy));
  const exx = ox(exit) + 6, exy = oy(exit) + 3;
  g[exy][exx] = 'E'; used.add(idx(exx, exy));

  // ----- doors -----
  interface Door { a: number; b: number; x: number; y: number; route: string; near: number }
  const doors: Door[] = [];
  for (const [k, rt] of route) {
    const [a, b] = k.split('-').map(Number);
    let x: number, y: number;
    if (b === a + 1) { x = ox(b); y = oy(a) + 2 + rl.int(3); used.add(idx(x - 1, y)); used.add(idx(x + 1, y)); }
    else { y = oy(b); x = ox(a) + rl.pick([2, 3, 5, 6]); used.add(idx(x, y - 1)); used.add(idx(x, y + 1)); }
    g[y][x] = '.';
    doors.push({ a, b, x, y, route: rt, near: depth.get(a)! <= depth.get(b)! ? a : b });
  }

  // ----- locks -----
  const aff = ro.shuffle(['fire', 'frost', 'poison']);
  let keysNeeded = 0;
  const lockDoor = (d: Door, kind: LockKind) => {
    const di = idx(d.x, d.y);
    const tile: Partial<Record<LockKind, string>> = { icewall: 'I', brambles: 'B', water: '~', lava: 'L', bars: 'R', spikes: '^', pit: 'P', cracked: 'C', key: 'D' };
    if (tile[kind]) g[d.y][d.x] = tile[kind]!;
    if (OPENERS[kind]) need.push(OPENERS[kind]!);
    if (kind === 'key') keysNeeded++;
    if (kind === 'hulk') enemies.push({ type: 'hulk', x: d.x, y: d.y });
    if (kind === 'guard') enemies.push({ type: 'sentinel', x: d.x, y: d.y });
    if (kind === 'brazier') {
      g[d.y][d.x] = 'G';
      const corners = ro.shuffle([[1, 1], [7, 1], [1, 5], [7, 5]]);
      const [cx, cy] = corners.find(([lx, ly]) => g[oy(d.near) + ly][ox(d.near) + lx] === '.' && !used.has(idx(ox(d.near) + lx, oy(d.near) + ly)))!;
      const bx = ox(d.near) + cx, by = oy(d.near) + cy;
      g[by][bx] = 'T'; used.add(idx(bx, by));
      mechs.push({ kind: 'brazier', sources: [idx(bx, by)], gates: [di] });
    }
    if (kind === 'plate') {
      g[d.y][d.x] = 'G';
      const p = free(d.near, ro, true), c = free(d.near, ro, true);
      if (p) { g[p[1]][p[0]] = '_'; mechs.push({ kind: 'plate', sources: [idx(p[0], p[1])], gates: [di] }); }
      if (c) blocks.push({ x: c[0], y: c[1], kind: 'crate' });
    }
    if ((kind === 'pit' || kind === 'water') && ro.chance(kind === 'pit' ? 0.8 : 0.4)) {
      const c = free(d.near, ro, true);
      if (c) blocks.push({ x: c[0], y: c[1], kind: 'crate' });
    }
  };
  const lockRoute = (tag: string, element: string) => {
    const mine = doors.filter((d) => d.route === tag);
    let locked = 0;
    for (const d of mine) {
      if (!ro.chance(0.6 + 0.3 * difficulty)) continue;
      lockDoor(d, ro.pick(ro.chance(0.7) ? POOLS[element] : POOLS.neutral));
      locked++;
    }
    if (!locked && mine.length) lockDoor(ro.pick(mine), ro.pick(POOLS[element]));
  };
  lockRoute('A', aff[0]);
  lockRoute('B', aff[1]);
  for (const d of doors) {
    if (d.route === 'AB' && ro.chance(0.35)) lockDoor(d, ro.pick(POOLS.neutral));
    if (d.route === 'side' && ro.chance(0.55)) lockDoor(d, ro.pick(ro.chance(0.6) ? POOLS[aff[2]] : POOLS.neutral));
  }

  // ----- room dressing -----
  const onRoute = new Set([...pathA, ...pathB]);
  for (let room = 0; room < COLS * ROWS; room++) {
    if (room === start) continue;
    const isSide = !onRoute.has(room);
    // a band of hazard splitting the room
    if (room !== exit && !isSide && rl.chance(0.2 + 0.2 * difficulty)) {
      const kind = rl.pick(['~', '~', 'L', 'P', '^', '^']);
      const lx = 4;
      let ok = true;
      for (let ly = 1; ly <= 5; ly++) if (g[oy(room) + ly][ox(room) + lx] !== '.' || used.has(idx(ox(room) + lx, oy(room) + ly))) ok = false;
      if (ok) {
        for (let ly = 1; ly <= 5; ly++) { g[oy(room) + ly][ox(room) + lx] = kind; used.add(idx(ox(room) + lx, oy(room) + ly)); }
        if (kind === '~') need.push(OPENERS.water!);
        if (kind === 'L') need.push(OPENERS.lava!);
        if (kind === 'P' || (kind === '~' && rl.chance(0.5))) { const c = free(room, rl, true); if (c) blocks.push({ x: c[0], y: c[1], kind: 'crate' }); }
      }
    } else if (rl.chance(0.3)) {
      for (const [lx, ly] of [[2, 2], [6, 2], [2, 4], [6, 4]]) {
        const x = ox(room) + lx, y = oy(room) + ly;
        if (g[y][x] === '.' && !used.has(idx(x, y))) g[y][x] = '#';
      }
    }
    // enemies
    let count = re.pick(difficulty > 0.6 ? [0, 1, 1, 2] : difficulty > 0.25 ? [0, 1, 1, 1] : [0, 0, 1, 1]);
    if (room === exit && difficulty > 0.4 && re.chance(0.35)) { const p = free(room, re); if (p) enemies.push({ type: 'warden', x: p[0], y: p[1] }); count--; }
    for (let n = 0; n < count; n++) {
      const type = weighted(re, ENEMY_WEIGHTS);
      const p = free(room, re);
      if (!p) continue;
      enemies.push({ type, x: p[0], y: p[1], dir: re.pick([1, 2]) });
      if (type === 'spider') for (let k = 0; k < 3; k++) { const w = free(room, re); if (w) g[w[1]][w[0]] = 'W'; }
      if (type === 'imp' || type === 'beetle') for (let k = 0; k < 3; k++) { const o = free(room, re); if (o) g[o[1]][o[0]] = 'O'; }
    }
    if (re.chance(0.12 + 0.1 * difficulty)) { const v = free(room, re, true); if (v) g[v[1]][v[0]] = 'V'; }
    if (re.chance(0.15)) { const c = free(room, re, true); if (c) blocks.push({ x: c[0], y: c[1], kind: 'crate' }); }
    // loot
    if (isSide) {
      for (let k = 0; k < 2; k++) { const p = free(room, ri); if (p) items.push({ x: p[0], y: p[1], kind: 'gold' }); }
      const p = free(room, ri); if (p) items.push({ x: p[0], y: p[1], kind: ri.chance(0.5) ? 'chest' : 'potion' });
    } else if (ri.chance(0.45)) { const p = free(room, ri); if (p) items.push({ x: p[0], y: p[1], kind: ri.chance(0.75) ? 'gold' : 'potion' }); }
  }
  // keys live off the beaten path when possible
  for (let k = 0; k < keysNeeded; k++) {
    const room = sideRooms.length ? ri.pick(sideRooms) : ri.pick([...onRoute].filter((r) => r !== exit));
    const p = free(room, ri);
    if (p) items.push({ x: p[0], y: p[1], kind: 'key' });
  }

  // ----- today's 9 cards: 3 per element, including an opener for every lock -----
  const offer: string[] = [];
  for (const el of ['fire', 'frost', 'poison']) offer.push(...rc.shuffle(CARD_LIST.filter((c) => c.el === el).map((c) => c.id)).slice(0, 3));
  const forced = new Set<string>();
  for (const options of need) {
    if (options.some((o) => offer.includes(o))) { options.filter((o) => offer.includes(o)).forEach((o) => forced.add(o)); continue; }
    const want = rc.pick(options);
    const swap = offer.findIndex((o) => CARDS[o].el === CARDS[want].el && !forced.has(o));
    if (swap >= 0) { offer[swap] = want; forced.add(want); }
  }

  return {
    id, seed, difficulty,
    name: `The ${rl.pick(NAME_A)} ${rl.pick(NAME_B)}`,
    w: MAP_W, h: MAP_H,
    tiles: g.map((row) => row.join('')),
    enemies, blocks, items, mechs, offer, par: 0,
  };
}

// ---------- the bot gate ----------

export interface Verification { ok: boolean; reason: string; par: number; winPct: number; answers: Answer[] }

/** Count how many of the C(9,4) loadouts contain at least one winning set. */
function winPercent(offer: string[], winners: string[][]): number {
  let wins = 0, total = 0;
  const n = offer.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) {
    const pick = [offer[a], offer[b], offer[c], offer[d]];
    total++;
    if (winners.some((w) => w.every((id) => pick.includes(id)))) wins++;
  }
  return Math.round((100 * wins) / total);
}

/**
 * A dungeon ships only if:
 *  - it cannot be beaten with no cards at all (cards must matter),
 *  - it can be beaten with everything (it is fair),
 *  - at least two different minimal card sets win and no single card is in all of them
 *    (there is more than one way through),
 *  - between 8% and 80% of the 126 possible loadouts win (the pick is a real decision);
 *    the ceiling drops to 40% for the hardest dungeons,
 *  - the bot's best run is 40 to 170 moves (a 5 to 10 minute dungeon).
 * Extra cards never hurt, so testing single cards and pairs is enough to know the result
 * for every loadout that contains them.
 */
export function verifyMap(map: MapDef, budget = 2000): Verification {
  const fail = (reason: string): Verification => ({ ok: false, reason, par: 0, winPct: 0, answers: [] });
  const all = solve(map, map.offer, budget * 2);
  
  if (!all) return fail('not solvable with every card');
  if (solve(map, [], budget * 2)) return fail('solvable with no cards');
  const answers: Answer[] = [];
  const singles = new Set<string>();
  const cap = 80 - 40 * map.difficulty;
  const pct = () => winPercent(map.offer, answers.map((a) => a.cards));
  for (const c of map.offer) {
    const r = solve(map, [c], budget);
    if (r) { answers.push(r); singles.add(c); }
    if (r && pct() > cap) return fail(`win rate ${pct()}%+`);
  }
  for (let i = 0; i < map.offer.length; i++) for (let j = i + 1; j < map.offer.length; j++) {
    const a = map.offer[i], b = map.offer[j];
    if (singles.has(a) || singles.has(b)) continue;
    const r = solve(map, [a, b], budget);
    if (r) answers.push(r);
    if (r && pct() > cap) return fail(`win rate ${pct()}%+`);
  }
  if (answers.length < 2) return fail(`only ${answers.length} winning card set(s)`);
  const common = answers[0].cards.filter((c) => answers.every((a) => a.cards.includes(c)));
  if (common.length) return fail(`every solution needs ${common[0]}`);
  const winPct = pct();
  if (winPct < 8) return fail(`win rate ${winPct}%`);
  const par = Math.min(all.moves, ...answers.map((a) => a.moves));
  if (par < 40 || par > 170) return fail(`par ${par}`);
  answers.sort((a, b) => a.moves - b.moves);
  return { ok: true, reason: 'ok', par, winPct, answers };
}

/** Roll seeds until one passes the gate. The offset is recorded in the seed itself. */
export function generateVerified(baseSeed: number, difficulty: number, id: number, log?: (msg: string) => void): MapDef {
  for (let offset = 0; offset < 400; offset++) {
    const seed = (baseSeed + offset * 7919) >>> 0;
    const map = generateCandidate(seed, difficulty, id);
    const v = verifyMap(map);
    log?.(`  seed ${seed} (+${offset}): ${v.reason}`);
    if (!v.ok) continue;
    return { ...map, par: v.par, winPct: v.winPct, answers: v.answers };
  }
  throw new Error(`no valid dungeon found for base seed ${baseSeed}`);
}
