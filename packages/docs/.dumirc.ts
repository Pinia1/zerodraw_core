import { defineConfig } from 'dumi';

export default defineConfig({
  base: '/docs/',
  publicPath: '/docs/',
  outputPath: 'docs-dist',
  themeConfig: {
    name: 'zeroDraw',
    nav: [
      { title: '使用指南', link: '/docs/guide' },
    ],
    footer: 'zeroDraw — 矢量 & 位图绘画引擎',
  },
  logo: false,
  favicons: [],
});
