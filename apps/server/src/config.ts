// Server configuration (TODO.md, Reference R1, "Environment variables"). createApp takes it
// as a dependency, so tests choose their own values instead of setting the environment.

export interface AppConfig {
  /** NODE_ENV === 'production': Secure cookie and trust proxy. */
  production: boolean;
  /** SESSION_SECRET: signs the session cookie. */
  sessionSecret: string;
  /** bcrypt cost for password hashes: 10 by default; tests use 4, the lowest bcrypt allows. */
  bcryptCost: number;
}

/**
 * The values used when nothing else is given. The secrets are fixed so that development
 * sessions survive a restart, and named so that they are never mistaken for real ones.
 */
export const DEVELOPMENT_CONFIG: Readonly<AppConfig> = Object.freeze({
  production: false,
  sessionSecret: 'development-only-session-secret',
  bcryptCost: 10,
});

const REQUIRED_IN_PRODUCTION = ['SESSION_SECRET'] as const;

/**
 * Reads the configuration from the environment.
 * Throws when NODE_ENV is 'production' and SESSION_SECRET is missing; fixed, clearly-named
 * development defaults otherwise.
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const production = env.NODE_ENV === 'production';
  if (production) {
    const missing = REQUIRED_IN_PRODUCTION.filter((name) => !env[name]);
    if (missing.length > 0) {
      throw new Error(`${missing.join(' and ')} must be set when NODE_ENV is production`);
    }
  }
  return resolveConfig({
    production,
    sessionSecret: env.SESSION_SECRET || undefined,
  });
}

/** Fills every field that is missing or undefined with its development default. */
export function resolveConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    production: overrides.production ?? DEVELOPMENT_CONFIG.production,
    sessionSecret: overrides.sessionSecret ?? DEVELOPMENT_CONFIG.sessionSecret,
    bcryptCost: overrides.bcryptCost ?? DEVELOPMENT_CONFIG.bcryptCost,
  };
}
