// The bot. A weighted A* search over real engine states. If it returns a solution, the
// dungeon is provably beatable with that loadout, and the solution doubles as a replay.
// It is not guaranteed optimal, so "par" means "best the bot found". A null result means
// "the bot could not do it within its budget", which the generator treats as a loss.

import type { Action, Answer, MapDef, State } from './types.ts';
import { CARDS } from './cards.ts';
import { createRun, encode, exitDist, step, DX, DY } from './engine.ts';

interface Node { s: State; g: number; f: number; n: number; parent: Node | null; a: string }

export const solverStats = { nodes: 0 };

// Tile strings are interned so state keys stay short (tiles rarely change between steps).
let tileIds = new Map<string, number>();

/** Everything about a state except the spendable resources (HP, shield, keys, charges). */
function key(s: State, timers: boolean): string {
  let near = timers || s.fires.length > 0 || s.gases.length > 0 || s.bait !== null || s.stasis > 0;
  let k = `${s.px},${s.py}|${s.inner},${s.frostbite},${s.venom},${s.veil},${s.stasis}|`;
  for (const e of s.enemies) {
    k += `${e.x},${e.y},${e.hp},${e.frozen},${e.sleep},${e.burn},${e.poison},${e.weaken},${e.armor},${e.dir},${e.charge},${e.awake ? 1 : 0};`;
    if (Math.abs(e.x - s.px) + Math.abs(e.y - s.py) <= 10) near = true;
  }
  k += '|';
  for (const b of s.blocks) k += `${b.x},${b.y};`;
  k += '|';
  for (const it of s.items) k += `${it.x * 64 + it.y},`;
  k += '|';
  for (const f of s.fires) k += `${f.i}:${f.ttl};`;
  for (const g of s.gases) k += `${g.i}:${g.ttl};`;
  if (s.bait) k += `b${s.bait.i}:${s.bait.ttl}`;
  if (near) k += `|${s.clock % 12}`;
  let t = tileIds.get(s.tiles);
  if (t === undefined) { t = tileIds.size; tileIds.set(s.tiles, t); }
  return k + '|' + t;
}

const resources = (s: State) => [s.hp, s.shield, s.keys, ...s.cards.map((c) => c.charges)];

const enemyNear = (s: State, r: number) => s.enemies.some((e) => Math.abs(e.x - s.px) + Math.abs(e.y - s.py) <= r);

/** Skip card plays that are legal but pointless, so the search stays small. */
function pointless(before: State, after: State, a: Action): boolean {
  if (a.t !== 'card' || enemyNear(before, 7)) return false;
  const def = CARDS[before.cards[a.c].id];
  if (def.shape === 'self') return !def.buff!.stasis;
  if (def.shape === 'conjure') {
    for (const m of before.map.mechs) if (m.kind === 'plate')
      for (const i of m.sources) if (Math.abs((i % before.w) - before.px) + Math.abs(((i / before.w) | 0) - before.py) <= 5) return false;
    return true;
  }
  if (def.shape === 'dash') { // only worth it when it jumps something
    for (let x = before.px + DX[a.d], y = before.py + DY[a.d]; x !== after.px || y !== after.py; x += DX[a.d], y += DY[a.d]) {
      const c = before.tiles[y * before.w + x];
      if (c === 'P' || c === '^' || c === 'W') return false;
    }
    return true;
  }
  return after.tiles === before.tiles && after.blocks.length === before.blocks.length;
}

export function solve(map: MapDef, loadout: string[], maxNodes = 15000, weight = 2): Answer | null {
  const dist = exitDist(map);
  const start = createRun(map, loadout);
  const timers = /[\^V]/.test(start.tiles);
  tileIds = new Map();
  const heap: Node[] = [];
  let counter = 0;
  const less = (a: Node, b: Node) => a.f < b.f || (a.f === b.f && a.n < b.n);
  const push = (n: Node) => {
    heap.push(n);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!less(heap[i], heap[p])) break;
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  };
  const pop = (): Node => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    }
    return top;
  };
  // Dominance: a state is skipped if we already reached the same situation with at
  // least as much HP, shield, keys and charges on every card.
  const seen = new Map<string, number[][]>();
  const dominated = (s: State): boolean => {
    const k = key(s, timers), r = resources(s);
    const list = seen.get(k);
    if (!list) { seen.set(k, [r]); return false; }
    for (const o of list) if (o.every((v, i) => v >= r[i])) return true;
    seen.set(k, [...list.filter((o) => !o.every((v, i) => v <= r[i])), r]);
    return false;
  };
  dominated(start);
  push({ s: start, g: 0, f: 0, n: counter++, parent: null, a: '' });
  let expanded = 0;
  const actions: Action[] = [];
  while (heap.length && expanded < maxNodes) {
    const node = pop();
    const s = node.s;
    solverStats.nodes = ++expanded;
    actions.length = 0;
    for (let d = 0; d < 4; d++) actions.push({ t: 'move', d });
    if (timers || s.fires.length > 0 || s.gases.length > 0 || enemyNear(s, 7)) actions.push({ t: 'wait' });
    for (let c = 0; c < s.cards.length; c++) {
      if (s.cards[c].charges <= 0) continue;
      const shape = CARDS[s.cards[c].id].shape;
      if (shape === 'passive') continue;
      for (let d = 0; d < (shape === 'self' || shape === 'burst' ? 1 : 4); d++) actions.push({ t: 'card', c, d });
    }
    for (const a of actions) {
      const ns = step(s, a);
      if (ns === s || ns.status === 'dead' || pointless(s, ns, a)) continue;
      const child: Node = { s: ns, g: node.g + 1, f: 0, n: counter++, parent: node, a: encode(a) };
      if (ns.status === 'won') {
        const parts: string[] = [];
        for (let p: Node | null = child; p && p.parent; p = p.parent) parts.push(p.a);
        return { cards: loadout, moves: child.g, actions: parts.reverse().join('') };
      }
      if (dominated(ns)) continue;
      child.f = child.g + weight * dist[ns.py * ns.w + ns.px];
      push(child);
    }
  }
  return null;
}
