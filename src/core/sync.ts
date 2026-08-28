import type { DayPlan, FridgeItem } from './types'
import type { PlanArchive, Settings } from './storage'

/**
 * 기기 간 동기화.
 *
 * 서버는 "동기화 코드" 하나당 문서 하나를 들고 있고, 클라이언트는 자기 문서를
 * 통째로 올린다. 서버는 덮어쓰지 않고 저장된 문서와 **병합**해서 돌려준다.
 * 그래서 폰에서 계란을 담고 PC에서 두부를 담아도 한쪽이 사라지지 않는다.
 *
 * 병합 규칙은 재료 하나하나에 대해 "가장 최근 동작이 이긴다"이다. 삭제도 하나의
 * 동작이라 삭제 기록(tombstone)을 남긴다. 그러지 않으면 한쪽에서 지운 재료가
 * 다른 기기의 오래된 목록에서 계속 되살아난다.
 */

export interface Tombstone {
  /** 지워진 재료 id */
  id: string
  /** 지운 시각 (ISO) */
  removedAt: string
}

export interface SyncDoc {
  version: 1
  fridge: FridgeItem[]
  tombstones: Tombstone[]
  plans: PlanArchive
  settings: Settings | null
  /** 설정을 마지막으로 바꾼 시각 (ISO). 설정은 통째로 최신 것이 이긴다 */
  settingsUpdatedAt: string | null
}

export const SYNC_ENDPOINT = '/api/sync'

/** 헷갈리기 쉬운 글자(0/O, 1/I)를 뺀 알파벳 */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const CODE_GROUPS = 3
const CODE_GROUP_LEN = 4
const CODE_PATTERN = /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/

/** 오래된 삭제 기록은 이만큼 지나면 버린다 */
const TOMBSTONE_KEEP_DAYS = 30
/** 문서에 남길 식단 기록 수 */
const PLAN_KEEP = 30

/** 재료 목록 상한 — 열려 있는 엔드포인트라 서버에서도 같은 값으로 자른다 */
export const LIMITS = { fridge: 300, tombstones: 600, plans: PLAN_KEEP } as const

export function emptyDoc(): SyncDoc {
  return { version: 1, fridge: [], tombstones: [], plans: {}, settings: null, settingsUpdatedAt: null }
}

/** 새 동기화 코드. 60비트라 남이 찍어 맞힐 만한 값은 아니다 */
export function makeSyncCode(random: () => number = defaultRandom): string {
  const groups: string[] = []
  for (let g = 0; g < CODE_GROUPS; g++) {
    let group = ''
    for (let i = 0; i < CODE_GROUP_LEN; i++) {
      group += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)] ?? '2'
    }
    groups.push(group)
  }
  return groups.join('-')
}

function defaultRandom(): number {
  const crypto = globalThis.crypto
  if (crypto?.getRandomValues) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return (buf[0] ?? 0) / 4_294_967_296
  }
  return Math.random()
}

/** 사용자가 입력한 코드를 표준형(대문자 + 하이픈)으로 */
export function normalizeCode(input: string): string {
  const bare = input.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const groups: string[] = []
  for (let i = 0; i < bare.length; i += CODE_GROUP_LEN) {
    groups.push(bare.slice(i, i + CODE_GROUP_LEN))
  }
  return groups.join('-')
}

export function isValidCode(code: string): boolean {
  return CODE_PATTERN.test(code)
}

/** 재료에 마지막으로 손댄 시각 */
function touchedAt(item: FridgeItem): string {
  return item.updatedAt ?? item.addedAt
}

function laterPlan(a: DayPlan, b: DayPlan): DayPlan {
  if (a.nonce !== b.nonce) return a.nonce > b.nonce ? a : b
  return a.generatedAt >= b.generatedAt ? a : b
}

