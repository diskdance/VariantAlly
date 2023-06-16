// @ts-check
import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';
import replace from '@rollup/plugin-replace';

const production = process.env.NODE_ENV === 'production';

export default defineConfig({
  input: 'src/index.ts',
  output: {
    file: 'dist/index.min.js',
    format: 'iife',
    banner: readFileSync('./gadget-prepend.js').toString(),
    footer: readFileSync('./gadget-append.js').toString(),
  },
  plugins: [
    replace({
      preventAssignment: true,
      DEBUG: JSON.stringify(!production),
    }),
    typescript(),
    terser({
      format: {
        comments: /((^\*!|nowiki))/i, // Preserve banners & nowiki guards
      },
    }),
  ],
});
