import type { DayPlan, FridgeItem } from './types'
import type { Tombstone } from './sync'

const PREFIX = 'fridge-chef.v1'

export const STORAGE_KEYS = {
  fridge: `${PREFIX}.fridge`,
  tombstones: `${PREFIX}.tombstones`,
  plans: `${PREFIX}.plans`,
  settings: `${PREFIX}.settings`,
  syncCode: `${PREFIX}.syncCode`,
  settingsUpdatedAt: `${PREFIX}.settingsUpdatedAt`,
} as const

export interface Settings {
  /** 소금·간장 등 상비 재료는 항상 있다고 가정 */
  assumePantry: boolean
  /** 대체 재료 허용 */
  allowSubstitutes: boolean
  /** 최근 며칠 안에 먹은 메뉴는 피한다 */
  avoidRepeatDays: number
  /** 식단을 만드는 기준 시각 (HH:MM). 이 시각 이후 처음 열면 그날 식단이 생긴다 */
  planTime: string
  /** 앱이 열려 있을 때 planTime 에 브라우저 알림을 띄운다 */
  notify: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  assumePantry: true,
  allowSubstitutes: true,
  avoidRepeatDays: 3,
  planTime: '07:00',
  notify: false,
}

function read<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 저장에 성공했으면 true. 사생활 보호 모드 등에서는 false 가 나올 수 있다 */
function write(key: string, value: unknown): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadFridge(): FridgeItem[] {
  const items = read<FridgeItem[]>(STORAGE_KEYS.fridge, [])
  return Array.isArray(items) ? items.filter((item) => typeof item?.id === 'string') : []
}

export function saveFridge(items: readonly FridgeItem[]): boolean {
  return write(STORAGE_KEYS.fridge, items)
}

export function loadTombstones(): Tombstone[] {
  const stones = read<Tombstone[]>(STORAGE_KEYS.tombstones, [])
  return Array.isArray(stones) ? stones.filter((s) => typeof s?.id === 'string') : []
}

export function saveTombstones(stones: readonly Tombstone[]): boolean {
  return write(STORAGE_KEYS.tombstones, stones)
}

/** 이 기기가 쓰는 동기화 코드. 동기화 문서에는 넣지 않는다 */
export function loadSyncCode(): string | null {
  const code = read<string | null>(STORAGE_KEYS.syncCode, null)
  return typeof code === 'string' && code ? code : null
}

export function saveSyncCode(code: string | null): boolean {
  return write(STORAGE_KEYS.syncCode, code)
}

/** 설정을 마지막으로 바꾼 시각 — 기기 간 병합에서 어느 쪽이 최신인지 가린다 */
export function loadSettingsUpdatedAt(): string | null {
  const at = read<string | null>(STORAGE_KEYS.settingsUpdatedAt, null)
  return typeof at === 'string' && at ? at : null
}

export function saveSettingsUpdatedAt(at: string): boolean {
  return write(STORAGE_KEYS.settingsUpdatedAt, at)
}

export type PlanArchive = Record<string, DayPlan>

export function loadPlans(): PlanArchive {
  const plans = read<PlanArchive>(STORAGE_KEYS.plans, {})
  return plans && typeof plans === 'object' ? plans : {}
}

export function savePlans(plans: PlanArchive): boolean {
  return write(STORAGE_KEYS.plans, plans)
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(STORAGE_KEYS.settings, {}) }
}

export function saveSettings(settings: Settings): boolean {
  return write(STORAGE_KEYS.settings, settings)
}

/** 오래된 식단 기록은 정리한다 (최근 keep 일치만 남김) */
export function prunePlans(plans: PlanArchive, keep = 30): PlanArchive {
  const dates = Object.keys(plans).sort().slice(-keep)
  const kept: PlanArchive = {}
  for (const date of dates) {
    const plan = plans[date]
    if (plan) kept[date] = plan
  }
  return kept
}
