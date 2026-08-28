import { describe, expect, it } from 'vitest'
import { INGREDIENTS, INGREDIENT_BY_ID } from '../src/data/ingredients'
import { RECIPES } from '../src/data/recipes'
import { MEAL_SLOTS } from '../src/core/types'

describe('재료 카탈로그', () => {
  it('id 가 중복되지 않는다', () => {
    const ids = INGREDIENTS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('대체 재료는 실제로 존재하는 재료를 가리킨다', () => {
    for (const ing of INGREDIENTS) {
      for (const sub of ing.substitutes ?? []) {
        expect(INGREDIENT_BY_ID.has(sub), `${ing.id} → ${sub}`).toBe(true)
      }
    }
  })
})

describe('레시피 DB', () => {
  it('id 가 중복되지 않는다', () => {
    const ids = RECIPES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 재료 id 가 카탈로그에 있다', () => {
    for (const recipe of RECIPES) {
      for (const item of recipe.ingredients) {
        expect(INGREDIENT_BY_ID.has(item.id), `${recipe.id} → ${item.id}`).toBe(true)
      }
    }
  })

  it('레시피마다 필수 재료와 조리 과정이 있다', () => {
    for (const recipe of RECIPES) {
      expect(recipe.ingredients.some((i) => !i.optional), recipe.id).toBe(true)
      expect(recipe.steps.length, recipe.id).toBeGreaterThan(0)
      expect(recipe.slots.length, recipe.id).toBeGreaterThan(0)
    }
  })

  it('끼니마다 후보 레시피가 넉넉하다', () => {
    for (const slot of MEAL_SLOTS) {
      const count = RECIPES.filter((r) => r.slots.includes(slot)).length
      expect(count, slot).toBeGreaterThanOrEqual(5)
    }
  })
})
