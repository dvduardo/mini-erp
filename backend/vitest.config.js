import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      include: ['src/controllers/**/*.js'],
      exclude: [
        'src/__tests__/**',
        'node_modules/**',
      ],
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 75,
        statements: 90
      }
    }
  }
});
