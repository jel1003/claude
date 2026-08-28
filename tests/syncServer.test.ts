import { describe, expect, it } from 'vitest'
import { createMemoryStore, handleSync } from '../src/core/syncServer'
import { emptyDoc } from '../src/core/sync'
import type { SyncDoc } from '../src/core/sync'
import type { SyncStore } from '../src/core/syncServer'
import type { FridgeItem } from '../src/core/types'

const CODE = 'ABCD-EFGH-2345'

function post(body: unknown): Request {
  const serialized = JSON.stringify(body)
  return new Request('http://local/api/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': String(serialized.length) },
    body: serialized,
  })
}

function item(id: string, updatedAt: string): FridgeItem {
  return { id, addedAt: '2026-08-28', updatedAt }
}

function doc(patch: Partial<SyncDoc> = {}): SyncDoc {
  return { ...emptyDoc(), ...patch }
}

async function sync(store: Parameters<typeof handleSync>[1], body: unknown) {
  const response = await handleSync(post(body), store)
  return { status: response.status, body: (await response.json()) as { doc?: SyncDoc; error?: string } }
}

describe('handleSync', () => {
  it('POST 가 아니면 405', async () => {
    const response = await handleSync(
      new Request('http://local/api/sync', { method: 'GET' }),
      createMemoryStore(),
    )
    expect(response.status).toBe(405)
  })

  it('코드 형식이 아니면 400', async () => {
    const { status, body } = await sync(createMemoryStore(), { code: 'nope', doc: emptyDoc() })
    expect(status).toBe(400)
    expect(body.error).toBe('invalid_code')
  })

  it('문서가 없으면 400', async () => {
    const { status, body } = await sync(createMemoryStore(), { code: CODE, doc: '문서 아님' })
    expect(status).toBe(400)
    expect(body.error).toBe('invalid_doc')
  })

  it('코드를 대충 넣어도 표준형으로 받아준다', async () => {
    const store = createMemoryStore()
    const { status } = await sync(store, { code: 'abcdefgh2345', doc: emptyDoc() })
    expect(status).toBe(200)
    expect(store.size()).toBe(1)
  })

  it('처음 올린 문서를 그대로 돌려준다', async () => {
    const store = createMemoryStore()
    const { body } = await sync(store, { code: CODE, doc: doc({ fridge: [item('egg', '2026-08-28T01:00:00.000Z')] }) })
    expect(body.doc?.fridge.map((i) => i.id)).toEqual(['egg'])
  })

  it('두 기기가 각각 담은 재료를 합쳐서 돌려준다', async () => {
    const store = createMemoryStore()
    // 폰이 계란을 담아 올린다
    await sync(store, { code: CODE, doc: doc({ fridge: [item('egg', '2026-08-28T01:00:00.000Z')] }) })
    // PC 는 계란을 모른 채 두부만 올린다
    const pc = await sync(store, { code: CODE, doc: doc({ fridge: [item('tofu', '2026-08-28T02:00:00.000Z')] }) })
    expect(pc.body.doc?.fridge.map((i) => i.id).sort()).toEqual(['egg', 'tofu'])

    // 폰이 다시 올리면 두부도 함께 받는다
    const phone = await sync(store, { code: CODE, doc: doc({ fridge: [item('egg', '2026-08-28T01:00:00.000Z')] }) })
    expect(phone.body.doc?.fridge.map((i) => i.id).sort()).toEqual(['egg', 'tofu'])
  })

  it('한쪽에서 지운 재료는 다른 쪽이 올려도 되살아나지 않는다', async () => {
    const store = createMemoryStore()
    await sync(store, { code: CODE, doc: doc({ fridge: [item('egg', '2026-08-28T01:00:00.000Z')] }) })
    // 폰에서 계란을 뺀다
    await sync(store, { code: CODE, doc: doc({ tombstones: [{ id: 'egg', removedAt: '2026-08-28T02:00:00.000Z' }] }) })
    // PC 는 아직 계란이 있는 옛 목록을 올린다
    const pc = await sync(store, { code: CODE, doc: doc({ fridge: [item('egg', '2026-08-28T01:00:00.000Z')] }) })
    expect(pc.body.doc?.fridge).toEqual([])
  })

  it('코드가 다르면 서로 섞이지 않는다', async () => {
    const store = createMemoryStore()
    await sync(store, { code: CODE, doc: doc({ fridge: [item('egg', '2026-08-28T01:00:00.000Z')] }) })
    const other = await sync(store, { code: 'ZZZZ-YYYY-XXXX', doc: doc({ fridge: [item('tofu', '2026-08-28T01:00:00.000Z')] }) })
    expect(other.body.doc?.fridge.map((i) => i.id)).toEqual(['tofu'])
  })

  it('너무 큰 요청은 413', async () => {
    const big = new Request('http://local/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(600 * 1024) },
      body: JSON.stringify({ code: CODE, doc: emptyDoc() }),
    })
    expect((await handleSync(big, createMemoryStore())).status).toBe(413)
  })

  it('저장소를 못 읽으면 이번 문서로 시작한다', async () => {
    const flaky: SyncStore = {
      get: async () => {
        throw new Error('blob down')
      },
      set: async () => {},
    }
    const { status, body } = await sync(flaky, { code: CODE, doc: doc({ fridge: [item('egg', '2026-08-28T01:00:00.000Z')] }) })
    expect(status).toBe(200)
    expect(body.doc?.fridge.map((i) => i.id)).toEqual(['egg'])
  })

  it('저장에 실패하면 502 로 알린다', async () => {
    const broken: SyncStore = {
      get: async () => null,
      set: async () => {
        throw new Error('read only')
      },
    }
    const { status, body } = await sync(broken, { code: CODE, doc: emptyDoc() })
    expect(status).toBe(502)
    expect(body.error).toBe('store_failed')
  })
})
