// Runs one npm script in every workspace that defines it, in order.
// Usage: node scripts/run-workspaces.mjs <script>
//
// Why not `npm run <script> --workspaces --if-present`? npm exits with
// "No workspaces found!" while packages/ and apps/ are still empty, which
// would fail lint/test on a fresh clone before the first workspace exists.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = process.argv[2];
if (!script) {
  console.error('Usage: node scripts/run-workspaces.mjs <script>');
  process.exit(2);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const patterns = readJson(join(root, 'package.json')).workspaces ?? [];

// Supports the two pattern shapes this repo uses: "dir/*" and "dir/name".
const workspaceDirs = [];
for (const pattern of patterns) {
  if (pattern.endsWith('/*')) {
    const parent = join(root, pattern.slice(0, -2));
    if (!existsSync(parent)) continue;
    const names = readdirSync(parent, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const name of names) workspaceDirs.push(join(parent, name));
  } else {
    workspaceDirs.push(join(root, pattern));
  }
}

const targets = workspaceDirs.filter((dir) => {
  const manifest = join(dir, 'package.json');
  return existsSync(manifest) && Boolean(readJson(manifest).scripts?.[script]);
});

if (targets.length === 0) {
  console.log(`No workspace defines a "${script}" script yet. Nothing to run.`);
  process.exit(0);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const dir of targets) {
  console.log(`\n> ${script} in ${dir.slice(root.length + 1)}`);
  const result = spawnSync(npm, ['run', script], {
    cwd: dir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
