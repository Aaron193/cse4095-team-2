import { describe, expect, it } from 'vitest';

// P0-D2: deliberately failing test to show that CI turns red on a pull request.
// Removed in the next commit on this branch.
describe('CI red check (P0-D2)', () => {
  it('fails on purpose', () => {
    expect(1 + 1).toBe(3);
  });
});
