import { defineConfig } from 'dumi';

export default defineConfig({
  base: '/docs/',
  publicPath: '/docs/',
  outputPath: 'docs-dist',
  themeConfig: {
    name: 'zeroDraw',
    nav: [{ title: '使用指南', link: '/docs/guide' }],
    footer: 'zeroDraw',
  },
  logo: false,
  favicons: [],
});
