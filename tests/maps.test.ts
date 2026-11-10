import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { replay, createRun } from '../src/engine/engine.ts';
import { scoreRun } from '../src/engine/score.ts';
import { CARDS } from '../src/engine/cards.ts';
import { ENEMIES } from '../src/engine/enemies.ts';
import { generateCandidate } from '../src/engine/generator.ts';
import { solve } from '../src/engine/solver.ts';
import { dailyMap } from '../src/engine/index.ts';
import type { MapDef } from '../src/engine/types.ts';

const maps: MapDef[] = JSON.parse(readFileSync(new URL('../src/data/maps.json', import.meta.url), 'utf8'));

test('the map book has 30 distinct dungeons', () => {
  assert.equal(maps.length, 30);
  assert.equal(new Set(maps.map((m) => m.name)).size, 30);
  assert.equal(new Set(maps.map((m) => m.tiles.join(''))).size, 30);
});

test('every dungeon is well-formed and offers 3 cards per element', () => {
  for (const m of maps) {
    const t = m.tiles.join('');
    assert.equal(t.length, m.w * m.h, m.name);
    assert.equal(t.split('S').length - 1, 1, `${m.name}: one start`);
    assert.equal(t.split('E').length - 1, 1, `${m.name}: one exit`);
    assert.equal(m.offer.length, 9);
    assert.equal(new Set(m.offer).size, 9);
    for (const el of ['fire', 'frost', 'poison']) assert.equal(m.offer.filter((c) => CARDS[c].el === el).length, 3, `${m.name}: ${el}`);
    for (const e of m.enemies) assert.ok(ENEMIES[e.type], e.type);
  }
});

test('every stored solution replays to a win in exactly the recorded moves', () => {
  for (const m of maps) {
    assert.ok(m.answers && m.answers.length >= 2, `${m.name}: at least two winning card sets`);
    for (const a of m.answers!) {
      const s = replay(m, a.cards, a.actions);
      assert.equal(s.status, 'won', `${m.name} with ${a.cards}`);
      assert.equal(s.moves, a.moves);
      assert.ok(a.cards.length <= 2, 'answers are minimal sets of 1 or 2 cards');
    }
    assert.equal(m.par, Math.min(m.par, ...m.answers!.map((a) => a.moves)));
    assert.ok(scoreRun(replay(m, m.answers![0].cards, m.answers![0].actions), 100).total > 2000);
  }
});

test('there is more than one way through: no card is needed by every solution', () => {
  for (const m of maps) {
    const common = m.answers![0].cards.filter((c) => m.answers!.every((a) => a.cards.includes(c)));
    assert.deepEqual(common, [], m.name);
    assert.ok(m.winPct! >= 8 && m.winPct! <= 80, `${m.name}: ${m.winPct}%`);
  }
});

test('cards matter: the bot cannot clear a sample of dungeons empty-handed', () => {
  for (const m of [maps[0], maps[14], maps[29]]) {
    assert.equal(solve(m, [], 3000), null, m.name);
    assert.equal(createRun(m, []).status, 'play');
  }
});

test('generation is deterministic: the same seed rebuilds the same dungeon', () => {
  for (const m of maps) {
    const again = generateCandidate(m.seed, m.difficulty, m.id);
    assert.deepEqual(again.tiles, m.tiles, m.name);
    assert.deepEqual(again.enemies, m.enemies);
    assert.deepEqual(again.offer, m.offer);
  }
});

test('the daily rotation walks through the whole book', () => {
  const seen = new Set<number>();
  for (let day = 20000; day < 20030; day++) seen.add(dailyMap(maps, day).id);
  assert.equal(seen.size, 30);
});
