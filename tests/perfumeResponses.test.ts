import { describe, expect, it } from 'vitest'
import {
  createMemoryResponseStore,
  handlePerfumeResponses,
  newResponseId,
  sanitizeAnswers,
  sanitizeRecipes,
} from '../src/core/perfumeResponses'
import type { StoredResponse } from '../src/core/perfumeResponses'
import { sampleAnswers } from '../public/perfume-survey/engine.js'

const KEY = 'secret-key'
const URL_BASE = 'http://local/api/perfume-responses'

function post(body: unknown): Request {
  const serialized = JSON.stringify(body)
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': String(serialized.length) },
    body: serialized,
  })
}

function put(query: string, body: unknown, key: string | null = KEY): Request {
  const serialized = JSON.stringify(body)
  return new Request(URL_BASE + query, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...(key === null ? {} : { authorization: `Bearer ${key}` }) },
    body: serialized,
  })
}

function get(query = '', key: string | null = KEY): Request {
  return new Request(URL_BASE + query, { headers: key === null ? {} : { authorization: `Bearer ${key}` } })
}

async function call(req: Request, store = createMemoryResponseStore(), adminKey: string | undefined = KEY) {
  const res = await handlePerfumeResponses(req, store, adminKey)
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

describe('설문 응답 제출', () => {
  it('동의한 응답을 저장하고 접수번호와 처방을 돌려준다', async () => {
    const store = createMemoryResponseStore()
    const res = await call(post({ answers: sampleAnswers(), consent: true }), store)
    expect(res.status).toBe(201)
    expect(res.body.id).toMatch(/^\d{6}-\d{4}$/)
    const saved = (await store.get(res.body.id as string)) as StoredResponse
    expect(saved.answers.name).toBe('예시 고객')
    expect(saved.summary).toContain('연락처: 010-0000-0000')
    expect(saved.prescription.top.length).toBeGreaterThan(0)
  })

  it('동의하지 않으면 저장하지 않는다', async () => {
    const store = createMemoryResponseStore()
    const res = await call(post({ answers: sampleAnswers() }), store)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('no_consent')
    expect(await store.list()).toEqual([])
  })

  it('향 취향이 하나도 없는 빈 응답은 받지 않는다', async () => {
    const res = await call(post({ answers: { name: '빈 응답' }, consent: true }))
    expect(res.body.error).toBe('empty')
  })

  it('숨은 칸을 채운 봇 제출은 성공처럼 보이지만 저장하지 않는다', async () => {
    const store = createMemoryResponseStore()
    const res = await call(post({ answers: sampleAnswers(), consent: true, website: 'http://spam' }), store)
    expect(res.status).toBe(201)
    expect(await store.list()).toEqual([])
  })

  it('너무 큰 요청과 JSON 이 아닌 요청을 거절한다', async () => {
    const big = await call(post({ answers: { memo: 'x'.repeat(70 * 1024) }, consent: true }))
    expect(big.status).toBe(413)
    const bad = await call(new Request(URL_BASE, { method: 'POST', body: 'not json' }))
    expect(bad.status).toBe(400)
  })
})

describe('sanitizeAnswers', () => {
  it('모르는 필드와 허용되지 않은 값은 버리고 긴 글은 자른다', () => {
    const a = sanitizeAnswers({
      name: '  홍길동  ',
      evil: '<script>',
      seasons: ['summer', 'monsoon', 'summer'],
      accords: { citrus: 2, plutonium: 2, woody: 99 },
      notes: { bergamot: 1, unknown: 1 },
      moods: ['crisp', 'clean', 'cozy', 'calm'],
      longevity: 9,
      gender: 'male',
      memo: 'a'.repeat(5000),
    })
    expect(a.name).toBe('홍길동')
    expect(a).not.toHaveProperty('evil')
    expect(a.seasons).toEqual(['summer'])
    expect(a.accords).toEqual({ citrus: 2 })
    expect(a.notes).toEqual({ bergamot: 1 })
    expect(a.moods).toHaveLength(3)
    expect(a.longevity).toBe(0)
    expect(a.gender).toBeNull()
    expect(a.memo).toHaveLength(1000)
  })
})

describe('관리자 조회', () => {
  it('키가 없거나 틀리면 목록을 보여주지 않는다', async () => {
    expect((await call(get('', null))).status).toBe(401)
    expect((await call(get('', 'wrong'))).status).toBe(401)
    const disabled = await handlePerfumeResponses(get(), createMemoryResponseStore(), undefined)
    expect(disabled.status).toBe(503)
  })

  it('최신 응답부터 목록을 주고, 접수번호로 하나를 꺼낸다', async () => {
    const store = createMemoryResponseStore()
    const first = sampleAnswers()
    first.name = '첫째'
    const second = sampleAnswers()
    second.name = '둘째'
    const a = await call(post({ answers: first, consent: true }), store)
    await new Promise((r) => setTimeout(r, 2))
    await call(post({ answers: second, consent: true }), store)

    const list = await call(get(), store)
    const names = (list.body.responses as StoredResponse[]).map((r) => r.answers.name)
    expect(list.body.total).toBe(2)
    expect(names).toEqual(['둘째', '첫째'])

    const one = await call(get(`?id=${a.body.id as string}`), store)
    expect((one.body.response as StoredResponse).answers.name).toBe('첫째')
    expect((await call(get('?id=../../etc'), store)).status).toBe(400)
  })

  it('접수번호는 한국 날짜 + 숫자 4자리이고 날짜순으로 정렬된다', () => {
    // 2026-09-27 15:30 UTC = 2026-09-28 00:30 KST
    expect(newResponseId(Date.UTC(2026, 8, 27, 15, 30))).toMatch(/^260928-\d{4}$/)
    expect(newResponseId(Date.UTC(2026, 8, 27, 14, 59))).toMatch(/^260927-\d{4}$/)
    expect(newResponseId(Date.UTC(2026, 8, 27)) < newResponseId(Date.UTC(2026, 8, 28))).toBe(true)
  })

  it('예전 형식 접수번호도 계속 조회된다', async () => {
    const store = createMemoryResponseStore()
    const legacy = 'mg3k2p1a0-0a1b2c3d4e'
    await store.set(legacy, JSON.stringify({ id: legacy, createdAt: '2026-01-01T00:00:00.000Z', answers: sampleAnswers() }))
    await call(post({ answers: sampleAnswers(), consent: true }), store)

    const list = await call(get(), store)
    const ids = (list.body.responses as StoredResponse[]).map((r) => r.id)
    expect(ids).toHaveLength(2)
    expect(ids[1]).toBe(legacy)
    expect((await call(get(`?id=${legacy}`), store)).status).toBe(200)
  })

})

describe('실제 레시피 기록', () => {
  const recipe = {
    label: '1차 시안',
    madeAt: '2026-09-28',
    volumeMl: 30,
    strengthPct: 18,
    ingredients: [
      { name: '베르가못', layer: 'top', amount: 12, unit: 'drop' },
      { name: '로즈', layer: 'middle', amount: '8', unit: 'drop' },
      { name: '', layer: 'base', amount: 3, unit: 'drop' },
    ],
    memo: '잔향 조금 더',
    final: true,
  }

  it('관리자가 레시피를 저장하면 응답에 붙고 다시 읽힌다', async () => {
    const store = createMemoryResponseStore()
    const { body } = await call(post({ answers: sampleAnswers(), consent: true }), store)
    const id = body.id as string

    const saved = await call(put(`?id=${id}`, { recipes: [recipe] }), store)
    expect(saved.status).toBe(200)
    const r = (saved.body.response as StoredResponse).recipes![0]!
    expect(r.label).toBe('1차 시안')
    expect(r.ingredients.map((g) => g.name)).toEqual(['베르가못', '로즈'])
    expect(r.ingredients[1]!.amount).toBe(8)
    expect(r.final).toBe(true)

    const one = await call(get(`?id=${id}`), store)
    expect((one.body.response as StoredResponse).recipes).toHaveLength(1)
    // 설문 답변은 그대로 남는다
    expect((one.body.response as StoredResponse).answers.name).toBe(sampleAnswers().name)
  })

  it('키가 없거나 없는 접수번호면 저장하지 않는다', async () => {
    const store = createMemoryResponseStore()
    const { body } = await call(post({ answers: sampleAnswers(), consent: true }), store)
    expect((await call(put(`?id=${body.id as string}`, { recipes: [] }, null), store)).status).toBe(401)
    expect((await call(put(`?id=${body.id as string}`, { recipes: [] }, 'wrong'), store)).status).toBe(401)
    expect((await call(put('?id=260928-0000', { recipes: [] }), store)).status).toBe(404)
    expect((await call(put('?id=../x', { recipes: [] }), store)).status).toBe(400)
    expect((await call(put(`?id=${body.id as string}`, { nope: 1 }), store)).status).toBe(400)
  })

  it('이상한 값은 걸러낸다', () => {
    const [r] = sanitizeRecipes([
      { label: 'x', madeAt: '어제', volumeMl: -5, strengthPct: 500, ingredients: [{ name: 'a', layer: 'heart', amount: 'many', unit: 'kg' }], extra: 1 },
    ])
    expect(r).toMatchObject({ madeAt: '', volumeMl: 0, strengthPct: 100, final: false })
    expect(r!.ingredients[0]).toEqual({ name: 'a', layer: '', amount: 0, unit: 'drop' })
    expect(r).not.toHaveProperty('extra')
    expect(sanitizeRecipes('nope')).toEqual([])
  })
})
