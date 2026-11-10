// ESLint rules for packages/shared/src/engine (TODO.md, Reference R2 rules 1 and 2).
// The engine must be deterministic: it imports nothing from outside its own folder
// and never touches time, randomness, the environment, or async code.
import path from 'node:path';

const ENGINE_DIR = path.join('packages', 'shared', 'src', 'engine');

/** R2 rule 1: every import in the engine is a relative path that stays inside the engine. */
const noOutsideImports = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      bare: "Engine code must not import '{{source}}': the engine has no dependencies (R2 rule 1).",
      escapes: "Engine code must not import '{{source}}': it is outside src/engine (R2 rule 1).",
    },
  },
  create(context) {
    const file = context.filename;
    const marker = path.sep + ENGINE_DIR + path.sep;
    const at = file.lastIndexOf(marker);
    if (at === -1) return {};
    const engineRoot = file.slice(0, at + marker.length);

    function check(node) {
      if (!node || typeof node.value !== 'string') return;
      const source = node.value;
      if (!source.startsWith('./') && !source.startsWith('../')) {
        context.report({ node, messageId: 'bare', data: { source } });
        return;
      }
      const resolved = path.resolve(path.dirname(file), source) + path.sep;
      if (!resolved.startsWith(engineRoot)) {
        context.report({ node, messageId: 'escapes', data: { source } });
      }
    }

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
      TSImportEqualsDeclaration: (node) => check(node.moduleReference?.expression),
      "CallExpression[callee.name='require']": (node) => check(node.arguments[0]),
    };
  },
};

export const enginePlugin = {
  rules: { 'no-outside-imports': noOutsideImports },
};

const FORBIDDEN_GLOBALS = [
  'Date',
  'performance',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'queueMicrotask',
  'requestAnimationFrame',
  'Promise',
  'fetch',
  'XMLHttpRequest',
  'process',
  'window',
  'document',
  'navigator',
  'globalThis',
  'self',
  'global',
  'Intl',
  'crypto',
];

const ALLOWED_MATH = 'floor|ceil|trunc|min|max|abs|imul';

/** R2 rule 2, as ESLint rule settings. */
export const engineDeterminismRules = {
  'engine/no-outside-imports': 'error',
  'no-restricted-globals': [
    'error',
    ...FORBIDDEN_GLOBALS.map((name) => ({
      name,
      message: `'${name}' is forbidden in the engine (R2 rule 2).`,
    })),
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: `MemberExpression[object.name='Math'][computed=false]:not([property.name=/^(${ALLOWED_MATH})$/])`,
      message: `Only Math.${ALLOWED_MATH.split('|').join(', Math.')} are allowed in the engine (R2 rule 2).`,
    },
    {
      selector: "MemberExpression[object.name='Math'][computed=true]",
      message: 'Computed access on Math is forbidden in the engine (R2 rule 2).',
    },
    {
      selector: ':function[async=true]',
      message: 'async functions are forbidden in the engine (R2 rule 2).',
    },
    {
      selector: 'AwaitExpression',
      message: 'await is forbidden in the engine (R2 rule 2).',
    },
    {
      selector: 'ForOfStatement[await=true]',
      message: 'for await is forbidden in the engine (R2 rule 2).',
    },
    {
      selector: 'MemberExpression[property.name=/^(toLocale.*|localeCompare)$/]',
      message: 'Locale-dependent calls are forbidden in the engine (R2 rule 2).',
    },
    {
      selector: "Program > VariableDeclaration[kind!='const']",
      message: 'Module-level mutable variables are forbidden in the engine (R2 rule 2).',
    },
    {
      selector: "Program > ExportNamedDeclaration > VariableDeclaration[kind!='const']",
      message: 'Module-level mutable variables are forbidden in the engine (R2 rule 2).',
    },
  ],
};
