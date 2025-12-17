import { defineConfig } from 'tsup';

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
}));
