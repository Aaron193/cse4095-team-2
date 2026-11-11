// Builds the map book. Every dungeon written here has passed the bot gate in
// src/engine/generator.ts.
//
//   npm run generate                 all 30, one after another (slow)
//   npm run generate -- 30 6 12      only ids 6..11, written to src/data/parts/ (run several at once)
//   npm run generate -- 30 --merge   combine src/data/parts/*.json into src/data/maps.json
import { writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { generateVerified, NAME_A, NAME_B } from '../src/engine/generator.ts';
import { hashStr } from '../src/engine/rng.ts';
import type { MapDef } from '../src/engine/types.ts';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const count = Number(args[0] ?? 30);
const from = Number(args[1] ?? 0), to = Number(args[2] ?? count);
const verbose = process.argv.includes('--verbose');
const out = new URL('../src/data/maps.json', import.meta.url);
const parts = new URL('../src/data/parts/', import.meta.url);
mkdirSync(parts, { recursive: true });

if (!process.argv.includes('--merge')) {
  for (let id = from; id < to; id++) {
    const t = Date.now();
    const map = generateVerified(hashStr(`daily-delve-${id}`), count > 1 ? id / (count - 1) : 0, id, verbose ? console.log : undefined);
    writeFileSync(new URL(`${String(id).padStart(3, '0')}.json`, parts), JSON.stringify(map));
    console.log(`#${id} ${map.name}: par ${map.par}, ${map.winPct}% of loadouts win, ${map.answers!.length} solutions, ${((Date.now() - t) / 1000).toFixed(0)}s`);
  }
}
if (process.argv.includes('--merge') || (from === 0 && to === count)) {
  const maps: MapDef[] = readdirSync(parts).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(new URL(f, parts), 'utf8')));
  if (maps.length !== count) throw new Error(`expected ${count} dungeons, found ${maps.length}`);
  maps.forEach((map, n) => { // names must be unique across the book
    for (let k = 0; maps.slice(0, n).some((m) => m.name === map.name); k++) map.name = `The ${NAME_A[(map.id + k) % NAME_A.length]} ${NAME_B[(map.id * 7 + k) % NAME_B.length]}`;
  });
  writeFileSync(out, JSON.stringify(maps));
  console.log(`wrote ${maps.length} dungeons to src/data/maps.json`);
}
