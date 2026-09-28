import {
  ACCORDS,
  CONCENTRATIONS,
  DAYTIME,
  DESCRIPTORS,
  FAMILIES,
  GENDER,
  MOODS,
  MAX_MOODS,
  NOTES,
  OCCASIONS,
  SEASONS,
  SKIN,
  analyze,
  emptyAnswers,
  formatSummary,
} from '../../public/perfume-survey/engine.js'
import type { Answers } from '../../public/perfume-survey/engine.js'

/**
 * 조향 상담 설문 응답 저장 · 조회.
 *
 * - POST /api/perfume-responses        누구나 제출. 답변을 정리해 저장하고 접수번호를 돌려준다.
 * - GET  /api/perfume-responses        관리자만. 최근 응답 목록.
 * - GET  /api/perfume-responses?id=…   관리자만. 응답 하나.
 *
 * 관리자 인증은 `Authorization: Bearer <PERFUME_ADMIN_KEY>` 한 가지다.
 * 처방(계열 · 노트 · 농도)은 브라우저가 보낸 값을 믿지 않고 서버에서 다시 계산한다.
 * Netlify Function 과 로컬 개발 서버가 이 함수를 함께 쓴다.
 */

export interface ResponseStore {
  get(id: string): Promise<unknown>
  set(id: string, serialized: string): Promise<void>
  /** 저장된 id 전부 (순서 무관) */
  list(): Promise<string[]>
}

export interface StoredResponse {
  id: string
  createdAt: string
  answers: Answers
  prescription: {
    family: string[]
    accords: { key: string; pct: number }[]
    top: string[]
    middle: string[]
    base: string[]
    ratio: { top: number; middle: number; base: number }
    concentration: string
  }
  summary: string
}

export const MAX_BODY_BYTES = 64 * 1024
export const MAX_TEXT = 1000
export const LIST_LIMIT = 200

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const oneOf = <T>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)
const pickIds = (v: unknown, allowed: Set<string>, max = Infinity) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && allowed.has(x)))].slice(0, max) : []

function pickMap<T extends number>(v: unknown, allowedKeys: Set<string>, allowedValues: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {}
  if (!isObj(v)) return out
  for (const [k, val] of Object.entries(v)) {
    if (allowedKeys.has(k) && allowedValues.includes(val as T)) out[k] = val as T
  }
  return out
}

const accordKeys = new Set(ACCORDS.map((a) => a.key))
const familyIds = new Set(FAMILIES.map((f) => f.id))
const noteIds = new Set(NOTES.map((n) => n.id))
const seasonIds = new Set(SEASONS.map((s) => s.id))
const occasionIds = new Set(OCCASIONS.map((o) => o.id))
const moodIds = new Set(MOODS.map((m) => m.id))

/** 알 수 없는 필드는 버리고, 아는 필드는 허용된 값만 남긴다. */
export function sanitizeAnswers(raw: unknown): Answers {
  const a = emptyAnswers()
  if (!isObj(raw)) return a
  a.name = text(raw.name, 100)
  a.contact = text(raw.contact, 200)
  a.forWhom = oneOf(raw.forWhom, ['', 'self', 'gift'] as const, '')
  a.experience = oneOf(raw.experience, ['', 'first', 'sometimes', 'daily', 'collector'], '')
  a.seasons = pickIds(raw.seasons, seasonIds)
  a.daytime = oneOf(raw.daytime, ['', ...DAYTIME.map((d) => d.id)] as Answers['daytime'][], '')
  a.occasions = pickIds(raw.occasions, occasionIds)
  a.longevity = oneOf(raw.longevity, [0, 1, 2, 3, 4, 5], 0)
  a.sillage = oneOf(raw.sillage, [0, 1, 2, 3, 4], 0)
  a.concentration = oneOf(raw.concentration, ['auto', ...CONCENTRATIONS.map((c) => c.id)], 'auto')
  a.skin = oneOf(raw.skin, ['', ...SKIN.map((s) => s.id)], '')
  a.families = pickMap(raw.families, familyIds, [1, -1] as const)
  a.accords = pickMap(raw.accords, accordKeys, [-1, 0, 1, 2] as const)
  a.notes = pickMap(raw.notes, noteIds, [1, -1] as const)
  const d = isObj(raw.descriptors) ? raw.descriptors : {}
  for (const desc of DESCRIPTORS) a.descriptors[desc.id] = oneOf(d[desc.id], [-2, -1, 0, 1, 2], 0)
  a.moods = pickIds(raw.moods, moodIds, MAX_MOODS)
  a.gender = oneOf(raw.gender, [null, ...GENDER.map((g) => g.value)], null)
  a.lovedPerfumes = text(raw.lovedPerfumes)
  a.dislikedPerfumes = text(raw.dislikedPerfumes)
  a.allergies = text(raw.allergies, 300)
  a.memo = text(raw.memo)
  return a
}

