// The Daily Delve rules engine.
//
// One pure function: step(state, action) -> new state. No clock, no unseeded randomness,
// no I/O. The browser, the server (run verification) and the solver bot all call this,
// so a run is only ever "map + loadout + list of actions".
//
// Turn order (fixed; player-facing rules are in Docs/Game Content.md):
//   1. player action   2. enemies (damage over time, then act)   3. fire and gas tick
//   4. hazards under the player   5. buffs tick   6. gates update   7. death check
// Damage order: additive bonuses, then weak/resist multiplier, then armor.

import type { Action, Block, Enemy, Hit, MapDef, State } from './types.ts';
import { CARDS } from './cards.ts';
import { ENEMIES } from './enemies.ts';
import { isSolid, isWalk } from './tiles.ts';

export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const DIRS = 'NESW';
export const START_HP = 10;

// ---------- small helpers ----------

const inb = (s: State, x: number, y: number) => x >= 0 && y >= 0 && x < s.w && y < s.h;
const cheb = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
const manh = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) + Math.abs(ay - by);

export function enemyAt(s: State, x: number, y: number): Enemy | undefined {
  for (const e of s.enemies) if (e.x === x && e.y === y) return e;
  return undefined;
}
export function blockAt(s: State, x: number, y: number): Block | undefined {
  for (const b of s.blocks) if (b.x === x && b.y === y) return b;
  return undefined;
}
export const fireAt = (s: State, i: number) => s.fires.some((f) => f.i === i);
export const spikesUp = (clock: number) => clock % 4 < 2;
export const ventOn = (clock: number) => clock % 6 < 3;

export function gasAt(s: State, i: number): boolean {
  if (s.gases.some((g) => g.i === i)) return true;
  if (!ventOn(s.clock)) return false;
  const x = i % s.w, y = (i / s.w) | 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (inb(s, x + dx, y + dy) && s.tiles[(y + dy) * s.w + x + dx] === 'V') return true;
  return false;
}

function setTile(s: State, i: number, c: string) {
  s.tiles = s.tiles.slice(0, i) + c + s.tiles.slice(i + 1);
  s.fx++;
}
function ev(s: State, t: string, msg?: string, x?: number, y?: number) {
  s.events.push({ t, msg, x, y });
}
function areaCells(s: State, cx: number, cy: number, r: number): number[] {
  const out: number[] = [];
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) if (inb(s, x, y)) out.push(y * s.w + x);
  return out;
}

// Distance from every tile to the exit, ignoring obstacles (walls only). Used for
// progress scoring and as the solver's heuristic.
const distCache = new WeakMap<MapDef, Int16Array>();
export function exitDist(map: MapDef): Int16Array {
  let d = distCache.get(map);
  if (d) return d;
  const t = map.tiles.join('');
  d = new Int16Array(map.w * map.h).fill(-1);
  const q = [t.indexOf('E')];
  d[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % map.w, y = (i / map.w) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + DX[k], ny = y + DY[k];
      if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
      const j = ny * map.w + nx;
      if (d[j] >= 0 || t[j] === '#') continue;
      d[j] = d[i] + 1;
      q.push(j);
    }
  }
  distCache.set(map, d);
  return d;
}

// ---------- setup ----------

export function createRun(map: MapDef, loadout: string[]): State {
  let tiles = map.tiles.join('');
  const si = tiles.indexOf('S');
  tiles = tiles.replace('S', '.');
  const s: State = {
    map, w: map.w, h: map.h, tiles,
    px: si % map.w, py: (si / map.w) | 0,
    hp: START_HP, maxHp: START_HP, shield: 0, keys: 0, gold: 0,
    turn: 0, clock: 0, moves: 0, status: 'play',
    cards: loadout.map((id) => ({ id, charges: CARDS[id].charges })),
    inner: 0, frostbite: 0, venom: 0, veil: 0, stasis: 0, stun: false,
    enemies: map.enemies.map((e, i) => ({
      id: i, type: e.type, x: e.x, y: e.y, hp: ENEMIES[e.type].hp, armor: ENEMIES[e.type].armor ?? 0,
      dir: e.dir ?? 1, frozen: 0, sleep: 0, burn: 0, poison: 0, weaken: 0, charge: 0, awake: e.type !== 'mimic',
    })),
    blocks: map.blocks.map((b) => ({ ...b })),
    items: map.items.slice(),
    fires: [], gases: [], bait: null,
    kills: 0, style: 0, cardsUsed: 0, dmgTaken: 0, best: exitDist(map)[si],
    events: [], fx: 0,
  };
  updateMechs(s);
  return s;
}

