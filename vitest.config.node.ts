import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    exclude: [...baseConfig.test.exclude, 'tests/resolver.browser.test.ts'],
  },
});