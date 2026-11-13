import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_CONFIG, loadConfig, resolveConfig } from '../src/config.ts';

describe('loadConfig', () => {
  it('uses the fixed development defaults outside production', () => {
    expect(loadConfig({})).toEqual(DEVELOPMENT_CONFIG);
    expect(loadConfig({ NODE_ENV: 'development' })).toEqual(DEVELOPMENT_CONFIG);
    expect(DEVELOPMENT_CONFIG.production).toBe(false);
    expect(DEVELOPMENT_CONFIG.sessionSecret).toMatch(/development/);
    expect(DEVELOPMENT_CONFIG.seedSecret).toMatch(/development/);
    expect(DEVELOPMENT_CONFIG.bcryptCost).toBe(10);
    expect(DEVELOPMENT_CONFIG.authRateLimit).toBe(10);
  });

  it('takes the secrets from the environment when they are set', () => {
    const config = loadConfig({ SESSION_SECRET: 'session-env', SEED_SECRET: 'seed-env' });
    expect(config.sessionSecret).toBe('session-env');
    expect(config.seedSecret).toBe('seed-env');
  });

  it('reads production from NODE_ENV and the secrets from the environment', () => {
    const env = { NODE_ENV: 'production', SESSION_SECRET: 'session-secret', SEED_SECRET: 'seed' };
    expect(loadConfig(env)).toEqual({
      ...DEVELOPMENT_CONFIG,
      production: true,
      sessionSecret: 'session-secret',
      seedSecret: 'seed',
    });
  });

  it.each([
    [{}, 'SESSION_SECRET and SEED_SECRET'],
    [{ SEED_SECRET: 'seed' }, 'SESSION_SECRET'],
    [{ SESSION_SECRET: 'session' }, 'SEED_SECRET'],
    [{ SESSION_SECRET: '', SEED_SECRET: 'seed' }, 'SESSION_SECRET'],
    [{ SESSION_SECRET: 'session', SEED_SECRET: '' }, 'SEED_SECRET'],
  ])('refuses to start in production with only %o set', (secrets, missing) => {
    expect(() => loadConfig({ NODE_ENV: 'production', ...secrets })).toThrow(
      `${missing} must be set when NODE_ENV is production`,
    );
  });
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
