import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/entrypoints/http/server.ts'],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
});
