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
        '@zeroDraw/agent-ui': path.resolve(__dirname, '../../packages/agent-ui/src/index.ts'),
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
      proxy: {},
    },
    assetsInclude: ['**/*.wasm'],
    optimizeDeps: {
      exclude: ['@zeroDraw/agent-ui', '@zeroDraw/common'],
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
