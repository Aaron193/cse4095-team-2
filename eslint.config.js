import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { enginePlugin, engineDeterminismRules } from './tools/eslint-engine-rules.js';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Determinism rules for the game engine: TODO.md, Reference R2 rules 1 and 2.
    files: ['packages/shared/src/engine/**/*.ts'],
    plugins: { engine: enginePlugin },
    rules: engineDeterminismRules,
  },
);