function clone(s: State): State {
  return {
    ...s,
    cards: s.cards.map((c) => ({ ...c })),
    enemies: s.enemies.map((e) => ({ ...e })),
    blocks: s.blocks.map((b) => ({ ...b })),
    items: s.items.slice(),
    fires: s.fires.map((f) => ({ ...f })),
    gases: s.gases.map((g) => ({ ...g })),
    bait: s.bait ? { ...s.bait } : null,
    events: [],
    fx: 0,
  };
}

// ---------- the step function ----------

/** Returns the next state, or the same object if the action is not possible / has no effect. */
export function step(s0: State, a: Action): State {
  if (s0.status !== 'play') return s0;
  const s = clone(s0);
  let ok: boolean;
  if (a.t === 'wait') ok = true;
  else if (a.t === 'move') ok = doMove(s, a.d);
  else ok = doCard(s, a.c, a.d);
  if (!ok) return s0;
  s.moves++;
  if (s.status === 'play') {
    endTurn(s);
    if (s.stun && s.status === 'play') {
      ev(s, 'stun', 'You lose a turn!', s.px, s.py);
      endTurn(s);
    }
    s.stun = false;
  }
  return s;
}

// ---------- player movement ----------

function doMove(s: State, d: number): boolean {
  const nx = s.px + DX[d], ny = s.py + DY[d];
  if (!inb(s, nx, ny)) return false;
  const e = enemyAt(s, nx, ny);
  if (e) {
    bump(s, e, d);
    return true;
  }
  const i = ny * s.w + nx;
  const c = s.tiles[i];
  if (c === 'D' && s.keys > 0) {
    s.keys--;
    setTile(s, i, '.');
    ev(s, 'open', 'Unlocked the door.', nx, ny);
  } else if (!isWalk(c)) return false;
  const b = blockAt(s, nx, ny);
  if (b && !pushBlock(s, b, d)) return false;
  enter(s, nx, ny);
  return true;
}

function bump(s: State, e: Enemy, d: number) {
  const wasFrozen = e.frozen > 0;
  s.fx++;
  hitEnemy(s, e, { el: 'phys', dmg: 1 + (s.inner > 0 ? 2 : 0) });
  if (e.hp > 0 && s.inner > 0) hitEnemy(s, e, { el: 'fire', burn: 2 });
  if (e.hp > 0 && wasFrozen && e.frozen > 0) pushEnemy(s, e, d, 1);
}

function pushBlock(s: State, b: Block, d: number): boolean {
  const tx = b.x + DX[d], ty = b.y + DY[d];
  if (!inb(s, tx, ty) || enemyAt(s, tx, ty) || blockAt(s, tx, ty)) return false;
  if (s.items.some((it) => it.x === tx && it.y === ty)) return false;
  const i = ty * s.w + tx, c = s.tiles[i];
  const gone = () => { s.blocks = s.blocks.filter((o) => o !== b); };
  if (c === '~') { gone(); setTile(s, i, b.kind === 'crate' ? '=' : 'i'); ev(s, 'splash', 'It makes a bridge.', tx, ty); }
  else if (c === 'P') { gone(); setTile(s, i, '='); ev(s, 'splash', 'The pit is filled.', tx, ty); }
  else if (c === 'L') { gone(); ev(s, 'burn', 'It burns up in the lava.', tx, ty); }
  else if (isWalk(c) && c !== 'E') { b.x = tx; b.y = ty; }
  else return false;
  return true;
}

