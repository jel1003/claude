import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 서버가 charset 헤더를 안 붙여도 한글이 깨지지 않도록 번들을 ASCII로 낸다
  esbuild: { charset: 'ascii' },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
