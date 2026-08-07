import { defineWorkspace } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';

export default defineWorkspace([
  {
    plugins: [tsconfigPaths(), react()],
    test: {
      name: 'unit',
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['apps/desktop/src/test/setup.ts'],
      include: ['packages/**/src/**/*.test.{ts,tsx}', 'apps/desktop/src/**/*.test.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
    },
  },
  {
    plugins: [tsconfigPaths()],
    test: {
      name: 'integration',
      environment: 'node',
      globals: true,
      include: ['**/*.integration.test.ts'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
]);