function enter(s: State, x: number, y: number) {
  s.px = x; s.py = y; s.fx++;
  const i = y * s.w + x;
  for (let k = s.items.length - 1; k >= 0; k--) {
    const it = s.items[k];
    if (it.x !== x || it.y !== y) continue;
    if (it.kind === 'potion') {
      if (s.hp >= s.maxHp) continue;
      s.hp = Math.min(s.maxHp, s.hp + 3);
      ev(s, 'heal', 'Potion: +3 HP.', x, y);
    } else if (it.kind === 'key') { s.keys++; ev(s, 'item', 'Picked up a key.', x, y); }
    else { const n = it.kind === 'chest' ? 3 : 1; s.gold += n; ev(s, 'item', `+${n} gold.`, x, y); }
    s.items.splice(k, 1);
  }
  const c = s.tiles[i];
  if (c === 'W') { setTile(s, i, '.'); s.stun = true; ev(s, 'web', 'Tangled in a web.', x, y); }
  if (c === 'E') { s.status = 'won'; ev(s, 'win', 'You found the stairs!', x, y); }
}

// ---------- damage and status ----------

function hurt(s: State, e: Enemy, amount: number, el: Hit['el'], direct: boolean, pierce = false) {
  const def = ENEMIES[e.type];
  if (def.quench) return;
  const r = def.res?.[el] ?? 1;
  if (r === 0) return;
  let dmg = r > 1 ? amount * 2 : r < 1 ? Math.ceil(amount / 2) : amount; // multiplier
  if (direct && !pierce) dmg -= e.armor; // then armor
  if (dmg <= 0) { ev(s, 'block', `${def.name}'s armor holds.`, e.x, e.y); return; }
  e.hp -= dmg;
  e.sleep = 0;
  s.fx++;
  ev(s, 'hit', `${def.name} takes ${dmg}.`, e.x, e.y);
  if (e.hp <= 0) kill(s, e, el);
}

function kill(s: State, e: Enemy, el: Hit['el'], silent = false) {
  const def = ENEMIES[e.type];
  e.hp = Math.min(e.hp, 0);
  s.enemies = s.enemies.filter((o) => o !== e);
  s.kills++;
  s.fx++;
  ev(s, 'kill', `${def.name} is destroyed.`, e.x, e.y);
  if (silent) return;
  if (def.deathCloud && el !== 'fire') addGas(s, e.x, e.y, 1, 3);
  if (def.ai === 'beetle' && e.frozen === 0) explode(s, e.x, e.y);
}

function explode(s: State, x: number, y: number) {
  ev(s, 'boom', 'BOOM!', x, y);
  const before = s.kills;
  for (const i of areaCells(s, x, y, 1)) applyHit(s, i, { el: 'fire', dmg: 3, blast: true });
  if (s.kills > before) s.style++;
  if (cheb(x, y, s.px, s.py) <= 1) hitPlayer(s, 3, undefined, 'The blast');
}

function hitEnemy(s: State, e: Enemy, hit: Hit, d?: number) {
  const def = ENEMIES[e.type];
  if (e.type === 'mimic' && !e.awake) { e.awake = true; s.fx++; ev(s, 'wake', 'The chest has teeth!', e.x, e.y); }
  if (def.quench) {
    if (hit.el === 'frost') { s.style++; kill(s, e, 'frost'); }
    return;
  }
  if ((def.res?.[hit.el] ?? 1) === 0) { ev(s, 'immune', `${def.name} is immune.`, e.x, e.y); return; }
  switch (hit.special) {
    case 'shatter':
      if (e.frozen > 0) { e.frozen = 0; s.style++; ev(s, 'combo', 'SHATTER!', e.x, e.y); hurt(s, e, 5, 'frost', true, true); }
      else hurt(s, e, hit.dmg ?? 1, 'frost', true);
      break;
    case 'combust':
      if (e.burn > 0) { const n = 2 + 2 * e.burn; e.burn = 0; s.style++; ev(s, 'combo', 'COMBUST!', e.x, e.y); hurt(s, e, n, 'fire', true, true); }
      else hurt(s, e, hit.dmg ?? 1, 'fire', true);
      break;
    case 'catalyst':
      if (e.poison > 0) { e.poison = Math.min(12, e.poison * 2); s.style++; s.fx++; ev(s, 'combo', 'CATALYST!', e.x, e.y); hurt(s, e, e.poison, 'poison', false); }
      break;
    case 'contagion': {
      e.poison = Math.min(12, e.poison + 2);
      s.fx++;
      let spread = 0;
      for (const o of s.enemies) {
        if (o === e || cheb(o.x, o.y, e.x, e.y) > 3 || ENEMIES[o.type].quench || ENEMIES[o.type].res?.poison === 0) continue;
        if (o.poison < e.poison) { o.poison = e.poison; spread++; }
      }
      if (spread >= 2) s.style++;
      ev(s, 'status', `Contagion spreads to ${spread}.`, e.x, e.y);
      break;
    }
    default:
      if (hit.dmg) hurt(s, e, hit.dmg, hit.el, true);
  }
  if (e.hp <= 0) return;
  if (hit.el === 'fire' && e.frozen > 0) { e.frozen = 0; s.fx++; }
  if (hit.burn) { e.burn = Math.max(e.burn, hit.burn); s.fx++; }
  if (hit.freeze) { e.frozen = Math.max(e.frozen, hit.freeze); e.burn = 0; e.charge = 0; s.fx++; ev(s, 'status', `${def.name} is frozen.`, e.x, e.y); }
  if (hit.poison) { e.poison = Math.min(12, e.poison + hit.poison); s.fx++; }
  if (hit.sleep) { e.sleep = Math.max(e.sleep, hit.sleep); s.fx++; ev(s, 'status', `${def.name} falls asleep.`, e.x, e.y); }
  if (hit.weaken) { e.weaken = Math.max(e.weaken, hit.weaken); s.fx++; }
  if (hit.strip && e.armor > 0) { e.armor = 0; s.fx++; ev(s, 'status', `${def.name}'s armor melts away.`, e.x, e.y); }
  if (hit.push && d !== undefined) pushEnemy(s, e, d, hit.push);
}

