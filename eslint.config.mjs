import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/data/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Tooling scripts and config files run in Node.
    files: ['scripts/**/*.mjs', '*.config.{js,mjs,cjs,ts}'],
    languageOptions: { globals: globals.node },
  },
  // Keep last: turns off rules that would fight Prettier.
  prettier,
);
