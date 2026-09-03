import { defineConfig } from 'vite'

export default defineConfig({
  server: { host: true, port: 5179, strictPort: true },
  build: { target: 'es2022', assetsInlineLimit: 0 },
  optimizeDeps: { include: ['pixi.js', 'pixi-spine'] },
})
