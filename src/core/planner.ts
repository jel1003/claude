import { RECIPE_BY_ID } from '../data/recipes'
import { recommend } from './match'
import { createRng, hashSeed, weightedPick } from './rng'
import { MEAL_SLOTS } from './types'
import type {
  CookMethod,
  DayPlan,
  FridgeItem,
  MatchOptions,
  MatchResult,
  MealSlot,
  PlannedMeal,
  ProteinType,
  Recipe,
  ShoppingItem,
} from './types'

export interface PlanOptions extends MatchOptions {
  /** 최근 이 일수 안에 먹은 메뉴는 피한다 (기본 3) */
  avoidRepeatDays?: number
  /** 이미 만들어둔 지난 식단들 — 중복 회피에 쓴다 */
  history?: readonly DayPlan[]
  /** 같은 날 '다시 짜기'를 누른 횟수 (기본 0) */
  nonce?: number
  /** 재료가 부족해도 채워 넣을지 (기본 true). false면 만들 수 있는 것만 배치 */
  allowMissing?: boolean
}

const SLOT_PREFERENCE: Record<MealSlot, { maxMinutes: number; kcal: number }> = {
  // 아침은 짧고 가볍게, 저녁은 시간을 좀 더 쓰고 든든하게
  breakfast: { maxMinutes: 20, kcal: 400 },
  lunch: { maxMinutes: 30, kcal: 600 },
  dinner: { maxMinutes: 45, kcal: 650 },
}

/** 최근 avoidRepeatDays 일 안에 등장한 레시피 id */
function recentRecipeIds(history: readonly DayPlan[], date: string, days: number): Set<string> {
  const ids = new Set<string>()
  const sorted = [...history]
    .filter((plan) => plan.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days)
  for (const plan of sorted) {
    for (const meal of plan.meals) ids.add(meal.recipeId)
  }
  return ids
}

function slotFit(recipe: Recipe, slot: MealSlot): number {
  const pref = SLOT_PREFERENCE[slot]
  // 조리 시간이 그 끼니에 어울리는 범위를 넘어설수록 감점
  const overtime = Math.max(0, recipe.minutes - pref.maxMinutes)
  const timePenalty = Math.min(overtime / 40, 0.6)
  // 목표 열량에서 멀수록 감점
  const kcalPenalty = Math.min(Math.abs(recipe.kcal - pref.kcal) / 1200, 0.3)
  return Math.max(0.1, 1 - timePenalty - kcalPenalty)
}

/** 이미 오늘 고른 메뉴들과 얼마나 다른가 (단백질·조리법·태그) */
/** 밑반찬은 아침 말고는 한 끼로 세우지 않는다 (다른 후보가 아예 없으면 그때 쓴다) */
function sidePenalty(recipe: Recipe, slot: MealSlot): number {
  if (!recipe.side) return 1
  return slot === 'breakfast' ? 0.8 : 0.05
}

function varietyBonus(
  recipe: Recipe,
  usedProteins: Set<ProteinType>,
  usedMethods: Set<CookMethod>,
): number {
  let bonus = 1
  if (recipe.protein !== 'none' && usedProteins.has(recipe.protein)) bonus -= 0.45
  if (usedMethods.has(recipe.method)) bonus -= 0.25
  return Math.max(0.1, bonus)
}

const STATUS_TIERS = ['ready', 'almost', 'lacking'] as const

/**
 * 만들 수 있는 메뉴가 하나라도 있으면 그 안에서만 고른다.
 * '조금 부족한' 메뉴는 만들 수 있는 게 하나도 없을 때만 후보가 된다.
 */
function bestTier(pool: readonly MatchResult[]): MatchResult[] {
  for (const tier of STATUS_TIERS) {
    const tierPool = pool.filter((m) => m.status === tier)
    if (tierPool.length > 0) return tierPool
  }
  return []
}

/**
 * 하루치 식단(아침·점심·저녁)을 만든다.
 *
 * 같은 (날짜, nonce, 냉장고 상태)면 항상 같은 결과가 나온다 — 아침에 자동으로
 * 생성한 식단이 하루 종일 흔들리지 않게 하기 위해서다. '다시 짜기'는 nonce 를
 * 올려서 다른 결과를 뽑는다.
 */
export function generateDayPlan(
  date: string,
  recipes: readonly Recipe[],
  fridge: readonly FridgeItem[],
  options: PlanOptions = {},
): DayPlan {
  const nonce = options.nonce ?? 0
  const avoidRepeatDays = options.avoidRepeatDays ?? 3
  const allowMissing = options.allowMissing ?? true
  const history = options.history ?? []

  const matches = recommend(recipes, fridge, { ...options, today: options.today ?? date })
  const recent = recentRecipeIds(history, date, avoidRepeatDays)

  const rng = createRng(hashSeed(`${date}#${nonce}`))
  const meals: PlannedMeal[] = []
  const chosen = new Set<string>()
  const usedProteins = new Set<ProteinType>()
  const usedMethods = new Set<CookMethod>()

  for (const slot of MEAL_SLOTS) {
    const pool = matches.filter((m) => {
      if (chosen.has(m.recipe.id)) return false
      if (!m.recipe.slots.includes(slot)) return false
      if (!allowMissing && m.status !== 'ready') return false
      return true
    })

    const tier = bestTier(pool)

    // 최근에 먹은 메뉴는 먼저 빼고 고른다. 다 빠져서 후보가 없으면 그때 다시 넣는다.
    const fresh = tier.filter((m) => !recent.has(m.recipe.id))
    const candidates = fresh.length > 0 ? fresh : tier
    if (candidates.length === 0) continue

    const picked = weightedPick(
      candidates,
      (m) =>
        slotFit(m.recipe, slot) *
        sidePenalty(m.recipe, slot) *
        varietyBonus(m.recipe, usedProteins, usedMethods) *
        (0.4 + m.score),
      rng,
    )
    if (!picked) continue

    chosen.add(picked.recipe.id)
    usedProteins.add(picked.recipe.protein)
    usedMethods.add(picked.recipe.method)
    meals.push({
      slot,
      recipeId: picked.recipe.id,
      status: picked.status,
      missingEssential: picked.missingEssential,
    })
  }

  return {
    date,
    meals,
    generatedAt: new Date().toISOString(),
    nonce,
  }
}

/** 식단에서 부족한 재료를 모아 장보기 목록으로 만든다 */
export function shoppingListFor(plan: DayPlan): ShoppingItem[] {
  const byIngredient = new Map<string, Set<string>>()
  for (const meal of plan.meals) {
    const recipe = RECIPE_BY_ID.get(meal.recipeId)
    if (!recipe) continue
    for (const id of meal.missingEssential) {
      const set = byIngredient.get(id) ?? new Set<string>()
      set.add(recipe.name)
      byIngredient.set(id, set)
    }
  }
  return [...byIngredient.entries()].map(([id, forRecipes]) => ({
    id,
    forRecipes: [...forRecipes],
  }))
}

export interface PlanSummary {
  kcal: number
  minutes: number
  readyCount: number
  totalCount: number
}

export function summarizePlan(plan: DayPlan): PlanSummary {
  let kcal = 0
  let minutes = 0
  let readyCount = 0
  for (const meal of plan.meals) {
    const recipe = RECIPE_BY_ID.get(meal.recipeId)
    if (!recipe) continue
    kcal += recipe.kcal
    minutes += recipe.minutes
    if (meal.status === 'ready') readyCount++
  }
  return { kcal, minutes, readyCount, totalCount: plan.meals.length }
}
