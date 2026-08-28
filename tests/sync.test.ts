import { describe, expect, it } from 'vitest'
import {
  docSignature,
  emptyDoc,
  isValidCode,
  makeSyncCode,
  mergeDocs,
  normalizeCode,
  sanitizeDoc,
  SyncError,
  syncWithServer,
} from '../src/core/sync'
import type { SyncDoc } from '../src/core/sync'
import type { DayPlan, FridgeItem } from '../src/core/types'

const T = {
  early: '2026-08-28T01:00:00.000Z',
  mid: '2026-08-28T02:00:00.000Z',
  late: '2026-08-28T03:00:00.000Z',
  now: '2026-08-28T04:00:00.000Z',
}

function item(id: string, updatedAt: string, expiresAt?: string): FridgeItem {
  return { id, addedAt: '2026-08-28', updatedAt, ...(expiresAt ? { expiresAt } : {}) }
}

function doc(patch: Partial<SyncDoc> = {}): SyncDoc {
  return { ...emptyDoc(), ...patch }
}

function ids(d: SyncDoc): string[] {
  return d.fridge.map((i) => i.id).sort()
}

describe('동기화 코드', () => {
  it('XXXX-XXXX-XXXX 형태로 만든다', () => {
    const code = makeSyncCode(() => 0.5)
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/)
    expect(isValidCode(code)).toBe(true)
  })

  it('헷갈리는 글자(0, O, 1, I)를 쓰지 않는다', () => {
    let sample = ''
    for (let i = 0; i < 200; i++) sample += makeSyncCode()
    expect(sample).not.toMatch(/[01OI]/)
  })

  it('충분히 다양한 코드가 나온다', () => {
    const codes = new Set(Array.from({ length: 300 }, () => makeSyncCode()))
    expect(codes.size).toBe(300)
  })

  it('사용자가 대충 입력해도 표준형으로 고친다', () => {
    expect(normalizeCode('abcd efgh 2345')).toBe('ABCD-EFGH-2345')
    expect(normalizeCode('ABCDEFGH2345')).toBe('ABCD-EFGH-2345')
    expect(normalizeCode('abcd-efgh-2345')).toBe('ABCD-EFGH-2345')
  })

  it('형식이 어긋나면 거른다', () => {
    expect(isValidCode('ABC-EFGH-2345')).toBe(false)
    expect(isValidCode('ABCD-EFGH')).toBe(false)
    expect(isValidCode('0BCD-EFGH-2345')).toBe(false) // 0 은 알파벳에 없다
    expect(isValidCode('')).toBe(false)
  })
})

