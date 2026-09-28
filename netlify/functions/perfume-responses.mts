import { getStore } from '@netlify/blobs'
import { handlePerfumeResponses } from '../../src/core/perfumeResponses'
import type { ResponseStore } from '../../src/core/perfumeResponses'

/**
 * 조향 상담 설문 응답 저장소.
 *
 * 처리는 `src/core/perfumeResponses.ts` 가 하고, 여기서는 Netlify Blobs 를 물려준다.
 * 응답 목록을 보려면 Netlify 환경 변수 PERFUME_ADMIN_KEY 를 설정해야 한다.
 */

const STORE_NAME = 'perfume-responses'

export default async (req: Request): Promise<Response> => {
  const blobs = getStore({ name: STORE_NAME, consistency: 'strong' })
  const store: ResponseStore = {
    get: (id) => blobs.get(id, { type: 'json' }),
    set: async (id, serialized) => {
      await blobs.set(id, serialized)
    },
    list: async () => (await blobs.list()).blobs.map((b) => b.key),
  }
  return handlePerfumeResponses(req, store, process.env.PERFUME_ADMIN_KEY)
}

export const config = { path: '/api/perfume-responses' }
