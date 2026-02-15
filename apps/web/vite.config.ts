import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '../..'); // 回到根目录

  return {
    envDir: envDir,
    envPrefix: ['VITE_', 'GITHUB_'],
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@zeroDraw/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
        '@zeroDraw/common': path.resolve(__dirname, '../../packages/common/src/index.ts'),
      },
    },
    server: {
      port: 3000,
      open: true,
      host: true,
      fs: {
        allow: [path.resolve(__dirname, '../..')],
      },
    },
    optimizeDeps: {
      exclude: ['@zeroDraw/core', '@zeroDraw/common'],
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
