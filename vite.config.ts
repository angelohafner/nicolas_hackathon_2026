import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  base: './',
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    outDir: 'dist',
    emptyOutDir: true
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
