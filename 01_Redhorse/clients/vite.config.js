import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // 폴링 방식 사용 (CPU 사용량이 조금 늘어날 수 있음)
    },
  },
})

