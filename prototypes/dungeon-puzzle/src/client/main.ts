// Daily Delve web client. All game rules come from ../engine; this file is screens and input.
// Phases: 'intro' (official run only: dungeon hidden until you begin, then the clock runs)
//   -> 'brief' (study the map, pick 4 of 9 cards) -> 'play' -> 'done' (score).

import mapsJson from '../data/maps.json';
import type { Action, MapDef, State } from '../engine/index.ts';
import {
  CARDS, DIRS, ENEMIES, ITEM_INFO, TILE_INFO, blockAt, createRun, dailyMap, dayNumber, encode, enemyAt, fireAt, gasAt, scoreRun, step,
} from '../engine/index.ts';
import { EL_COLOR, TILE, draw, type Flash } from './render.ts';
import './style.css';

const MAPS = mapsJson as unknown as MapDef[];
const PICKS = 4;
const params = new URLSearchParams(location.search);
const day = dayNumber();
const forced = params.get('map');
const map = forced !== null ? MAPS[Number(forced) % MAPS.length] : dailyMap(MAPS, day);
const officialKey = `daily-delve:official:${day}:${map.id}`;

let picks: string[] = [];
let state: State = createRun(map, []);
let aim: number | null = null;
let history = '';
let startedAt = 0;
let endedAt = 0;
let practice = localStorage.getItem(officialKey) !== null || forced !== null;
let phase: 'intro' | 'brief' | 'play' | 'done' = practice ? 'brief' : 'intro';
let log: string[] = [];
const flashes: Flash[] = [];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
document.getElementById('app')!.innerHTML = `
  <header>
    <h1>DAILY DELVE</h1>
    <div class="sub">#${map.id + 1} · ${map.name} · ${new Date().toISOString().slice(0, 10)} UTC</div>
  </header>
  <div id="hud"></div>
  <div class="stage">
    <div class="board"><canvas id="game" width="${map.w * TILE}" height="${map.h * TILE}"></canvas></div>
    <aside>
      <div id="info" class="box"></div>
      <div id="log" class="box"></div>
      <div id="help" class="box"></div>
    </aside>
  </div>
  <div id="tray"></div>
  <div id="modal" hidden></div>`;
const canvas = $<HTMLCanvasElement>('game');
const ctx = canvas.getContext('2d')!;

// ---------- small view helpers ----------

const pips = (n: number, max: number) => '●'.repeat(Math.max(0, n)) + '○'.repeat(Math.max(0, max - n));
const elapsed = () => (startedAt ? ((endedAt || performance.now()) - startedAt) / 1000 : 0);
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

function cardHtml(id: string, opts: { charges?: number; hotkey?: number; selected?: boolean; attrs?: string }) {
  const def = CARDS[id];
  const left = opts.charges ?? def.charges;
  return `<button class="card ${opts.selected ? 'sel' : ''} ${left <= 0 ? 'spent' : ''}" style="--el:${EL_COLOR[def.el]}" ${opts.attrs ?? ''}>
    <span class="top"><b>${opts.hotkey ? `<kbd>${opts.hotkey}</kbd> ` : ''}${def.name}</b><i>${def.el}</i></span>
    <span class="charges">${pips(left, def.charges)}</span>
    <span class="text">${def.text}</span>
  </button>`;
}

function renderHud() {
  const s = state;
  const buffs = [
    s.shield ? `Shield ${s.shield}` : '', s.inner ? `Inner Fire ${s.inner}` : '', s.frostbite ? `Frostbite ${s.frostbite}` : '',
    s.venom ? `Venom Blood ${s.venom}` : '', s.veil ? `Hidden ${s.veil}` : '', s.stasis ? `Stasis ${s.stasis}` : '',
  ].filter(Boolean).join(' · ');
  $('hud').innerHTML = `
    <span class="hp">HP <b>${'♥'.repeat(Math.max(0, s.hp))}<em>${'♥'.repeat(Math.max(0, s.maxHp - s.hp))}</em></b></span>
    <span>Keys <b>${s.keys}</b></span><span>Gold <b>${s.gold}</b></span>
    <span>Moves <b>${s.moves}</b> <small>par ${map.par}</small></span>
    <span>Time <b id="time">${clock(elapsed())}</b></span>
    <span class="buffs">${buffs}</span>
    <span class="tag">${practice ? 'PRACTICE' : 'OFFICIAL RUN'}</span>`;
}

