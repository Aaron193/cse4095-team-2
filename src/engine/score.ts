import type { State } from './types.ts';
import { exitDist } from './engine.ts';

// SCORE FORMULA (all weights live here so they are easy to tune)
//
//   Clear     1000 for reaching the exit, otherwise 600 x (how close you got, 0..1)
//   Moves     1000 x min(1.2, par / moves)       par = best bot solution for the day
//   Time      500 x (720 - seconds) / 540        full marks under 3:00, zero at 12:00.
//             The clock starts when the dungeon is revealed, so planning time counts.
//   Health    40 per HP left                     max 400
//   Thrift    20 per unused card charge          max 200
//   Gold      25 per gold                        max 300
//   Style     60 per combo / trick kill + 15 per kill, max 300
//
// Moves, Time, Health and Thrift only count on a clear. A perfect run is roughly 3900.
// Leaderboard order: cleared first, then score, then fewer moves, then earlier submission.
// Everything except Time is re-simulated from the replay; Time is client-reported and
// the server should clamp it to (submit time - dungeon fetch time).

export const SCORE = {
  clear: 1000, partial: 600,
  moves: 1000, movesCap: 1.2,
  time: 500, timeFull: 180, timeZero: 720,
  hp: 40, charge: 20, chargeCap: 200,
  gold: 25, goldCap: 300,
  style: 60, kill: 15, styleCap: 300,
};

export interface ScoreBreakdown {
  cleared: boolean;
  progress: number; // 0..1
  clear: number;
  moves: number;
  time: number;
  health: number;
  thrift: number;
  gold: number;
  style: number;
  total: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function scoreRun(s: State, seconds: number): ScoreBreakdown {
  const K = SCORE;
  const cleared = s.status === 'won';
  const startDist = exitDist(s.map)[s.map.tiles.join('').indexOf('S')];
  const progress = cleared ? 1 : clamp(1 - s.best / startDist, 0, 0.95);
  const unused = s.cards.reduce((n, c) => n + c.charges, 0);
  const b: ScoreBreakdown = {
    cleared,
    progress,
    clear: cleared ? K.clear : Math.round(K.partial * progress),
    moves: cleared ? Math.round(K.moves * Math.min(K.movesCap, s.map.par / Math.max(1, s.moves))) : 0,
    time: cleared ? Math.round(K.time * clamp((K.timeZero - seconds) / (K.timeZero - K.timeFull), 0, 1)) : 0,
    health: cleared ? K.hp * Math.max(0, s.hp) : 0,
    thrift: cleared ? Math.min(K.chargeCap, K.charge * unused) : 0,
    gold: Math.min(K.goldCap, K.gold * s.gold),
    style: Math.min(K.styleCap, K.style * s.style + K.kill * s.kills),
    total: 0,
  };
  b.total = b.clear + b.moves + b.time + b.health + b.thrift + b.gold + b.style;
  return b;
}
