import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Connect, Plugin, ViteDevServer, PreviewServer } from 'vite'
import { createMemoryStore, handleSync } from './src/core/syncServer'
import { createMemoryResponseStore, handlePerfumeResponses } from './src/core/perfumeResponses'

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

/**
 * 개발 중에 /api/perfume-responses 를 띄워주는 플러그인 (저장소는 메모리).
 * 관리자 키는 PERFUME_ADMIN_KEY 환경 변수, 없으면 'dev-admin'.
 */
function devPerfumeApi(): Plugin {
  const store = createMemoryResponseStore()
  const adminKey = process.env.PERFUME_ADMIN_KEY ?? 'dev-admin'

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url?.startsWith('/api/perfume-responses')) return next()

    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(chunks)
      const hasBody = !(req.method === 'GET' || req.method === 'HEAD')
      const request = new Request(`http://local${req.url}`, {
        method: req.method ?? 'GET',
        headers: {
          'content-type': 'application/json',
          'content-length': String(body.length),
          authorization: req.headers.authorization ?? '',
        },
        ...(hasBody ? { body } : {}),
      })
      void handlePerfumeResponses(request, store, adminKey).then(async (response) => {
        res.statusCode = response.status
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.end(await response.text())
      })
    })
  }

  const mount = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(middleware)
  }

  return { name: 'dev-perfume-api', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig({
  plugins: [react(), devSyncApi(), devPerfumeApi()],
  // 서버가 charset 헤더를 안 붙여도 한글이 깨지지 않도록 번들을 ASCII로 낸다
  esbuild: { charset: 'ascii' },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
