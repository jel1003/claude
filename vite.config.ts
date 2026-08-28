import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Connect, Plugin, ViteDevServer, PreviewServer } from 'vite'
import { createMemoryStore, handleSync } from './src/core/syncServer'

/**
 * 개발 중에 /api/sync 를 띄워주는 플러그인.
 *
 * 배포된 앱에서는 Netlify Function 이 같은 handleSync 를 돌린다. 여기서는
 * 저장소만 메모리로 바꿔서, Netlify 없이도 기기 간 동기화를 그대로 확인할 수 있다.
 */
function devSyncApi(): Plugin {
  const store = createMemoryStore()

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url !== '/api/sync') return next()

    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(chunks)
      const request = new Request('http://local/api/sync', {
        method: req.method ?? 'POST',
        headers: { 'content-type': 'application/json', 'content-length': String(body.length) },
        ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { body }),
      })
      void handleSync(request, store).then(async (response) => {
        res.statusCode = response.status
        res.setHeader('content-type', 'application/json')
        res.end(await response.text())
      })
    })
  }

  const mount = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(middleware)
  }

  return { name: 'dev-sync-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({
  plugins: [react(), devSyncApi()],
  // 서버가 charset 헤더를 안 붙여도 한글이 깨지지 않도록 번들을 ASCII로 낸다
  esbuild: { charset: 'ascii' },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
