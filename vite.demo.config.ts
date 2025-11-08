import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: process.env.GITHUB_PAGES === 'true' ? '/vue-desktop-gremlin/' : '/',
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
  },
})
