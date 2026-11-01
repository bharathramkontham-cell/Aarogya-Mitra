import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
    globals: true,
    include: [
      'src/lib/*.test.ts',
      'src/lib/*.test.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    setupFiles: ['./src/test-setup.ts'],
    deps: {
      interopDefault: true,
    },
    typecheck: {
      tsconfig: './tsconfig.app.json',
    },
  },
});