function pushEnemy(s: State, e: Enemy, d: number, n: number) {
  if (ENEMIES[e.type].heavy) return;
  for (let k = 0; k < n; k++) {
    const nx = e.x + DX[d], ny = e.y + DY[d];
    if (!inb(s, nx, ny) || (nx === s.px && ny === s.py) || enemyAt(s, nx, ny) || blockAt(s, nx, ny)) return;
    const c = s.tiles[ny * s.w + nx];
    if (c === '~' || c === 'L' || c === 'P') {
      s.style++;
      ev(s, 'combo', `${ENEMIES[e.type].name} is shoved in!`, nx, ny);
      kill(s, e, 'phys', true);
      return;
    }
    if (!isWalk(c) || c === 'E') return;
    e.x = nx; e.y = ny; s.fx++;
  }
}

function hitPlayer(s: State, amount: number, e?: Enemy, source?: string) {
  let dmg = amount;
  if (e && e.weaken > 0) dmg -= 2;
  if (dmg <= 0) return;
  const blocked = Math.min(s.shield, dmg);
  s.shield -= blocked;
  dmg -= blocked;
  if (dmg > 0) { s.hp -= dmg; s.dmgTaken += dmg; }
  const who = e ? ENEMIES[e.type].name : source ?? 'Something';
  ev(s, 'hurt', dmg > 0 ? `${who} hits you for ${dmg}.` : `Your shield absorbs ${who}'s hit.`, s.px, s.py);
  if (e && e.hp > 0) {
    if (ENEMIES[e.type].chillTouch && s.inner === 0 && dmg > 0) s.stun = true;
    if (s.frostbite > 0) hitEnemy(s, e, { el: 'frost', freeze: 2 });
    if (s.venom > 0 && e.hp > 0) hitEnemy(s, e, { el: 'poison', poison: 3 });
  }
}

// ---------- terrain ----------

/** What a tile turns into when hit; undefined = no reaction. '*' = oil igniting. */
function reaction(c: string, hit: Hit): string | undefined {
  if (hit.el === 'fire') {
    if (c === 'B' || c === 'W' || c === 'I') return '.';
    if (c === 'T') return 't';
    if (c === 'O') return '*';
  } else if (hit.el === 'frost') {
    if (c === '~') return 'i';
    if (c === 'L') return 'o';
    if (c === '^') return 'x';
    if (c === 'V') return 'v';
    if (c === 't') return 'T';
  } else if (hit.el === 'poison') {
    if (c === 'B') return '.';
    if (hit.corrode && (c === 'R' || c === 'D')) return '.';
  }
  if (hit.blast && c === 'C') return '.';
  return undefined;
}

