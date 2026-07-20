/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const resolvePath = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Tauri expects a fixed port and fails if it is unavailable.
const host = process.env['TAURI_DEV_HOST'];

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@core': resolvePath('./src/core'),
      '@platform': resolvePath('./src/platform'),
      '@ui': resolvePath('./src/ui'),
      '@features': resolvePath('./src/features'),
      '@styles': resolvePath('./src/styles'),
      '@audio': resolvePath('./src/audio'),
      '@i18n': resolvePath('./src/i18n'),
      '@app': resolvePath('./src/app'),
    },
  },

  // Vite options tailored for Tauri development.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    // Spread rather than assigning `undefined`: with exactOptionalPropertyTypes
    // an explicit undefined is not the same as an absent key.
    ...(host ? { hmr: { protocol: 'ws' as const, host, port: 1421 } } : {}),
    watch: {
      // Rust build artefacts churn constantly and must not trigger reloads.
      ignored: ['**/src-tauri/**'],
    },
  },

  // Tauri targets a known WebView2/WebKit version, so we can emit modern output.
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: 'es2022',
    minify: process.env['TAURI_ENV_DEBUG'] ? false : 'esbuild',
    sourcemap: !!process.env['TAURI_ENV_DEBUG'],
  },

  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // The portable core carries the logic that must not silently break.
      include: ['src/core/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
});
