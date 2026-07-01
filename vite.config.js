import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Multi-page: cinematic space landing (index.html) + the R3F simulator
// (simulation.html). Vendor chunks are split for faster first paint.
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        simulation: resolve(__dirname, 'simulation.html'),
      },
      output: {
        manualChunks: {
          'three-core':   ['three'],
          'r3f':          ['@react-three/fiber', '@react-three/drei'],
          'postfx':       ['@react-three/postprocessing', 'postprocessing'],
          'state':        ['zustand'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