function addFire(s: State, i: number, ttl: number) {
  const f = s.fires.find((o) => o.i === i);
  if (f) f.ttl = Math.max(f.ttl, ttl);
  else s.fires.push({ i, ttl });
  s.fx++;
}
function addGas(s: State, x: number, y: number, r: number, ttl: number) {
  for (const i of areaCells(s, x, y, r)) {
    if (isSolid(s.tiles[i])) continue;
    const g = s.gases.find((o) => o.i === i);
    if (g) g.ttl = Math.max(g.ttl, ttl);
    else s.gases.push({ i, ttl });
    s.fx++;
  }
}
function ignite(s: State, i: number) {
  setTile(s, i, '.');
  addFire(s, i, 3);
  const x = i % s.w, y = (i / s.w) | 0;
  for (let k = 0; k < 4; k++) {
    const nx = x + DX[k], ny = y + DY[k];
    if (inb(s, nx, ny) && s.tiles[ny * s.w + nx] === 'O') ignite(s, ny * s.w + nx);
  }
}

/** Apply a hit to one tile: the enemy on it, a block on it, and the terrain itself. */
function applyHit(s: State, i: number, hit: Hit, d?: number) {
  const x = i % s.w, y = (i / s.w) | 0;
  const e = enemyAt(s, x, y);
  if (e) hitEnemy(s, e, hit, d);
  const b = blockAt(s, x, y);
  if (b && (hit.el === 'fire' || hit.blast || (hit.corrode && b.kind === 'crate'))) {
    s.blocks = s.blocks.filter((o) => o !== b);
    s.fx++;
    ev(s, 'break', b.kind === 'crate' ? 'The crate is destroyed.' : 'The ice block melts.', x, y);
  }
  if (hit.el === 'fire' && s.gases.some((g) => g.i === i)) { s.gases = s.gases.filter((g) => g.i !== i); s.fx++; }
  if (hit.el === 'frost' && fireAt(s, i)) { s.fires = s.fires.filter((f) => f.i !== i); s.fx++; }
  const r = reaction(s.tiles[i], hit);
  if (r === '*') ignite(s, i);
  else if (r !== undefined) setTile(s, i, r);
}

function occupied(s: State, i: number): boolean {
  const x = i % s.w, y = (i / s.w) | 0;
  return (s.px === x && s.py === y) || !!enemyAt(s, x, y) || !!blockAt(s, x, y);
}

function updateMechs(s: State) {
  for (const m of s.map.mechs) {
    const active = m.sources.every((i) => (m.kind === 'brazier' ? s.tiles[i] === 't' : occupied(s, i)));
    for (const g of m.gates) {
      const c = s.tiles[g];
      if (active && c === 'G') { setTile(s, g, 'g'); ev(s, 'gate', 'A gate grinds open.', g % s.w, (g / s.w) | 0); }
      else if (!active && c === 'g' && !occupied(s, g)) { setTile(s, g, 'G'); ev(s, 'gate', 'A gate slams shut.', g % s.w, (g / s.w) | 0); }
    }
  }
}

// ---------- cards ----------