describe('mergeDocs — 재료', () => {
  it('양쪽에서 담은 재료를 모두 합친다', () => {
    const phone = doc({ fridge: [item('egg', T.mid)] })
    const pc = doc({ fridge: [item('tofu', T.mid)] })
    expect(ids(mergeDocs(phone, pc, T.now))).toEqual(['egg', 'tofu'])
  })

  it('한쪽에서 지운 재료는 다른 쪽의 오래된 목록 때문에 되살아나지 않는다', () => {
    // 폰: 계란을 담았다가 지웠다 / PC: 아직 지우기 전 목록을 들고 있다
    const phone = doc({ tombstones: [{ id: 'egg', removedAt: T.late }] })
    const pc = doc({ fridge: [item('egg', T.early)] })
    expect(ids(mergeDocs(phone, pc, T.now))).toEqual([])
  })

  it('지운 뒤에 다시 담았으면 다시 담은 쪽이 이긴다', () => {
    const phone = doc({ fridge: [item('egg', T.late)], tombstones: [{ id: 'egg', removedAt: T.mid }] })
    const pc = doc({ tombstones: [{ id: 'egg', removedAt: T.mid }] })
    expect(ids(mergeDocs(phone, pc, T.now))).toEqual(['egg'])
  })

  it('같은 재료는 더 최근에 손댄 쪽 정보를 쓴다', () => {
    const phone = doc({ fridge: [item('egg', T.late, '2026-09-10')] })
    const pc = doc({ fridge: [item('egg', T.early, '2026-09-01')] })
    expect(mergeDocs(phone, pc, T.now).fridge[0]?.expiresAt).toBe('2026-09-10')
  })

  it('순서를 바꿔도 결과가 같다', () => {
    const a = doc({
      fridge: [item('egg', T.late), item('rice', T.early)],
      tombstones: [{ id: 'tofu', removedAt: T.mid }],
    })
    const b = doc({
      fridge: [item('tofu', T.early), item('rice', T.late)],
      tombstones: [{ id: 'egg', removedAt: T.early }],
    })
    expect(mergeDocs(a, b, T.now)).toEqual(mergeDocs(b, a, T.now))
  })

  it('여러 번 합쳐도 결과가 변하지 않는다', () => {
    const a = doc({ fridge: [item('egg', T.mid)], tombstones: [{ id: 'tofu', removedAt: T.mid }] })
    const b = doc({ fridge: [item('rice', T.late)] })
    const once = mergeDocs(a, b, T.now)
    expect(mergeDocs(once, b, T.now)).toEqual(once)
    expect(mergeDocs(once, once, T.now)).toEqual(once)
  })

  it('오래된 삭제 기록은 정리한다', () => {
    const old = doc({ tombstones: [{ id: 'egg', removedAt: '2026-06-01T00:00:00.000Z' }] })
    const merged = mergeDocs(old, emptyDoc(), T.now)
    expect(merged.tombstones).toEqual([])
  })

  it('빈 문서와 합쳐도 내용이 그대로다', () => {
    const mine = doc({ fridge: [item('egg', T.mid)] })
    expect(ids(mergeDocs(mine, emptyDoc(), T.now))).toEqual(['egg'])
    expect(ids(mergeDocs(emptyDoc(), mine, T.now))).toEqual(['egg'])
  })
})

describe('mergeDocs — 식단과 설정', () => {
  function plan(date: string, recipeId: string, nonce = 0, generatedAt = T.mid): DayPlan {
    return {
      date,
      meals: [{ slot: 'breakfast', recipeId, status: 'ready', missingEssential: [] }],
      generatedAt,
      nonce,
    }
  }

  it('날짜가 다르면 둘 다 남는다', () => {
    const merged = mergeDocs(
      doc({ plans: { '2026-08-27': plan('2026-08-27', 'a') } }),
      doc({ plans: { '2026-08-28': plan('2026-08-28', 'b') } }),
      T.now,
    )
    expect(Object.keys(merged.plans).sort()).toEqual(['2026-08-27', '2026-08-28'])
  })

  it('같은 날짜면 나중에 다시 짠 쪽이 이긴다', () => {
    const merged = mergeDocs(
      doc({ plans: { '2026-08-28': plan('2026-08-28', 'old', 0) } }),
      doc({ plans: { '2026-08-28': plan('2026-08-28', 'new', 2) } }),
      T.now,
    )
    expect(merged.plans['2026-08-28']?.meals[0]?.recipeId).toBe('new')
  })

  it('nonce 가 같으면 나중에 만든 쪽이 이긴다', () => {
    const merged = mergeDocs(
      doc({ plans: { '2026-08-28': plan('2026-08-28', 'old', 0, T.early) } }),
      doc({ plans: { '2026-08-28': plan('2026-08-28', 'new', 0, T.late) } }),
      T.now,
    )
    expect(merged.plans['2026-08-28']?.meals[0]?.recipeId).toBe('new')
  })

  it('설정은 최근에 바꾼 쪽이 통째로 이긴다', () => {
    const a = doc({ settings: { planTime: '07:00' } as never, settingsUpdatedAt: T.early })
    const b = doc({ settings: { planTime: '09:30' } as never, settingsUpdatedAt: T.late })
    expect(mergeDocs(a, b, T.now).settings).toEqual({ planTime: '09:30' })
  })

  it('한쪽에만 설정이 있으면 그것을 쓴다', () => {
    const a = doc({ settings: { planTime: '08:00' } as never, settingsUpdatedAt: T.mid })
    expect(mergeDocs(a, emptyDoc(), T.now).settings).toEqual({ planTime: '08:00' })
    expect(mergeDocs(emptyDoc(), a, T.now).settings).toEqual({ planTime: '08:00' })
  })
})

