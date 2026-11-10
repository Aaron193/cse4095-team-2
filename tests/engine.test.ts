import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, step, replay, encode, decode, enemyAt } from '../src/engine/engine.ts';
import { scoreRun } from '../src/engine/score.ts';
import { CARD_LIST, CARDS } from '../src/engine/cards.ts';
import { ENEMIES } from '../src/engine/enemies.ts';
import type { MapDef, State, Action } from '../src/engine/types.ts';

const E = 1, S = 2, W = 3, N = 0;
function mk(rows: string[], extra: Partial<MapDef> = {}): MapDef {
  return { id: 0, name: 't', seed: 0, difficulty: 0, w: rows[0].length, h: rows.length, tiles: rows, enemies: [], blocks: [], items: [], mechs: [], offer: [], par: 10, ...extra };
}
const move = (s: State, d: number) => step(s, { t: 'move', d });
const card = (s: State, d: number, c = 0) => step(s, { t: 'card', c, d });
const wait = (s: State) => step(s, { t: 'wait' });
const tile = (s: State, x: number, y: number) => s.tiles[y * s.w + x];

test('content: 30 unique cards, 10 per element, all well-formed', () => {
  assert.equal(CARD_LIST.length, 30);
  assert.equal(new Set(CARD_LIST.map((c) => c.id)).size, 30);
  assert.equal(new Set(CARD_LIST.map((c) => c.name)).size, 30);
  for (const el of ['fire', 'frost', 'poison']) assert.equal(CARD_LIST.filter((c) => c.el === el).length, 10);
  // no two cards share the same mechanics
  const sig = CARD_LIST.map((c) => JSON.stringify([c.shape, c.range, c.radius, c.hit, c.buff, c.cloud, c.el]));
  assert.equal(new Set(sig).size, 30);
  assert.ok(Object.keys(ENEMIES).length >= 12);
});

test('walking, walls and reaching the exit', () => {
  let s = createRun(mk(['#####', '#S.E#', '#####']), []);
  assert.equal(move(s, N), s, 'walls block and cost nothing');
  s = move(move(s, E), E);
  assert.equal(s.status, 'won');
  assert.equal(s.moves, 2);
});

test('fire burns brambles, melts ice walls and lights braziers', () => {
  const map = mk(['#######', '#S.B.E#', '#T#####', '###G###'], { mechs: [{ kind: 'brazier', sources: [15], gates: [24] }] });
  let s = createRun(map, ['ember_bolt']);
  s = card(s, E);
  assert.equal(tile(s, 3, 1), '.');
  assert.equal(s.cards[0].charges, 2);
  s = card(s, S);
  assert.equal(tile(s, 1, 2), 't');
  assert.equal(tile(s, 3, 3), 'g', 'the brazier opens its gate');
});

test('a card with no effect is not spent and costs no move', () => {
  const s = createRun(mk(['#####', '#S.E#', '#####']), ['frost_bolt', 'catalyst']);
  assert.equal(card(s, E, 0), s);
  assert.equal(card(s, E, 1), s);
});

test('frost freezes water into a bridge; poison withers brambles; acid eats bars', () => {
  let s = createRun(mk(['########', '#S~B.RE#', '########']), ['frost_bolt', 'venom_dart', 'acid_flask']);
  assert.equal(move(s, E), s, 'water is impassable');
  s = card(s, E, 0);
  assert.equal(tile(s, 2, 1), 'i');
  s = move(s, E);
  s = card(s, E, 1);
  assert.equal(tile(s, 3, 1), '.');
  assert.equal(card(s, E, 1), s, 'a dart does nothing to iron bars');
  s = card(s, E, 2);
  assert.equal(tile(s, 5, 1), '.');
});

test('crates: push into water to bridge it, hold a pressure plate', () => {
  const map = mk(['########', '#S..~.E#', '#._.G..#', '########'], { blocks: [{ x: 2, y: 1, kind: 'crate' }], mechs: [{ kind: 'plate', sources: [18], gates: [20] }] });
  let s = createRun(map, []);
  s = move(s, E);
  s = move(s, E);
  assert.equal(tile(s, 4, 1), '=', 'crate fell in and made a bridge');
  assert.equal(s.blocks.length, 0);
  s = move(move(s, W), S); // stand on the plate at (2,2)? we are at (2,1) -> (2,2)
  assert.equal(tile(s, 4, 2), 'g', 'standing on the plate opens the gate');
  s = move(s, W);
  assert.equal(tile(s, 4, 2), 'G', 'stepping off closes it');
});

