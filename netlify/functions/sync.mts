import { getStore } from '@netlify/blobs'
import { handleSync } from '../../src/core/syncServer'
import type { SyncStore } from '../../src/core/syncServer'

/**
 * 기기 간 동기화 엔드포인트.
 *
 * 실제 처리는 `src/core/syncServer.ts` 의 handleSync 가 하고, 여기서는
 * Netlify Blobs 를 저장소로 물려주기만 한다. 그래서 로컬 개발 서버와 테스트가
 * 배포되는 것과 똑같은 코드를 돌린다.
 */

const STORE_NAME = 'fridge-sync'

export default async (req: Request): Promise<Response> => {
  const blobs = getStore(STORE_NAME)
  const store: SyncStore = {
    get: (code) => blobs.get(code, { type: 'json' }),
    set: async (code, serialized) => {
      await blobs.set(code, serialized)
    },
  }
  return handleSync(req, store)
}

export const config = { path: '/api/sync' }