/**
 * 두 문서를 합친다. 교환법칙이 성립하고(순서를 바꿔도 같은 결과) 여러 번
 * 적용해도 결과가 변하지 않는다 — 그래야 클라이언트와 서버가 각각 병합해도
 * 어긋나지 않는다.
 */
export function mergeDocs(a: SyncDoc, b: SyncDoc, now: string = new Date().toISOString()): SyncDoc {
  // 재료: id 별로 가장 최근에 담은 기록만 남긴다
  const latestAdd = new Map<string, FridgeItem>()
  for (const item of [...a.fridge, ...b.fridge]) {
    const current = latestAdd.get(item.id)
    if (!current || touchedAt(item) > touchedAt(current)) latestAdd.set(item.id, item)
  }

  // 삭제: id 별로 가장 최근 삭제 기록만 남긴다
  const latestRemove = new Map<string, Tombstone>()
  for (const stone of [...a.tombstones, ...b.tombstones]) {
    const current = latestRemove.get(stone.id)
    if (!current || stone.removedAt > current.removedAt) latestRemove.set(stone.id, stone)
  }

  // 담은 시각보다 지운 시각이 같거나 더 나중이면 지운 것으로 본다
  const fridge: FridgeItem[] = []
  for (const [id, item] of latestAdd) {
    const removed = latestRemove.get(id)
    if (removed && removed.removedAt >= touchedAt(item)) continue
    fridge.push(item)
  }
  fridge.sort((x, y) => x.id.localeCompare(y.id))

  const cutoff = new Date(Date.parse(now) - TOMBSTONE_KEEP_DAYS * 86_400_000).toISOString()
  const tombstones = [...latestRemove.values()]
    .filter((stone) => stone.removedAt >= cutoff)
    .sort((x, y) => x.id.localeCompare(y.id))

  // 식단: 같은 날짜면 더 나중에 짠 것이 이긴다
  const plans: PlanArchive = {}
  for (const [date, plan] of [...Object.entries(a.plans), ...Object.entries(b.plans)]) {
    const current = plans[date]
    plans[date] = current ? laterPlan(current, plan) : plan
  }

  // 설정: 통째로 최신 것이 이긴다
  const settingsFromA = (a.settingsUpdatedAt ?? '') >= (b.settingsUpdatedAt ?? '')
  const winner = settingsFromA ? a : b
  const loser = settingsFromA ? b : a

  return {
    version: 1,
    fridge: fridge.slice(-LIMITS.fridge),
    tombstones: tombstones.slice(-LIMITS.tombstones),
    plans: keepRecentPlans(plans),
    settings: winner.settings ?? loser.settings,
    settingsUpdatedAt: winner.settingsUpdatedAt ?? loser.settingsUpdatedAt,
  }
}

function keepRecentPlans(plans: PlanArchive): PlanArchive {
  const dates = Object.keys(plans).sort().slice(-PLAN_KEEP)
  const kept: PlanArchive = {}
  for (const date of dates) {
    const plan = plans[date]
    if (plan) kept[date] = plan
  }
  return kept
}

/** 같은 내용인지 빠르게 비교하기 위한 지문 */
export function docSignature(doc: SyncDoc): string {
  return JSON.stringify([
    doc.fridge.map((i) => [i.id, touchedAt(i), i.expiresAt ?? '']),
    doc.tombstones.map((t) => [t.id, t.removedAt]),
    Object.entries(doc.plans).map(([d, p]) => [d, p.nonce, p.generatedAt]),
    doc.settingsUpdatedAt,
  ])
}

/**
 * 바깥에서 들어온 값을 문서로 정리한다. 열려 있는 엔드포인트라 서버에서도
 * 같은 함수로 걸러낸다. 형태가 아니면 null.
 */
