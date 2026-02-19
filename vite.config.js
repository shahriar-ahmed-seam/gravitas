import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
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
