import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from '@daily-delve/shared';

describe('shared package scaffold', () => {
  it('is importable by its package name', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