export function sanitizeDoc(input: unknown): SyncDoc | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Partial<SyncDoc>

  const fridge = Array.isArray(raw.fridge)
    ? raw.fridge
        .filter(
          (item): item is FridgeItem =>
            !!item &&
            typeof item === 'object' &&
            typeof (item as FridgeItem).id === 'string' &&
            typeof (item as FridgeItem).addedAt === 'string',
        )
        .slice(0, LIMITS.fridge)
        .map((item) => ({
          id: item.id.slice(0, 64),
          addedAt: item.addedAt.slice(0, 40),
          ...(typeof item.updatedAt === 'string' ? { updatedAt: item.updatedAt.slice(0, 40) } : {}),
          ...(typeof item.expiresAt === 'string' ? { expiresAt: item.expiresAt.slice(0, 40) } : {}),
        }))
    : []

  const tombstones = Array.isArray(raw.tombstones)
    ? raw.tombstones
        .filter(
          (stone): stone is Tombstone =>
            !!stone &&
            typeof stone === 'object' &&
            typeof (stone as Tombstone).id === 'string' &&
            typeof (stone as Tombstone).removedAt === 'string',
        )
        .slice(0, LIMITS.tombstones)
        .map((stone) => ({ id: stone.id.slice(0, 64), removedAt: stone.removedAt.slice(0, 40) }))
    : []

  const plans: PlanArchive = {}
  if (raw.plans && typeof raw.plans === 'object' && !Array.isArray(raw.plans)) {
    for (const [date, plan] of Object.entries(raw.plans).slice(0, LIMITS.plans)) {
      if (!plan || typeof plan !== 'object') continue
      const candidate = plan as DayPlan
      if (typeof candidate.date !== 'string' || !Array.isArray(candidate.meals)) continue
      plans[date] = {
        date: candidate.date.slice(0, 10),
        meals: candidate.meals.slice(0, 3),
        generatedAt: typeof candidate.generatedAt === 'string' ? candidate.generatedAt : '',
        nonce: Number.isFinite(candidate.nonce) ? candidate.nonce : 0,
      }
    }
  }

  const settings =
    raw.settings && typeof raw.settings === 'object' ? (raw.settings as Settings) : null

  return {
    version: 1,
    fridge,
    tombstones,
    plans,
    settings,
    settingsUpdatedAt: typeof raw.settingsUpdatedAt === 'string' ? raw.settingsUpdatedAt : null,
  }
}

export class SyncError extends Error {
  constructor(
    message: string,
    readonly code: 'network' | 'unavailable' | 'server' | 'bad_response',
  ) {
    super(message)
    this.name = 'SyncError'
  }
}

/**
 * 내 문서를 올리고, 서버가 합쳐 돌려준 문서를 받는다.
 * 올리기와 내려받기가 한 번의 왕복으로 끝난다.
 */
export async function syncWithServer(
  code: string,
  doc: SyncDoc,
  options: { endpoint?: string; fetchImpl?: typeof fetch; signal?: AbortSignal } = {},
): Promise<SyncDoc> {
  const endpoint = options.endpoint ?? SYNC_ENDPOINT
  const doFetch = options.fetchImpl ?? globalThis.fetch

  let response: Response
  try {
    response = await doFetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, doc }),
      ...(options.signal ? { signal: options.signal } : {}),
    })
  } catch (error) {
    throw new SyncError(`동기화 서버에 연결하지 못했습니다: ${String(error)}`, 'network')
  }

  if (response.status === 404 || response.status === 405 || response.status === 501) {
    // 동기화 함수가 없는 곳에 올라간 경우 (정적 호스팅, 아티팩트 미리보기 등)
    throw new SyncError('이 주소에는 동기화 서버가 없습니다', 'unavailable')
  }
  if (!response.ok) {
    throw new SyncError(`동기화 서버가 ${response.status} 을 돌려줬습니다`, 'server')
  }

  const body = (await response.json().catch(() => null)) as { doc?: unknown } | null
  const merged = sanitizeDoc(body?.doc)
  if (!merged) throw new SyncError('동기화 응답을 이해하지 못했습니다', 'bad_response')
  return merged
}
