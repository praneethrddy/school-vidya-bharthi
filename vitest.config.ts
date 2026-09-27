import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Keep Vitest single-worker in this repo to avoid intermittent worker IPC timeouts.
    maxWorkers: 1,
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      'tests/e2e/**',
      'tests/a11y/**',
      'tests/smoke/**',
      'tests/visual/**',
      'node_modules/**',
      'dist/**',
      '.next/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/test/**', '**/*.d.ts', '**/*.config.*'],
      thresholds: {
        'src/app/api/**': {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        'src/lib/**': {
          lines: 85,
          functions: 85,
          branches: 85,
          statements: 85,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
