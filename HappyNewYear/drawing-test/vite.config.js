import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    host: true, // WSL에서 네트워크 접근 허용
    watch: {
      usePolling: true, // WSL 환경에서 파일 감시 개선
      interval: 100, // 폴링 간격 (ms)
    }
  },
  // HMR 설정 개선
  optimizeDeps: {
    include: ['three', 'react', 'react-dom']
  }
})