function doCard(s: State, ci: number, d: number): boolean {
  const slot = s.cards[ci];
  if (!slot || slot.charges <= 0) return false;
  const def = CARDS[slot.id];
  if (def.shape === 'passive') return false;
  const hit: Hit = { el: def.el, ...def.hit };
  const dx = DX[d], dy = DY[d];
  s.fx = 0;
  switch (def.shape) {
    case 'bolt': {
      let x = s.px, y = s.py, target = -1, prev = y * s.w + x;
      for (let k = 0; k < def.range!; k++) {
        x += dx; y += dy;
        if (!inb(s, x, y)) break;
        if (target >= 0) prev = target;
        target = y * s.w + x;
        const c = s.tiles[target];
        if (enemyAt(s, x, y) || blockAt(s, x, y) || isSolid(c) || reaction(c, hit) !== undefined) break;
        if (hit.el === 'frost' && fireAt(s, target)) break;
      }
      if (target < 0) break;
      if (def.radius || def.cloud) {
        const center = s.tiles[target] === '#' ? prev : target; // splash never centers inside a wall
        const cx = center % s.w, cy = (center / s.w) | 0;
        if (def.cloud) addGas(s, cx, cy, 1, def.cloud);
        for (const i of areaCells(s, cx, cy, def.radius ?? 1)) applyHit(s, i, hit);
        if (def.radius && hit.dmg && cheb(cx, cy, s.px, s.py) <= def.radius) hitPlayer(s, hit.dmg, undefined, def.name);
      } else applyHit(s, target, hit, d);
      break;
    }
    case 'line': {
      const cells: number[] = [];
      let x = s.px, y = s.py;
      for (let k = 0; k < def.range!; k++) {
        x += dx; y += dy;
        if (!inb(s, x, y)) break;
        cells.push(y * s.w + x);
        if (isSolid(s.tiles[y * s.w + x]) || blockAt(s, x, y)) break;
      }
      if (hit.push) cells.reverse(); // push the far enemies first so they do not collide
      for (const i of cells) applyHit(s, i, hit, d);
      break;
    }
    case 'burst':
      for (const i of areaCells(s, s.px, s.py, def.radius!)) if (i !== s.py * s.w + s.px) applyHit(s, i, hit);
      break;
    case 'self':
      for (const [k, v] of Object.entries(def.buff!)) {
        const key = k as keyof NonNullable<typeof def.buff>;
        s[key] = key === 'shield' ? Math.min(6, s.shield + v) : Math.max(s[key], v);
      }
      s.fx++;
      break;
    case 'dash': {
      const path: number[] = [];
      let x = s.px, y = s.py, land = 0;
      for (let k = 1; k <= def.range!; k++) {
        x += dx; y += dy;
        if (!inb(s, x, y)) break;
        const c = s.tiles[y * s.w + x];
        if (isSolid(c) || c === '~' || c === 'L' || enemyAt(s, x, y) || blockAt(s, x, y)) break;
        path.push(y * s.w + x);
        if (isWalk(c)) land = k;
      }
      if (!land) break;
      const trail = [s.py * s.w + s.px, ...path.slice(0, land - 1)];
      const li = path[land - 1];
      enter(s, li % s.w, (li / s.w) | 0);
      for (const i of trail) if (isWalk(s.tiles[i]) && s.tiles[i] !== 'E') addFire(s, i, def.ttl!);
      break;
    }
    case 'skate': {
      for (let n = 0; n < 12; n++) {
        const x = s.px + dx, y = s.py + dy;
        if (!inb(s, x, y) || enemyAt(s, x, y) || blockAt(s, x, y)) break;
        const i = y * s.w + x;
        if (s.tiles[i] === '~') setTile(s, i, 'i');
        else if (!isWalk(s.tiles[i])) break;
        enter(s, x, y);
        if (s.status === 'won' || s.stun) break;
      }
      break;
    }
    case 'conjure': {
      const x = s.px + dx, y = s.py + dy;
      if (!inb(s, x, y) || enemyAt(s, x, y) || blockAt(s, x, y)) break;
      if (s.items.some((it) => it.x === x && it.y === y)) break;
      const i = y * s.w + x, c = s.tiles[i];
      if (c === '~') setTile(s, i, 'i');
      else if (!isWalk(c) || c === 'E') break;
      s.blocks.push({ x, y, kind: 'ice' });
      s.fx++;
      break;
    }
    case 'bait': {
      let x = s.px, y = s.py, land = -1;
      for (let k = 0; k < def.range!; k++) {
        x += dx; y += dy;
        if (!inb(s, x, y) || isSolid(s.tiles[y * s.w + x]) || enemyAt(s, x, y) || blockAt(s, x, y)) break;
        if (isWalk(s.tiles[y * s.w + x])) land = y * s.w + x;
      }
      if (land < 0) break;
      s.bait = { i: land, ttl: 6 };
      s.fx++;
      break;
    }
    case 'wall': {
      let x = s.px, y = s.py;
      for (let k = 0; k < def.range!; k++) {
        x += dx; y += dy;
        if (!inb(s, x, y)) break;
        const i = y * s.w + x;
        const stop = isSolid(s.tiles[i]) || !!blockAt(s, x, y);
        applyHit(s, i, hit);
        if (stop) break;
        if (isWalk(s.tiles[i]) && s.tiles[i] !== 'E') addFire(s, i, def.ttl!);
      }
      break;
    }
  }
  if (s.fx === 0) return false; // fizzle: nothing happened, so nothing is spent
  slot.charges--;
  s.cardsUsed++;
  ev(s, 'card', `You use ${def.name}.`, s.px, s.py);
  return true;
}

// ---------- enemies ----------

