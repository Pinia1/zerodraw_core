import { config } from 'dotenv';
import path from 'path';
import { defineConfig } from 'tsup';

config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  external: ['react', 'react-dom'],
  treeshake: true,
  minify: false,
  clean: options.watch ? false : true,
  sourcemap: options.watch ? false : true,
  alias: {
    '@core': path.resolve(__dirname, 'src'),
  },
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
    'process.env.VITE_IMAGE_THUMBNAIL': JSON.stringify(process.env.VITE_IMAGE_THUMBNAIL || ''),
    'process.env.VITE_IMAGE_FILE': JSON.stringify(process.env.VITE_IMAGE_FILE || ''),
  },
}));
