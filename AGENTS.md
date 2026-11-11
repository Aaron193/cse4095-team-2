# Daily Delve: instructions for coding agents

TODO.md at the repo root is the task list and the spec. Before any work, read
"Rules for every task" and sections R1, R2, and R7 in it.

- Work on exactly one task ID at a time, on a branch named like `p0-b1-server-scaffold`
  cut from an up-to-date `main`. Never commit to `main` and never merge a pull request.
- Change only the files the task needs. If the task requires changing a type, endpoint,
  or table in the Reference (R3 to R6), stop and report instead.
- Write the tests the task's "Done when" line requires, then run
  `npm run lint && npm run typecheck && npm test` and show the output.
- In the same commit, check the task's box in TODO.md and fill its `Owner:` slot.
  Touch no other line of TODO.md.
- Code under `packages/shared/src/engine` follows R2: no `Date`, no `Math.random`,
  integers only, no imports from outside that folder.
- The old grid-dungeon prototype is reference code only. It lives in
  `prototypes/dungeon-puzzle/` (until task P0-C4 merges: `src/`, `tests/`, and
  `index.html` at the repo root). Do not import from it or extend it. Where
  README.md disagrees with TODO.md, TODO.md wins.
- Never commit `.zip` files, `.env` files, or `node_modules`.
