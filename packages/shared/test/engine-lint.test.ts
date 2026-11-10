// Proves the ESLint override for src/engine enforces R2 rules 1 and 2 (task P0-A1).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const eslint = new ESLint({ cwd: repoRoot });

async function lint(code: string, file: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(repoRoot, file) });
  return (result?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.ruleId ?? 'parse');
}

const ENGINE_FILE = 'packages/shared/src/engine/probe.ts';
const NESTED_ENGINE_FILE = 'packages/shared/src/engine/content/probe.ts';
const API_FILE = 'packages/shared/src/api/probe.ts';

const forbidden: [name: string, code: string][] = [
  ['Math.random()', 'export const x = Math.random();'],
  ['Date.now()', 'export const x = Date.now();'],
  ['new Date()', 'export const x = new Date();'],
  ['Math.sqrt', 'export const x = Math.sqrt(4);'],
  ['Math.round', 'export const x = Math.round(1.5);'],
  ["Math['random']", "export const x = Math['random']();"],
  ['performance', 'export const x = performance.now();'],
  ['setTimeout', 'export function f(): void { setTimeout(() => {}, 1); }'],
  ['async function', 'export async function f(): Promise<number> { return 1; }'],
  ['async arrow', 'export const f = async () => 1;'],
  ['Promise', 'export const p = Promise.resolve(1);'],
  ['fetch', "export const f = () => fetch('/x');"],
  ['process', 'export const x = process.env;'],
  ['window', 'export const x = window;'],
  ['document', 'export const x = document;'],
  ['globalThis', 'export const x = globalThis;'],
  ['Intl', 'export const x = new Intl.NumberFormat();'],
  ['toLocaleString', 'export const f = (n: number) => n.toLocaleString();'],
  ['localeCompare', 'export const f = (a: string, b: string) => a.localeCompare(b);'],
  ['module-level let', 'let counter = 0;\nexport const f = () => counter;'],
  ['exported module-level let', 'export let counter = 0;'],
  ['import from outside the engine', "import { x } from '../api/index.ts';\nexport const y = x;"],
  ['import of an npm package', "import { z } from 'zod';\nexport const y = z;"],
  ['import of a node builtin', "import fs from 'node:fs';\nexport const y = fs;"],
  ['re-export from outside the engine', "export * from '../api/index.ts';"],
];

describe('engine lint rule (R2 rules 1 and 2)', () => {
  it.each(forbidden)('rejects %s in src/engine', async (_name, code) => {
    expect(await lint(code, ENGINE_FILE)).not.toEqual([]);
  });

  it('rejects an import that escapes the engine from a nested folder', async () => {
    const code = "import { x } from '../../api/index.ts';\nexport const y = x;";
    expect(await lint(code, NESTED_ENGINE_FILE)).toEqual(['engine/no-outside-imports']);
  });

  it('accepts deterministic engine code', async () => {
    const code = [
      "import { ENGINE_VERSION } from './version.ts';",
      'const TABLE = [1, 2, 3];',
      'export function f(n: number): number {',
      '  let total = 0;',
      '  for (const v of TABLE) total += Math.floor((v * n) / 2);',
      '  return Math.max(0, Math.imul(total, 3)) + ENGINE_VERSION.length;',
      '}',
    ].join('\n');
    expect(await lint(code, ENGINE_FILE)).toEqual([]);
  });

  it('accepts an import of the engine root from a nested engine folder', async () => {
    const code =
      "import { ENGINE_VERSION } from '../version.ts';\nexport const v = ENGINE_VERSION;";
    expect(await lint(code, NESTED_ENGINE_FILE)).toEqual([]);
  });

  it('does not apply the engine rules outside src/engine', async () => {
    expect(await lint('export const x = Date.now() + Math.random();', API_FILE)).toEqual([]);
  });
});
