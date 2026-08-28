import { INGREDIENT_BY_ID } from '../data/ingredients'
import { daysBetween, todayKey } from './date'
import type {
  FridgeItem,
  MatchOptions,
  MatchResult,
  MatchStatus,
  Recipe,
  Substitution,
} from './types'

const DEFAULTS = {
  assumePantry: true,
  allowSubstitutes: true,
  almostThreshold: 2,
  expiringWithinDays: 3,
} as const

const STATUS_RANK: Record<MatchStatus, number> = { ready: 0, almost: 1, lacking: 2 }

/** 냉장고 목록에서 "지금 쓸 수 있는 재료 id" 집합을 만든다 */
export function availableIds(fridge: readonly FridgeItem[], options: MatchOptions = {}): Set<string> {
  const assumePantry = options.assumePantry ?? DEFAULTS.assumePantry
  const ids = new Set(fridge.map((item) => item.id))
  if (assumePantry) {
    for (const ing of INGREDIENT_BY_ID.values()) {
      if (ing.pantry) ids.add(ing.id)
    }
  }
  return ids
}

/** 유통기한이 임박(또는 이미 지남)한 재료 id 집합 */
export function expiringIds(fridge: readonly FridgeItem[], options: MatchOptions = {}): Set<string> {
  const today = options.today ?? todayKey()
  const within = options.expiringWithinDays ?? DEFAULTS.expiringWithinDays
  const ids = new Set<string>()
  for (const item of fridge) {
    if (!item.expiresAt) continue
    if (daysBetween(today, item.expiresAt) <= within) ids.add(item.id)
  }
  return ids
}

/** 냉장고에 있는 재료 중 이 재료를 대신할 수 있는 것 */
function findSubstitute(needed: string, have: Set<string>): string | undefined {
  const direct = INGREDIENT_BY_ID.get(needed)?.substitutes ?? []
  for (const alt of direct) {
    if (have.has(alt)) return alt
  }
  // 반대 방향도 본다: B의 substitutes 에 needed 가 들어 있으면 B 로도 대체 가능
  for (const id of have) {
    if (INGREDIENT_BY_ID.get(id)?.substitutes?.includes(needed)) return id
  }
  return undefined
}

/** 레시피 하나를 냉장고와 맞춰본다 */
export function matchRecipe(
  recipe: Recipe,
  fridge: readonly FridgeItem[],
  options: MatchOptions = {},
): MatchResult {
  const have = availableIds(fridge, options)
  const expiring = expiringIds(fridge, options)
  return matchRecipeWith(recipe, have, expiring, options)
}

/** 여러 레시피를 돌릴 때 집합 계산을 한 번만 하기 위한 내부용 */
function matchRecipeWith(
  recipe: Recipe,
  have: Set<string>,
  expiring: Set<string>,
  options: MatchOptions,
): MatchResult {
  const allowSubstitutes = options.allowSubstitutes ?? DEFAULTS.allowSubstitutes
  const almostThreshold = options.almostThreshold ?? DEFAULTS.almostThreshold

  const haveEssential: string[] = []
  const missingEssential: string[] = []
  const haveOptional: string[] = []
  const missingOptional: string[] = []
  const substitutions: Substitution[] = []
  const usesExpiring: string[] = []

  for (const item of recipe.ingredients) {
    let owned = have.has(item.id)

    if (owned) {
      if (expiring.has(item.id)) usesExpiring.push(item.id)
    } else if (allowSubstitutes) {
      const alt = findSubstitute(item.id, have)
      if (alt) {
        owned = true
        substitutions.push({ needed: item.id, used: alt })
        if (expiring.has(alt)) usesExpiring.push(alt)
      }
    }

    if (item.optional) {
      ;(owned ? haveOptional : missingOptional).push(item.id)
    } else {
      ;(owned ? haveEssential : missingEssential).push(item.id)
    }
  }

  const essentialTotal = haveEssential.length + missingEssential.length
  const optionalTotal = haveOptional.length + missingOptional.length
  const essentialRatio = essentialTotal === 0 ? 1 : haveEssential.length / essentialTotal
  const optionalRatio = optionalTotal === 0 ? 1 : haveOptional.length / optionalTotal

  // 필수 재료가 압도적으로 중요하고, 선택 재료는 거들고,
  // 유통기한 임박 재료를 쓰는 레시피에 약간의 가산점을 준다.
  const expiringBonus = Math.min(usesExpiring.length, 3) * 0.05
  const score = Math.min(essentialRatio * 0.75 + optionalRatio * 0.15 + expiringBonus, 1)

  const status: MatchStatus =
    missingEssential.length === 0
      ? 'ready'
      : missingEssential.length <= almostThreshold
        ? 'almost'
        : 'lacking'

  return {
    recipe,
    status,
    score,
    haveEssential,
    missingEssential,
    haveOptional,
    missingOptional,
    substitutions,
    usesExpiring,
  }
}

/**
 * 레시피 전체를 냉장고와 맞춰보고 추천 순으로 정렬한다.
 * 정렬 기준: 만들 수 있는 것 → 부족한 재료가 적은 것 → 점수 → 조리 시간이 짧은 것
 */
export function recommend(
  recipes: readonly Recipe[],
  fridge: readonly FridgeItem[],
  options: MatchOptions = {},
): MatchResult[] {
  const have = availableIds(fridge, options)
  const expiring = expiringIds(fridge, options)

  return recipes
    .map((recipe) => matchRecipeWith(recipe, have, expiring, options))
    .sort((a, b) => {
      const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status]
      if (byStatus !== 0) return byStatus
      const byMissing = a.missingEssential.length - b.missingEssential.length
      if (byMissing !== 0) return byMissing
      if (b.score !== a.score) return b.score - a.score
      if (a.recipe.minutes !== b.recipe.minutes) return a.recipe.minutes - b.recipe.minutes
      return a.recipe.name.localeCompare(b.recipe.name, 'ko')
    })
}