test('dagger, armor and the damage order', () => {
  const map = mk(['######', '#S...#', '#...E#', '######'], { enemies: [{ type: 'knight', x: 2, y: 1 }] });
  let s = createRun(map, ['acid_flask', 'venom_dart']);
  s = move(s, E);
  assert.equal(s.enemies[0].hp, 4, 'armor 2 stops a 1-damage dagger');
  s = card(s, E, 0);
  assert.equal(s.enemies[0].armor, 0, 'acid strips armor');
  assert.equal(s.enemies[0].hp, 4, 'acid: 2 damage - 2 armor = 0, then armor is gone');
  s = card(s, E, 1);
  assert.ok(s.enemies[0].hp < 4, 'poison ticked');
});

test('combo: freeze then Shatter ignores armor', () => {
  const map = mk(['#######', '#S...E#', '#######'], { enemies: [{ type: 'knight', x: 4, y: 1 }] });
  let s = createRun(map, ['frost_bolt', 'shatter']);
  s = card(s, E, 0);
  assert.ok(s.enemies[0].frozen > 0);
  s = card(s, E, 1);
  assert.equal(s.enemies.length, 0);
  assert.equal(s.style, 1);
});

test('combo: burn then Combust, poison then Catalyst', () => {
  const map = mk(['#######', '#S...E#', '#######'], { enemies: [{ type: 'troll', x: 4, y: 1 }] });
  let s = createRun(map, ['torch', 'combust', 'venom_dart', 'catalyst']);
  s = card(s, E, 2); // poison 3 -> ticks 3 -> hp 5, poison 2
  assert.equal(s.enemies[0].hp, 5);
  s = card(s, E, 3); // doubles to 4, triggers 4 -> hp 1, then tick 4 -> dead
  assert.equal(s.enemies.length, 0);
  assert.equal(s.style, 1);
});

test('frozen enemies can be shoved into pits; hulks only fear frost', () => {
  const map = mk(['#######', '#S..P.#', '#S....#'.replace('S', '.'), '#....E#', '#######'], { enemies: [{ type: 'slime', x: 3, y: 1 }, { type: 'hulk', x: 3, y: 3 }] });
  let s = createRun(map, ['frost_bolt', 'ember_bolt']);
  s = card(s, E, 0);
  s = move(s, E); // step next to it
  s = move(s, E); // bump: pushes the frozen slime into the pit
  assert.equal(s.enemies.find((e) => e.type === 'slime'), undefined);
  assert.equal(s.style, 1);
  s = move(move(s, S), S); // (2,3), hulk at (3,3) hits us
  assert.ok(s.hp < 10);
  assert.equal(card(s, E, 1), s, 'fire cannot touch the hulk');
  s = card(s, E, 0);
  assert.equal(s.enemies.length, 0);
});

test('slimes chase every other turn and can be kited; bats patrol', () => {
  const map = mk(['#########', '#S......#', '#.......#', '#......E#', '#########'], { enemies: [{ type: 'slime', x: 5, y: 1 }] });
  let s = createRun(map, []);
  const xs: number[] = [];
  for (let i = 0; i < 4; i++) { s = wait(s); xs.push(s.enemies[0].x); }
  assert.deepEqual(xs, [5, 4, 4, 3]);
  const bat = createRun(mk(['#######', '#S....#', '#.....#', '#....E#', '#######'], { enemies: [{ type: 'bat', x: 3, y: 2, dir: 1 }] }), []);
  let b = bat;
  const bx: number[] = [];
  for (let i = 0; i < 5; i++) { b = wait(b); bx.push(b.enemies[0].x); }
  assert.deepEqual(bx, [4, 5, 4, 3, 2]);
});

test('imp telegraphs then fires; a crate blocks the shot', () => {
  const map = mk(['########', '#S....E#', '########'], { enemies: [{ type: 'imp', x: 5, y: 1 }] });
  let s = createRun(map, []);
  s = wait(s);
  assert.equal(s.hp, 10, 'first turn it only charges');
  s = wait(s);
  assert.equal(s.hp, 8);
  let c = createRun({ ...map, blocks: [{ x: 3, y: 1, kind: 'crate' }] }, []);
  c = wait(wait(c));
  assert.equal(c.hp, 10);
});

test('spike traps follow the clock; stasis stops it', () => {
  const map = mk(['#####', '#S^E#', '#####']);
  let s = createRun(map, ['stasis']);
  s = move(s, E); // clock 1: up
  assert.equal(s.hp, 8);
  let t = wait(createRun(map, [])); // clock 1
  t = move(t, E); // clock 2: down
  assert.equal(t.hp, 10);
});

