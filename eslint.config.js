import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'src-tauri', 'node_modules'] },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  // ADR-0003: the portable core must stay framework-free and platform-free.
  // This boundary is what keeps progression logic testable in milliseconds and
  // makes a future shell swap an adapter rewrite rather than a product rewrite.
  {
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-*', '@tauri-apps/*', 'motion', 'zustand'],
              message:
                'src/core must stay framework-agnostic (ADR-0003). Reach platform capability through an interface in src/core/platform instead.',
            },
            {
              group: ['@ui/*', '@features/*', '@app/*', '@platform/*', '@audio/*'],
              message:
                'src/core must not depend on outer layers (ADR-0003). Dependencies point inward only.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/core must not touch the DOM (ADR-0003).' },
        { name: 'document', message: 'src/core must not touch the DOM (ADR-0003).' },
        { name: 'localStorage', message: 'Use StorageAdapter from src/core/platform instead.' },
      ],
    },
  },

  // Only the Tauri adapter may import the Tauri SDK.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/platform/tauri/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tauri-apps/*'],
              message:
                'Only src/platform/tauri may import the Tauri SDK (ADR-0003). Use a platform port.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-imports': 'off',
    },
  },

  {
    files: ['*.config.{ts,js}'],
    languageOptions: { globals: globals.node },
    rules: { 'no-restricted-imports': 'off' },
  },
);
