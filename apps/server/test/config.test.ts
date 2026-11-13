import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_CONFIG, loadConfig, resolveConfig } from '../src/config.ts';

describe('loadConfig', () => {
  it('uses the fixed development defaults outside production', () => {
    expect(loadConfig({})).toEqual(DEVELOPMENT_CONFIG);
    expect(loadConfig({ NODE_ENV: 'development' })).toEqual(DEVELOPMENT_CONFIG);
    expect(DEVELOPMENT_CONFIG.production).toBe(false);
    expect(DEVELOPMENT_CONFIG.sessionSecret).toMatch(/development/);
  });

  it('takes the secrets from the environment when they are set', () => {
    expect(loadConfig({ SESSION_SECRET: 'from-env' }).sessionSecret).toBe('from-env');
  });

  it('reads production from NODE_ENV and the secrets from the environment', () => {
    expect(loadConfig({ NODE_ENV: 'production', SESSION_SECRET: 'session-secret' })).toEqual({
      ...DEVELOPMENT_CONFIG,
      production: true,
      sessionSecret: 'session-secret',
    });
  });

  it.each([{}, { SESSION_SECRET: '' }])(
    'refuses to start in production without SESSION_SECRET (%o)',
    (secrets) => {
      expect(() => loadConfig({ NODE_ENV: 'production', ...secrets })).toThrow(/SESSION_SECRET/);
    },
  );
});

describe('resolveConfig', () => {
  it('fills missing and undefined fields with the development defaults', () => {
    expect(resolveConfig()).toEqual(DEVELOPMENT_CONFIG);
    expect(resolveConfig({ sessionSecret: undefined, production: true })).toEqual({
      ...DEVELOPMENT_CONFIG,
      production: true,
    });
  });
});