function renderTray() {
  const tray = $('tray');
  document.querySelector('.stage')!.classList.toggle('veiled', phase === 'intro');
  if (phase === 'intro') {
    tray.innerHTML = `<div class="intro box"><h2>Today's dungeon: ${map.name}</h2>
      <p>You get <b>one official run</b> per day. The clock starts the moment the dungeon is revealed, so time spent planning counts.
      Study the map, pick ${PICKS} of the 9 cards on offer, and reach the stairs. Fewer moves and less time score higher. After that, practice as much as you like.</p>
      <button id="begin" class="go">Reveal the dungeon ▶</button></div>`;
    $('begin').addEventListener('click', () => { phase = 'brief'; startedAt = performance.now(); renderAll(); });
  } else if (phase === 'brief') {
    tray.innerHTML = `
      <div class="trayhead"><h2>Choose ${PICKS} cards for today's delve <small>${picks.length}/${PICKS}</small></h2>
        <button id="start" class="go" ${picks.length === PICKS ? '' : 'disabled'}>Enter the dungeon ▶</button></div>
      <div class="cards nine">${map.offer.map((id) => cardHtml(id, { selected: picks.includes(id), attrs: `data-pick="${id}"` })).join('')}</div>`;
    tray.querySelectorAll<HTMLElement>('[data-pick]').forEach((el) => el.addEventListener('click', () => {
      const id = el.dataset.pick!;
      if (picks.includes(id)) picks = picks.filter((p) => p !== id);
      else if (picks.length < PICKS) picks.push(id);
      renderTray();
    }));
    $('start').addEventListener('click', startRun);
  } else {
    tray.innerHTML = `<div class="cards hand">${state.cards.map((c, i) => cardHtml(c.id, { charges: c.charges, hotkey: i + 1, selected: aim === i, attrs: `data-slot="${i}"` })).join('')}</div>`;
    tray.querySelectorAll<HTMLElement>('[data-slot]').forEach((el) => el.addEventListener('click', () => selectCard(Number(el.dataset.slot))));
  }
}

function renderSide() {
  $('log').innerHTML = `<h3>Log</h3>${log.slice(-7).map((l) => `<p>${l}</p>`).join('') || '<p class="dim">Nothing yet.</p>'}`;
  const threats = [...new Set(map.enemies.map((e) => e.type))].filter((t) => t !== 'mimic').map((t) => ENEMIES[t].name);
  const hazards = [...new Set(map.tiles.join(''))].filter((c) => TILE_INFO[c]?.obstacle).map((c) => TILE_INFO[c].name);
  $('help').innerHTML = phase === 'intro' ? '<h3>Daily Delve</h3><p class="dim">A new dungeon every day at midnight UTC. Same map, same cards, for everyone.</p>' : phase === 'brief'
    ? `<h3>Today's dungeon</h3><p><b>Creatures:</b> ${threats.join(', ') || 'none'}</p><p><b>Obstacles:</b> ${hazards.join(', ')}</p>
       <p class="dim">Hover the map to inspect anything. Everything is deterministic, so plan your route, then pick the cards that open it.</p>
       ${localStorage.getItem(officialKey) ? `<p>Official score today: <b>${JSON.parse(localStorage.getItem(officialKey)!).total}</b>. Further runs are practice.</p>` : ''}`
    : `<h3>Controls</h3><p><kbd>WASD</kbd>/<kbd>arrows</kbd> move or attack · <kbd>1</kbd>-<kbd>4</kbd> ready a card, then a direction · <kbd>Space</kbd> wait · <kbd>Esc</kbd> cancel</p>
       <p><button id="quit">${practice ? 'Restart' : 'Give up'}</button></p>`;
  document.getElementById('quit')?.addEventListener('click', () => (practice ? reset() : finish()));
}

function renderAll() { renderHud(); renderTray(); renderSide(); }

// ---------- flow ----------

function startRun() {
  state = createRun(map, picks);
  phase = 'play'; aim = null; history = ''; endedAt = 0;
  if (!startedAt) startedAt = performance.now();
  log = [`You enter ${map.name}.`];
  renderAll();
}

