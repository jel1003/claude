import { describe, expect, it } from 'vitest'
import { generateDayPlan, shoppingListFor, summarizePlan } from '../src/core/planner'
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes'
import { MEAL_SLOTS } from '../src/core/types'
import type { DayPlan, FridgeItem } from '../src/core/types'

const TODAY = '2026-08-28'

const WELL_STOCKED = [
  'rice', 'egg', 'kimchi', 'tofu', 'onion', 'green-onion', 'garlic', 'carrot',
  'potato', 'zucchini', 'bean-sprout', 'mushroom', 'cucumber', 'spinach',
  'pork-front-leg', 'beef-slice', 'chicken-thigh', 'chicken-breast', 'shrimp',
  'anchovy', 'dried-seaweed', 'gim', 'milk', 'cheese', 'butter', 'bread', 'oat',
  'banana', 'noodle-somen', 'spaghetti', 'tomato-sauce', 'radish', 'lettuce', 'tomato',
]

function fridge(ids: string[]): FridgeItem[] {
  return ids.map((id) => ({ id, addedAt: TODAY }))
}

describe('generateDayPlan', () => {
  it('아침·점심·저녁을 채운다', () => {
    const plan = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), { today: TODAY })
    expect(plan.meals.map((m) => m.slot)).toEqual(MEAL_SLOTS)
  })

  it('각 메뉴는 그 끼니에 어울리는 레시피다', () => {
    const plan = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), { today: TODAY })
    for (const meal of plan.meals) {
      const recipe = RECIPE_BY_ID.get(meal.recipeId)
      expect(recipe?.slots).toContain(meal.slot)
    }
  })

  it('같은 날짜·같은 냉장고면 몇 번을 돌려도 같은 식단이 나온다', () => {
    const a = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), { today: TODAY })
    const b = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), { today: TODAY })
    expect(a.meals).toEqual(b.meals)
  })

  it('날짜가 달라지면 식단도 달라진다', () => {
    const days = ['2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01']
    const signatures = days.map((date) =>
      generateDayPlan(date, RECIPES, fridge(WELL_STOCKED), { today: date })
        .meals.map((m) => m.recipeId)
        .join('|'),
    )
    expect(new Set(signatures).size).toBeGreaterThan(1)
  })

  it('nonce 를 올리면 다시 짠 결과가 나온다', () => {
    const first = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), { today: TODAY })
    const variants = [1, 2, 3, 4].map((nonce) =>
      generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), { today: TODAY, nonce })
        .meals.map((m) => m.recipeId)
        .join('|'),
    )
    const original = first.meals.map((m) => m.recipeId).join('|')
    expect(variants.some((v) => v !== original)).toBe(true)
  })

  it('하루 안에서 같은 메뉴가 두 번 나오지 않는다', () => {
    for (let i = 0; i < 40; i++) {
      const plan = generateDayPlan(`2026-09-${String((i % 28) + 1).padStart(2, '0')}`, RECIPES, fridge(WELL_STOCKED), {
        today: TODAY,
        nonce: i,
      })
      const ids = plan.meals.map((m) => m.recipeId)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('만들 수 있는 메뉴가 있으면 부족한 메뉴는 넣지 않는다', () => {
    for (let i = 0; i < 30; i++) {
      const plan = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), { today: TODAY, nonce: i })
      expect(plan.meals.every((m) => m.status === 'ready'), `nonce ${i}`).toBe(true)
    }
  })

  it('밑반찬만 단독으로 점심·저녁에 올리지 않는다', () => {
    let sideMains = 0
    for (let i = 0; i < 30; i++) {
      const plan = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), { today: TODAY, nonce: i })
      for (const meal of plan.meals) {
        if (meal.slot === 'breakfast') continue
        if (RECIPE_BY_ID.get(meal.recipeId)?.side) sideMains++
      }
    }
    expect(sideMains).toBe(0)
  })

  it('최근에 먹은 메뉴는 피한다', () => {
    const yesterday: DayPlan = generateDayPlan('2026-08-27', RECIPES, fridge(WELL_STOCKED), {
      today: '2026-08-27',
    })
    const plan = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), {
      today: TODAY,
      history: [yesterday],
      avoidRepeatDays: 3,
    })
    const past = new Set(yesterday.meals.map((m) => m.recipeId))
    for (const meal of plan.meals) {
      expect(past.has(meal.recipeId)).toBe(false)
    }
  })

  it('allowMissing=false 면 만들 수 있는 메뉴만 배치한다', () => {
    const plan = generateDayPlan(TODAY, RECIPES, fridge(['rice', 'egg']), {
      today: TODAY,
      allowMissing: false,
    })
    for (const meal of plan.meals) {
      expect(meal.status).toBe('ready')
    }
  })

  it('냉장고가 비어 있어도 식단은 나온다', () => {
    const plan = generateDayPlan(TODAY, RECIPES, [], { today: TODAY })
    expect(plan.meals.length).toBeGreaterThan(0)
  })

  it('단백질이 세 끼 내내 겹치지는 않는다', () => {
    let overlapped = 0
    for (let i = 0; i < 20; i++) {
      const plan = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), { today: TODAY, nonce: i })
      const proteins = plan.meals
        .map((m) => RECIPE_BY_ID.get(m.recipeId)?.protein)
        .filter((p) => p && p !== 'none')
      if (proteins.length === 3 && new Set(proteins).size === 1) overlapped++
    }
    expect(overlapped).toBe(0)
  })
})

describe('shoppingListFor', () => {
  it('부족한 재료를 레시피별로 모아준다', () => {
    const plan = generateDayPlan(TODAY, RECIPES, fridge(['rice']), { today: TODAY })
    const list = shoppingListFor(plan)
    const missingTotal = new Set(plan.meals.flatMap((m) => m.missingEssential))
    expect(list.map((i) => i.id).sort()).toEqual([...missingTotal].sort())
    for (const item of list) {
      expect(item.forRecipes.length).toBeGreaterThan(0)
    }
  })

  it('다 갖췄으면 장볼 것이 없다', () => {
    const plan = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), {
      today: TODAY,
      allowMissing: false,
    })
    expect(shoppingListFor(plan)).toEqual([])
  })
})

describe('summarizePlan', () => {
  it('열량과 조리 시간을 합산한다', () => {
    const plan = generateDayPlan(TODAY, RECIPES, fridge(WELL_STOCKED), { today: TODAY })
    const summary = summarizePlan(plan)
    const expectedKcal = plan.meals.reduce(
      (sum, m) => sum + (RECIPE_BY_ID.get(m.recipeId)?.kcal ?? 0),
      0,
    )
    expect(summary.kcal).toBe(expectedKcal)
    expect(summary.totalCount).toBe(plan.meals.length)
  })
})
