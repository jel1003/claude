import type { DayPlan, FridgeItem } from './types'

const PREFIX = 'fridge-chef.v1'

export const STORAGE_KEYS = {
  fridge: `${PREFIX}.fridge`,
  plans: `${PREFIX}.plans`,
  settings: `${PREFIX}.settings`,
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