function reset() {
  phase = 'brief'; state = createRun(map, []); aim = null; log = []; startedAt = 0; endedAt = 0;
  $('modal').hidden = true;
  renderAll();
}

function act(a: Action) {
  if (phase !== 'play') return;
  const next = step(state, a);
  if (next === state) {
    log.push(a.t === 'card' ? '<span class="dim">That card would do nothing there.</span>' : '<span class="dim">You cannot go that way.</span>');
    renderSide();
    return;
  }
  history += encode(a);
  state = next;
  aim = null;
  const now = performance.now();
  for (const e of state.events) {
    if (e.msg) log.push(e.t === 'combo' ? `<b class="combo">${e.msg}</b>` : e.t === 'hurt' ? `<span class="bad">${e.msg}</span>` : e.msg);
    if (e.x === undefined) continue;
    const color = { hit: '#ffffff', kill: '#ffe060', hurt: '#e04a2a', boom: '#ffa030', combo: '#ffe060', heal: '#5ac54f', status: '#5ad4ff' }[e.t];
    if (color) flashes.push({ x: e.x, y: e.y!, color, until: now + 220 });
  }
  if (state.status !== 'play') finish();
  else renderAll();
}

function finish() {
  phase = 'done';
  endedAt = performance.now();
  const b = scoreRun(state, elapsed());
  const result = { total: b.total, moves: state.moves, time: Math.round(elapsed()), cleared: b.cleared, cards: picks, replay: history };
  const wasOfficial = !practice;
  if (wasOfficial) { localStorage.setItem(officialKey, JSON.stringify(result)); practice = true; }
  const bestKey = `daily-delve:best:${map.id}`;
  const best = Math.max(Number(localStorage.getItem(bestKey) ?? 0), b.total);
  localStorage.setItem(bestKey, String(best));
  const share = `Daily Delve #${map.id + 1} ${b.cleared ? 'CLEARED' : `${Math.round(b.progress * 100)}%`} · ${b.total} pts · ${state.moves} moves (par ${map.par}) · ${clock(elapsed())}\n` +
    picks.map((id) => ({ fire: '🔥', frost: '❄️', poison: '☠️' })[CARDS[id].el]).join('');
  const row = (label: string, v: number, note = '') => `<tr><td>${label}</td><td class="dim">${note}</td><td>${v}</td></tr>`;
  const m = $('modal');
  m.hidden = false;
  m.innerHTML = `<div class="panel">
    <h2>${b.cleared ? 'Dungeon cleared!' : state.status === 'dead' ? 'You have fallen' : 'Run abandoned'}</h2>
    <p class="dim">${wasOfficial ? 'Official run recorded.' : 'Practice run.'} Best on this dungeon: ${best}</p>
    <table>
      ${row('Clear', b.clear, b.cleared ? '' : `${Math.round(b.progress * 100)}% of the way`)}
      ${row('Moves', b.moves, `${state.moves} used, par ${map.par}`)}
      ${row('Time', b.time, clock(elapsed()))}
      ${row('Health', b.health, `${Math.max(0, state.hp)} HP left`)}
      ${row('Thrift', b.thrift, 'unused charges')}
      ${row('Gold', b.gold, `${state.gold} gold`)}
      ${row('Style', b.style, `${state.style} combos, ${state.kills} kills`)}
      <tr class="total"><td>Score</td><td></td><td>${b.total}</td></tr>
    </table>
    <textarea readonly rows="2">${share}</textarea>
    <p class="dim replay">Replay code: ${map.id}:${picks.join(',')}:${history || '-'}</p>
    <div class="row"><button id="copy">Copy result</button><button id="again" class="go">Practice again</button></div>
  </div>`;
  $('copy').addEventListener('click', () => navigator.clipboard?.writeText(share));
  $('again').addEventListener('click', reset);
  renderAll();
}

// ---------- input ----------

function selectCard(i: number) {
  if (phase !== 'play') return;
  const slot = state.cards[i];
  if (!slot || slot.charges <= 0) return;
  const shape = CARDS[slot.id].shape;
  if (shape === 'passive') { log.push('<span class="dim">That card works on its own.</span>'); renderSide(); return; }
  if (shape === 'self' || shape === 'burst') { act({ t: 'card', c: i, d: 0 }); return; }
  aim = aim === i ? null : i;
  renderTray();
}

