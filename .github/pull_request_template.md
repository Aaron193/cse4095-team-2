<!-- Title starts with the task ID, for example: P1-A3 Play a card -->

## Task

- Task ID: <!-- for example P1-A3; one task per pull request -->
- What changed, in a sentence or two:

## Checklist

- [ ] Branch is named after the task (`p1-a3-play-card`) and rebased on `main`
- [ ] Tests for the new behavior are in this pull request and would fail without the change
- [ ] `npm run lint && npm run typecheck && npm test` pass locally
- [ ] TODO.md updated here: the task's box is checked and its `Owner:` slot is filled, and no other line is touched
- [ ] The Reference (R1 to R7) still matches the code, or this pull request changes it and is labeled `contract-change`

## Engine changes

Fill in only if this touches `packages/shared/src/engine`; otherwise write "None".

- [ ] R2 determinism rules are followed
- [ ] `ENGINE_VERSION` is bumped (required for any change to engine behavior or content)
- [ ] Replay fixtures are regenerated in this pull request
- Why the fixtures changed:

## How to check it

<!-- The steps a reviewer follows to see the task's "Done when" line is true. -->
