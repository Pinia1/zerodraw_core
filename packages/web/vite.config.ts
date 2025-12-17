import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@zeroDraw/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@zeroDraw/common': path.resolve(__dirname, '../common/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  optimizeDeps: {
    exclude: ['@zeroDraw/core', '@zeroDraw/common'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