describe('docSignature', () => {
  it('내용이 같으면 같은 지문이 나온다', () => {
    const a = doc({ fridge: [item('egg', T.mid), item('rice', T.mid)] })
    const b = doc({ fridge: [item('egg', T.mid), item('rice', T.mid)] })
    expect(docSignature(a)).toBe(docSignature(b))
  })

  it('재료가 하나라도 바뀌면 지문이 달라진다', () => {
    const a = doc({ fridge: [item('egg', T.mid)] })
    const b = doc({ fridge: [item('egg', T.mid, '2026-09-01')] })
    expect(docSignature(a)).not.toBe(docSignature(b))
  })
})

describe('sanitizeDoc', () => {
  it('문서가 아니면 null', () => {
    expect(sanitizeDoc(null)).toBeNull()
    expect(sanitizeDoc('문자열')).toBeNull()
    expect(sanitizeDoc(42)).toBeNull()
  })

  it('빈 객체는 빈 문서가 된다', () => {
    expect(sanitizeDoc({})).toEqual(emptyDoc())
  })

  it('형태가 어긋난 항목은 버린다', () => {
    const cleaned = sanitizeDoc({
      fridge: [{ id: 'egg', addedAt: '2026-08-28' }, { id: 123 }, null, { addedAt: '2026-08-28' }],
      tombstones: [{ id: 'tofu', removedAt: T.mid }, { id: 'x' }],
    })
    expect(cleaned?.fridge.map((i) => i.id)).toEqual(['egg'])
    expect(cleaned?.tombstones.map((t) => t.id)).toEqual(['tofu'])
  })

  it('상한을 넘는 재료는 잘라낸다', () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({ id: `x${i}`, addedAt: '2026-08-28' }))
    expect(sanitizeDoc({ fridge: many })?.fridge.length).toBe(300)
  })

  it('배열로 온 plans 는 무시한다', () => {
    expect(sanitizeDoc({ plans: [1, 2, 3] })?.plans).toEqual({})
  })
})

describe('syncWithServer', () => {
  const fine = (body: unknown) =>
    Object.assign(
      async () => new Response(JSON.stringify(body), { status: 200 }),
      {},
    ) as unknown as typeof fetch

  it('서버가 합쳐준 문서를 돌려준다', async () => {
    const merged = doc({ fridge: [item('egg', T.mid)] })
    const result = await syncWithServer('ABCD-EFGH-2345', emptyDoc(), { fetchImpl: fine({ doc: merged }) })
    expect(ids(result)).toEqual(['egg'])
  })

  it('코드와 문서를 함께 보낸다', async () => {
    let sent: unknown = null
    const spy = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body))
      return new Response(JSON.stringify({ doc: emptyDoc() }), { status: 200 })
    }) as unknown as typeof fetch
    await syncWithServer('ABCD-EFGH-2345', doc({ fridge: [item('egg', T.mid)] }), { fetchImpl: spy })
    expect(sent).toMatchObject({ code: 'ABCD-EFGH-2345' })
  })

  it('네트워크가 끊기면 network 오류', async () => {
    const dead = (async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    await expect(syncWithServer('ABCD-EFGH-2345', emptyDoc(), { fetchImpl: dead })).rejects.toMatchObject({
      code: 'network',
    })
  })

  it('서버가 오류를 내면 server 오류', async () => {
    const bad = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch
    await expect(syncWithServer('ABCD-EFGH-2345', emptyDoc(), { fetchImpl: bad })).rejects.toBeInstanceOf(SyncError)
  })

  it('동기화 함수가 없는 주소면 unavailable 오류', async () => {
    const missing = (async () => new Response('not found', { status: 404 })) as unknown as typeof fetch
    await expect(syncWithServer('ABCD-EFGH-2345', emptyDoc(), { fetchImpl: missing })).rejects.toMatchObject({
      code: 'unavailable',
    })
  })

  it('응답이 문서가 아니면 bad_response 오류', async () => {
    await expect(
      syncWithServer('ABCD-EFGH-2345', emptyDoc(), { fetchImpl: fine({ nope: true }) }),
    ).rejects.toMatchObject({ code: 'bad_response' })
  })
})