function direction(d: number) {
  if (aim !== null) act({ t: 'card', c: aim, d });
  else act({ t: 'move', d });
}

const KEY_DIR: Record<string, number> = { ArrowUp: 0, w: 0, ArrowRight: 1, d: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3 };
window.addEventListener('keydown', (ev) => {
  if (phase !== 'play' || ev.ctrlKey || ev.metaKey) return;
  const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  if (k in KEY_DIR) direction(KEY_DIR[k]);
  else if (k >= '1' && k <= '9') selectCard(Number(k) - 1);
  else if (k === ' ' || k === '.') act({ t: 'wait' });
  else if (k === 'Escape') { aim = null; renderTray(); }
  else return;
  ev.preventDefault();
});

const tileUnder = (ev: MouseEvent) => {
  const r = canvas.getBoundingClientRect();
  return [Math.floor(((ev.clientX - r.left) / r.width) * map.w), Math.floor(((ev.clientY - r.top) / r.height) * map.h)];
};
canvas.addEventListener('click', (ev) => {
  const [x, y] = tileUnder(ev);
  const dx = x - state.px, dy = y - state.py;
  if (dx === 0 && dy === 0) return;
  direction(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
});
canvas.addEventListener('mousemove', (ev) => {
  if (phase === 'intro') return;
  const [x, y] = tileUnder(ev);
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return;
  const i = y * map.w + x, s = state;
  const parts: string[] = [];
  const e = enemyAt(s, x, y);
  if (e && !(e.type === 'mimic' && !e.awake)) {
    const d = ENEMIES[e.type];
    const st = [e.frozen && `Frozen ${e.frozen}`, e.sleep && `Asleep ${e.sleep}`, e.burn && `Burn ${e.burn}`, e.poison && `Poison ${e.poison}`, e.weaken && `Weak ${e.weaken}`, e.armor && `Armor ${e.armor}`].filter(Boolean).join(', ');
    parts.push(`<h3>${d.name}</h3><p>HP ${e.hp}/${d.hp} · Attack ${d.atk}${st ? ' · ' + st : ''}</p><p>${d.desc}</p>`);
  } else if (e) parts.push(`<h3>${ITEM_INFO.chest.name}</h3><p>${ITEM_INFO.chest.desc}</p>`);
  const b = blockAt(s, x, y);
  if (b) parts.push(`<h3>${ITEM_INFO[b.kind].name}</h3><p>${ITEM_INFO[b.kind].desc}</p>`);
  const it = s.items.find((o) => o.x === x && o.y === y);
  if (it) parts.push(`<h3>${ITEM_INFO[it.kind].name}</h3><p>${ITEM_INFO[it.kind].desc}</p>`);
  if (fireAt(s, i)) parts.push(`<h3>Fire</h3><p>${ITEM_INFO.fire.desc}</p>`);
  if (gasAt(s, i)) parts.push(`<h3>Poison Gas</h3><p>${ITEM_INFO.gas.desc}</p>`);
  if (s.bait?.i === i) parts.push(`<h3>Bait</h3><p>${ITEM_INFO.bait.desc}</p>`);
  const t = TILE_INFO[s.tiles[i]];
  if (t && (t.desc || !parts.length)) parts.push(`<h3>${t.name}</h3><p>${t.desc}</p>`);
  if (x === s.px && y === s.py) parts.unshift('<h3>You</h3><p>Walk into an enemy to stab it for 1.</p>');
  $('info').innerHTML = parts.join('');
});

// ---------- main loop ----------

function frame(now: number) {
  draw(ctx, state, now, { aim, flashes });
  while (flashes.length && flashes[0].until < now) flashes.shift();
  const t = document.getElementById('time');
  if (t && (phase === 'play' || phase === 'brief')) t.textContent = clock(elapsed());
  requestAnimationFrame(frame);
}
$('info').innerHTML = '<h3>Inspect</h3><p class="dim">Hover over the map to see what things are and how to beat them.</p>';
renderAll();
requestAnimationFrame(frame);

// Handy for debugging and for automated checks.
Object.assign(window, { delve: { get state() { return state; }, act, map, DIRS } });
