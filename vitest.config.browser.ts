import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    exclude: [
      'dist/**',
      'node_modules/**',
      'test-publish/**',
      'tests/e2e*.test.ts',
      'tests/http_client.test.ts',
      'tests/resolver.test.ts',
    ],
    browser: {
      enabled: true,
      name: 'jsdom',
    },
  },
});