function enemyPassable(s: State, x: number, y: number): boolean {
  const i = y * s.w + x, c = s.tiles[i];
  return isWalk(c) && c !== 'E' && c !== '^' && !fireAt(s, i) && !blockAt(s, x, y);
}

/** Walking distance from (tx,ty) outward for enemies, up to max steps. -1 = unreachable. */
function field(s: State, tx: number, ty: number, max: number): Int8Array {
  const f = new Int8Array(s.w * s.h).fill(-1);
  const q = [ty * s.w + tx];
  f[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    if (f[i] >= max) continue;
    const x = i % s.w, y = (i / s.w) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + DX[k], ny = y + DY[k];
      if (!inb(s, nx, ny)) continue;
      const j = ny * s.w + nx;
      if (f[j] >= 0 || !enemyPassable(s, nx, ny)) continue;
      f[j] = f[i] + 1;
      q.push(j);
    }
  }
  return f;
}

function lineClear(s: State, e: Enemy, range: number): boolean {
  if (e.x !== s.px && e.y !== s.py) return false;
  const n = manh(e.x, e.y, s.px, s.py);
  if (n > range) return false;
  const dx = Math.sign(s.px - e.x), dy = Math.sign(s.py - e.y);
  for (let k = 1; k < n; k++) {
    const x = e.x + dx * k, y = e.y + dy * k;
    if (isSolid(s.tiles[y * s.w + x]) || blockAt(s, x, y) || enemyAt(s, x, y)) return false;
  }
  return true;
}

function enemyPhase(s: State) {
  let pf: Int8Array | undefined, bf: Int8Array | undefined;
  const visible = s.veil === 0;
  for (const e of s.enemies.slice()) {
    if (e.hp <= 0) continue;
    const def = ENEMIES[e.type];
    // damage over time
    if (e.burn > 0) { e.burn--; hurt(s, e, 1, 'fire', false); if (e.hp <= 0) continue; }
    if (e.poison > 0) { const p = e.poison; e.poison--; hurt(s, e, p, 'poison', false); if (e.hp <= 0) continue; }
    if (def.regen && e.burn === 0 && e.poison === 0 && e.hp < def.hp) e.hp++;
    if (e.weaken > 0) e.weaken--;
    if (e.frozen > 0) { e.frozen--; continue; }
    if (e.sleep > 0) { e.sleep--; continue; }
    if ((s.clock + e.id) % def.speed !== 0) continue;
    const adjacent = manh(e.x, e.y, s.px, s.py) === 1;

    if (def.ai === 'guard') {
      if (adjacent && visible) hitPlayer(s, def.atk, e);
      continue;
    }
    if (def.ai === 'patrol') {
      if (manh(e.x, e.y, s.px, s.py) > 8) continue;
      for (let tries = 0; tries < 2; tries++) {
        const nx = e.x + DX[e.dir], ny = e.y + DY[e.dir];
        if (nx === s.px && ny === s.py) { if (visible) hitPlayer(s, def.atk, e); break; }
        if (inb(s, nx, ny) && !isSolid(s.tiles[ny * s.w + nx]) && !enemyAt(s, nx, ny) && !blockAt(s, nx, ny)) { e.x = nx; e.y = ny; break; }
        e.dir = (e.dir + 2) % 4;
      }
      continue;
    }
    if (def.ai === 'turret') {
      if (visible && lineClear(s, e, def.range!)) {
        if (e.charge) { e.charge = 0; ev(s, 'shot', undefined, e.x, e.y); hitPlayer(s, def.atk, e); }
        else { e.charge = 1; ev(s, 'charge', `${def.name} takes aim!`, e.x, e.y); }
      } else e.charge = 0;
      continue;
    }
    if (def.ai === 'mimic' && !e.awake) {
      if (visible && cheb(e.x, e.y, s.px, s.py) <= 1) { e.awake = true; ev(s, 'wake', 'The chest has teeth!', e.x, e.y); }
      continue;
    }
    if (def.ai === 'beetle') {
      if (e.charge) { kill(s, e, 'fire'); continue; }
      if (adjacent && visible) { e.charge = 1; ev(s, 'charge', 'The beetle lights its fuse!', e.x, e.y); continue; }
    }
    // chasing: bait first, then the player
    const aggro = def.aggro!;
    let f: Int8Array | undefined;
    if (s.bait) {
      const bx = s.bait.i % s.w, by = (s.bait.i / s.w) | 0;
      if (manh(e.x, e.y, bx, by) <= 6) {
        bf ??= field(s, bx, by, 6);
        const d = bf[e.y * s.w + e.x];
        if (d >= 0 || manh(e.x, e.y, bx, by) <= 1) { if (d <= 1) continue; f = bf; }
      }
    }
    if (!f) {
      if (!visible) continue;
      if (adjacent) { if (def.ai !== 'beetle') hitPlayer(s, def.atk, e); continue; }
      if (manh(e.x, e.y, s.px, s.py) > aggro) continue;
      pf ??= field(s, s.px, s.py, 9);
      f = pf;
    }
    const d = f[e.y * s.w + e.x];
    if (d < 0 || (f === pf && d > aggro)) continue;
    for (let k = 0; k < 4; k++) {
      const nx = e.x + DX[k], ny = e.y + DY[k];
      if (!inb(s, nx, ny)) continue;
      const nd = f[ny * s.w + nx];
      if (nd < 0 || nd >= d || enemyAt(s, nx, ny) || (nx === s.px && ny === s.py)) continue;
      e.x = nx; e.y = ny;
      break;
    }
  }
}

