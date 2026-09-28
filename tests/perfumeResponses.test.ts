import { describe, expect, it } from 'vitest'
import {
  createMemoryResponseStore,
  handlePerfumeResponses,
  newResponseId,
  sanitizeAnswers,
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
    expect(res.body.id).toMatch(/^[0-9a-z]{9}-[0-9a-z]{10}$/)
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

  it('접수번호는 시간순으로 정렬된다', () => {
    expect(newResponseId(1000) < newResponseId(2000)).toBe(true)
  })
})
