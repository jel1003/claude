import { emptyDoc, isValidCode, mergeDocs, normalizeCode, sanitizeDoc } from './sync'

/**
 * 동기화 요청 처리. Netlify Functions 와 로컬 개발 서버가 이 함수를 함께 쓴다.
 * 저장소만 갈아끼우면 되도록 Request → Response 로만 이야기한다.
 */

/** 코드 하나당 문서 하나를 담는 저장소 */
export interface SyncStore {
  get(code: string): Promise<unknown>
  set(code: string, serialized: string): Promise<void>
}

/** 문서 하나 상한 */
export const MAX_DOC_BYTES = 512 * 1024

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export async function handleSync(req: Request, store: SyncStore): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed', message: 'POST 만 받습니다' }, 405)
  }

  const declaredLength = Number(req.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_DOC_BYTES) {
    return json({ error: 'too_large', message: '문서가 너무 큽니다' }, 413)
  }

  const body = (await req.json().catch(() => null)) as { code?: unknown; doc?: unknown } | null
  const code = normalizeCode(typeof body?.code === 'string' ? body.code : '')
  if (!isValidCode(code)) {
    return json({ error: 'invalid_code', message: '동기화 코드 형식이 아닙니다' }, 400)
  }

  const incoming = sanitizeDoc(body?.doc)
  if (!incoming) {
    return json({ error: 'invalid_doc', message: '문서를 읽지 못했습니다' }, 400)
  }

  let stored = emptyDoc()
  try {
    stored = sanitizeDoc(await store.get(code)) ?? emptyDoc()
  } catch {
    // 저장된 문서를 못 읽으면 없는 것으로 보고 이번 문서로 시작한다
  }

  // 덮어쓰지 않고 합친다 — 두 기기가 동시에 올려도 한쪽 변경이 사라지지 않는다
  const merged = mergeDocs(stored, incoming)
  const serialized = JSON.stringify(merged)
  if (serialized.length > MAX_DOC_BYTES) {
    return json({ error: 'too_large', message: '합친 문서가 너무 큽니다' }, 413)
  }

  try {
    await store.set(code, serialized)
  } catch (error) {
    return json({ error: 'store_failed', message: String(error) }, 502)
  }

  return json({ doc: merged })
}

/** 개발·테스트용 메모리 저장소 */
export function createMemoryStore(): SyncStore & { size(): number } {
  const map = new Map<string, string>()
  return {
    async get(code) {
      const raw = map.get(code)
      return raw ? JSON.parse(raw) : null
    },
    async set(code, serialized) {
      map.set(code, serialized)
    },
    size: () => map.size,
  }
}
