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
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DesktopGremlin',
      fileName: (format) => `desktop-gremlin.${format === 'es' ? 'js' : 'umd.cjs'}`,
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: ['vue'],
      output: {
        // Global vars for UMD build
        globals: {
          vue: 'Vue',
        },
        // Preserve asset structure
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'style.css'
          }
          return assetInfo.name || ''
        },
      },
    },
  },
})
