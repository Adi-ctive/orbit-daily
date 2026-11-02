import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import ts from 'typescript-eslint'
import svelteConfig from './svelte.config.js'

const noMathRandom = {
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Use the seeded RNG from src/lib/rng.ts.' },
  ],
}

export default ts.config(
  { ignores: ['dist/', 'dev-dist/', 'node_modules/', 'coverage/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node, __DEV_PANEL__: 'readonly' } },
    rules: {
      ...noMathRandom,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { projectService: true, extraFileExtensions: ['.svelte'], parser: ts.parser, svelteConfig } },
  },
  { files: ['src/lib/rng.ts'], rules: { 'no-restricted-properties': 'off' } },
)
