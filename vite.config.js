import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/workout-overlay/',
  server: {
    port: 9029,
    strictPort: true,
  },
})
