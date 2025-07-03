const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const svgr = require('vite-plugin-svgr').default;
const path = require('path');

module.exports = defineConfig({
  plugins: [
    react(),
    svgr(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});