/** 시간순으로 정렬되는 id: 36진수 밀리초 + 무작위 */
export function newResponseId(now = Date.now()): string {
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(36).padStart(2, '0')).join('')
  return `${now.toString(36).padStart(9, '0')}-${rand}`
}

const ID_PATTERN = /^[0-9a-z]{9}-[0-9a-z]{10}$/

export function buildResponse(answers: Answers, id: string, createdAt: string): StoredResponse {
  const r = analyze(answers)
  return {
    id,
    createdAt,
    answers,
    prescription: {
      family: [r.family.primary?.id, r.family.secondary?.id].filter((x): x is string => Boolean(x)),
      accords: r.topAccords.map((a) => ({ key: a.key, pct: a.pct })),
      top: r.pyramid.top.map((n) => n.id),
      middle: r.pyramid.middle.map((n) => n.id),
      base: r.pyramid.base.map((n) => n.id),
      ratio: r.ratio,
      concentration: r.concentration.id,
    },
    summary: formatSummary(answers, r),
  }
}

/** 길이가 달라도 앞에서 끊지 않는 비교 */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

async function readBody(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return undefined
  const raw = await req.text().catch(() => '')
  if (raw.length > MAX_BODY_BYTES) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function handlePerfumeResponses(req: Request, store: ResponseStore, adminKey: string | undefined): Promise<Response> {
  if (req.method === 'POST') {
    const body = await readBody(req)
    if (body === undefined) return json({ error: 'too_large', message: '응답이 너무 큽니다' }, 413)
    if (!isObj(body) || !isObj(body.answers)) return json({ error: 'invalid_body', message: '응답을 읽지 못했습니다' }, 400)
    // 사람 눈에는 안 보이는 칸. 채워져 있으면 자동 입력 봇으로 보고 저장하지 않는다.
    if (text(body.website)) return json({ id: 'ignored' }, 201)
    if (body.consent !== true) return json({ error: 'no_consent', message: '개인정보 수집에 동의해야 제출할 수 있습니다' }, 400)

    const answers = sanitizeAnswers(body.answers)
    if (analyze(answers).confidence === 'none') {
      return json({ error: 'empty', message: '향 계열이나 어코드를 하나 이상 골라 주세요' }, 400)
    }

    const now = Date.now()
    const id = newResponseId(now)
    const record = buildResponse(answers, id, new Date(now).toISOString())
    try {
      await store.set(id, JSON.stringify(record))
    } catch (error) {
      return json({ error: 'store_failed', message: String(error) }, 502)
    }
    return json({ id, prescription: record.prescription }, 201)
  }

  if (req.method === 'GET') {
    if (!adminKey) return json({ error: 'admin_disabled', message: 'PERFUME_ADMIN_KEY 환경 변수가 설정되지 않았습니다' }, 503)
    const auth = req.headers.get('authorization') ?? ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!safeEqual(token, adminKey)) return json({ error: 'unauthorized', message: '관리자 키가 맞지 않습니다' }, 401)

    const id = new URL(req.url).searchParams.get('id')
    if (id) {
      if (!ID_PATTERN.test(id)) return json({ error: 'invalid_id', message: '접수번호 형식이 아닙니다' }, 400)
      const record = await store.get(id)
      return record ? json({ response: record }) : json({ error: 'not_found', message: '없는 접수번호입니다' }, 404)
    }

    const ids = (await store.list()).filter((x) => ID_PATTERN.test(x)).sort().reverse()
    const latest = ids.slice(0, LIST_LIMIT)
    const records = await Promise.all(latest.map((x) => store.get(x).catch(() => null)))
    return json({ total: ids.length, responses: records.filter(Boolean) })
  }

  return json({ error: 'method_not_allowed', message: 'GET 과 POST 만 받습니다' }, 405)
}

/** 개발 · 테스트용 메모리 저장소 */
export function createMemoryResponseStore(): ResponseStore {
  const map = new Map<string, string>()
  return {
    async get(id) {
      const raw = map.get(id)
      return raw ? JSON.parse(raw) : null
    },
    async set(id, serialized) {
      map.set(id, serialized)
    },
    async list() {
      return [...map.keys()]
    },
  }
}