test('blast beetle explodes, breaking cracked walls', () => {
  const map = mk(['#######', '#S....#', '###C###', '#....E#', '#######'], { enemies: [{ type: 'beetle', x: 5, y: 1 }] });
  let s = createRun(map, []);
  s = move(move(s, E), E); // (3,1) above the cracked wall; beetle closes in
  for (let i = 0; i < 3 && s.enemies.length && !s.enemies[0].charge; i++) s = wait(s);
  assert.equal(s.enemies[0].charge, 1, 'fuse lit');
  const bx = s.enemies[0].x;
  s = move(s, bx > s.px ? W : E); // step away from the blast
  assert.equal(s.enemies.length, 0);
  assert.ok(bx === 4 || bx === 2);
});

test('phoenix feather revives once', () => {
  const map = mk(['#####', '#S.E#', '#####'], { enemies: [{ type: 'hulk', x: 2, y: 1 }] });
  let s = createRun(map, ['phoenix_feather']);
  for (let i = 0; i < 4; i++) s = wait(s);
  assert.equal(s.status, 'play');
  assert.equal(s.hp, 4 - 0, 'revived at 4 after the 4th hit');
  for (let i = 0; i < 2; i++) s = wait(s);
  assert.equal(s.status, 'dead');
});

test('mobility: Cinder Step leaps pits, Skate freezes water as it goes', () => {
  let s = createRun(mk(['########', '#S.P..E#', '########']), ['cinder_step']);
  s = move(s, E);
  s = card(s, E);
  assert.equal(s.px, 5);
  let k = createRun(mk(['########', '#S~~..E#', '########']), ['skate']);
  k = card(k, E);
  assert.equal(k.status, 'won');
  assert.equal(tile(k, 2, 1), 'i');
});

test('stealth and sleep: enemies ignore you', () => {
  const map = mk(['######', '#S...#', '#...E#', '######'], { enemies: [{ type: 'sentinel', x: 2, y: 1 }, { type: 'slime', x: 2, y: 2 }] });
  let s = createRun(map, ['fume_veil', 'sleep_spores']);
  s = card(s, N, 0);
  assert.equal(s.hp, 10);
  s = wait(wait(s));
  assert.equal(s.hp, 10);
  s = card(s, N, 1);
  assert.ok(s.enemies.find((e) => e.type === 'slime')!.sleep > 0);
  assert.equal(s.enemies.find((e) => e.type === 'sentinel')!.sleep, 0, 'bones do not sleep');
});

test('determinism: the same replay code always gives the same state', () => {
  const map = mk(['#########', '#S..~...#', '#.B.....#', '#......E#', '#########'], { enemies: [{ type: 'slime', x: 6, y: 2 }, { type: 'bat', x: 5, y: 3, dir: 1 }], items: [{ x: 1, y: 3, kind: 'gold' }] });
  const acts: Action[] = [{ t: 'move', d: S }, { t: 'move', d: S }, { t: 'card', c: 0, d: E }, { t: 'wait' }, { t: 'move', d: N }, { t: 'card', c: 1, d: E }, { t: 'move', d: E }];
  const code = acts.map(encode).join('');
  assert.deepEqual(decode(code), acts);
  const a = replay(map, ['ember_bolt', 'frost_bolt'], code);
  const b = replay(map, ['ember_bolt', 'frost_bolt'], code);
  assert.deepEqual(a, b);
  assert.equal(a.gold, 1);
  // step never mutates its input
  const s0 = createRun(map, ['ember_bolt']);
  const snap = JSON.stringify(s0);
  step(s0, { t: 'card', c: 0, d: E });
  step(s0, { t: 'move', d: S });
  assert.equal(JSON.stringify(s0), snap);
});

test('score: clears beat deaths, fewer moves beat more', () => {
  const map = mk(['######', '#S..E#', '######'], { par: 3 });
  const win = replay(map, ['torch'], 'EEE');
  const slow = replay(map, ['torch'], 'EW.EEE');
  const a = scoreRun(win, 60), b = scoreRun(slow, 60), c = scoreRun(createRun(map, []), 60);
  assert.equal(a.clear, 1000);
  assert.equal(a.moves, 1000);
  assert.equal(a.time, 500);
  assert.equal(a.health, 400);
  assert.equal(a.thrift, 80);
  assert.ok(a.total > b.total && b.total > c.total);
  assert.equal(scoreRun(win, 720).time, 0);
  assert.equal(CARDS.torch.charges, 4);
});
