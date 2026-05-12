/// <reference types="vitest/config" />
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const r = (segment: string) => path.resolve(dirname, segment);

const resolveAppVersion = (): string => {
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return `t-${Date.now().toString()}`;
  }
};

const APP_VERSION = resolveAppVersion();

// Emits /version.json into the production bundle. The deployed app fetches
// this file at runtime to detect when a newer build has been pushed (see
// useUpdateAvailable / CheckForUpdate). Build-only — in dev, the fetch
// 404s and the update check silently no-ops.
const emitVersionFile = (): Plugin => ({
  name: 'emit-version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ version: APP_VERSION }),
    });
  },
});

export default defineConfig({
  plugins: [react(), emitVersionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  resolve: {
    alias: {
      '@domain': r('src/domain'),
      '@application': r('src/application'),
      '@infrastructure': r('src/infrastructure'),
      '@presentation': r('src/presentation'),
      '@shared': r('src/shared'),
    },
  },
  build: {
    sourcemap: true,
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/index.ts',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/test/**',
        'src/infrastructure/firebase/firebaseApp.ts',
      ],
    },
  },
});
