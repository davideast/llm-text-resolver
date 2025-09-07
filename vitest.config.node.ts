import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    pool: 'vmThreads', // Uses Node's vm module
    poolOptions: {
      vmThreads: {
        useAtomics: true,
      }
    },
    include: ['dist/**/*.test.js'],
    exclude: ['node_modules/**'],
  },
});