function endTurn(s: State) {
  s.turn++;
  if (s.stasis > 0) s.stasis--;
  else {
    s.clock++;
    enemyPhase(s);
    for (const e of s.enemies.slice()) {
      const i = e.y * s.w + e.x;
      if (fireAt(s, i)) hitEnemy(s, e, { el: 'fire', dmg: 1, burn: 2 });
      // only gas clouds poison enemies; dungeon dwellers are used to the vents
      if (e.hp > 0 && s.gases.some((g) => g.i === i)) hitEnemy(s, e, { el: 'poison', poison: 1 });
    }
    for (const f of s.fires) f.ttl--;
    s.fires = s.fires.filter((f) => f.ttl > 0);
    for (const g of s.gases) g.ttl--;
    s.gases = s.gases.filter((g) => g.ttl > 0);
    if (s.bait && --s.bait.ttl <= 0) s.bait = null;
  }
  const pi = s.py * s.w + s.px;
  if (s.tiles[pi] === '^' && spikesUp(s.clock)) hitPlayer(s, 2, undefined, 'The spike trap');
  if (fireAt(s, pi)) hitPlayer(s, 2, undefined, 'The fire');
  if (s.venom === 0 && gasAt(s, pi)) hitPlayer(s, 1, undefined, 'The gas');
  if (s.inner > 0) s.inner--;
  if (s.frostbite > 0) s.frostbite--;
  if (s.venom > 0) s.venom--;
  if (s.veil > 0) s.veil--;
  updateMechs(s);
  if (s.hp <= 0) {
    const feather = s.cards.find((c) => c.id === 'phoenix_feather' && c.charges > 0);
    if (feather) {
      feather.charges--; s.cardsUsed++; s.hp = 4; s.style++;
      ev(s, 'combo', 'The Phoenix Feather burns away. You rise!', s.px, s.py);
      for (const i of areaCells(s, s.px, s.py, 1)) if (i !== pi) applyHit(s, i, { el: 'fire', dmg: 2, burn: 2 });
    } else {
      s.status = 'dead';
      ev(s, 'dead', 'You have fallen.', s.px, s.py);
    }
  }
  s.best = Math.min(s.best, exitDist(s.map)[pi]);
}

// ---------- replays ----------

/** Compact replay code: N/E/S/W = move, '.' = wait, digit+direction = card slot. */
export function encode(a: Action): string {
  return a.t === 'wait' ? '.' : a.t === 'move' ? DIRS[a.d] : `${a.c}${DIRS[a.d]}`;
}
export function decode(code: string): Action[] {
  const out: Action[] = [];
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '.') out.push({ t: 'wait' });
    else if (ch >= '0' && ch <= '9') out.push({ t: 'card', c: +ch, d: DIRS.indexOf(code[++i]) });
    else out.push({ t: 'move', d: DIRS.indexOf(ch) });
  }
  return out;
}
export function replay(map: MapDef, loadout: string[], code: string): State {
  let s = createRun(map, loadout);
  for (const a of decode(code)) s = step(s, a);
  return s;
}
