import { describe, expect, it } from 'vitest'
import { matchRecipe, recommend } from '../src/core/match'
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes'
import type { FridgeItem, Recipe } from '../src/core/types'

const TODAY = '2026-08-28'

function fridge(ids: string[], expiresAt?: Record<string, string>): FridgeItem[] {
  return ids.map((id) => ({
    id,
    addedAt: TODAY,
    ...(expiresAt?.[id] ? { expiresAt: expiresAt[id] } : {}),
  }))
}

const gyeranBap = RECIPE_BY_ID.get('gyeran-bap') as Recipe

describe('matchRecipe', () => {
  it('필수 재료가 다 있으면 ready', () => {
    const result = matchRecipe(gyeranBap, fridge(['rice', 'egg']), { today: TODAY })
    expect(result.status).toBe('ready')
    expect(result.missingEssential).toEqual([])
  })

  it('상비 양념을 가정하지 않으면 간장·참기름이 부족으로 잡힌다', () => {
    const result = matchRecipe(gyeranBap, fridge(['rice', 'egg']), {
      today: TODAY,
      assumePantry: false,
    })
    expect(result.missingEssential).toContain('soy-sauce')
    expect(result.status).not.toBe('ready')
  })

  it('필수 재료가 1~2개 빠지면 almost', () => {
    const result = matchRecipe(gyeranBap, fridge(['rice']), { today: TODAY })
    expect(result.status).toBe('almost')
    expect(result.missingEssential).toEqual(['egg'])
  })

  it('선택 재료는 없어도 ready 를 막지 않지만 점수는 낮아진다', () => {
    const bare = matchRecipe(gyeranBap, fridge(['rice', 'egg']), { today: TODAY })
    const full = matchRecipe(gyeranBap, fridge(['rice', 'egg', 'gim', 'green-onion']), {
      today: TODAY,
    })
    expect(bare.status).toBe('ready')
    expect(full.status).toBe('ready')
    expect(full.score).toBeGreaterThan(bare.score)
  })

  it('대체 재료로 필수 재료를 메운다', () => {
    const jeyuk = RECIPE_BY_ID.get('jeyuk-bokkeum') as Recipe
    const result = matchRecipe(jeyuk, fridge(['pork-belly', 'onion', 'green-onion', 'garlic']), {
      today: TODAY,
    })
    expect(result.substitutions).toContainEqual({ needed: 'pork-front-leg', used: 'pork-belly' })
    expect(result.status).toBe('ready')
  })

  it('allowSubstitutes 를 끄면 대체하지 않는다', () => {
    const jeyuk = RECIPE_BY_ID.get('jeyuk-bokkeum') as Recipe
    const result = matchRecipe(jeyuk, fridge(['pork-belly', 'onion', 'green-onion', 'garlic']), {
      today: TODAY,
      allowSubstitutes: false,
    })
    expect(result.substitutions).toEqual([])
    expect(result.missingEssential).toContain('pork-front-leg')
  })

  it('유통기한 임박 재료를 쓰면 가산점이 붙는다', () => {
    const plain = matchRecipe(gyeranBap, fridge(['rice', 'egg']), { today: TODAY })
    const urgent = matchRecipe(
      gyeranBap,
      fridge(['rice', 'egg'], { egg: '2026-08-29', rice: '2026-08-29' }),
      { today: TODAY },
    )
    expect(urgent.usesExpiring).toEqual(expect.arrayContaining(['rice', 'egg']))
    expect(urgent.score).toBeGreaterThan(plain.score)
  })

  it('이미 지난 유통기한도 임박으로 본다', () => {
    const result = matchRecipe(gyeranBap, fridge(['rice', 'egg'], { egg: '2026-08-20' }), {
      today: TODAY,
    })
    expect(result.usesExpiring).toContain('egg')
  })
})

describe('recommend', () => {
  it('만들 수 있는 메뉴가 앞에 온다', () => {
    const results = recommend(RECIPES, fridge(['rice', 'egg', 'kimchi', 'green-onion']), {
      today: TODAY,
    })
    const firstLacking = results.findIndex((r) => r.status !== 'ready')
    const lastReady = results.map((r) => r.status).lastIndexOf('ready')
    expect(lastReady).toBeLessThan(firstLacking === -1 ? results.length : firstLacking)
  })

  it('냉장고가 비어도 결과 수는 레시피 수와 같다', () => {
    const results = recommend(RECIPES, [], { today: TODAY })
    expect(results).toHaveLength(RECIPES.length)
  })

  it('같은 상태 안에서는 부족한 재료가 적은 쪽이 먼저다', () => {
    const results = recommend(RECIPES, fridge(['rice', 'egg']), { today: TODAY })
    const almost = results.filter((r) => r.status === 'almost')
    for (let i = 1; i < almost.length; i++) {
      const prev = almost[i - 1]?.missingEssential.length ?? 0
      const cur = almost[i]?.missingEssential.length ?? 0
      expect(prev).toBeLessThanOrEqual(cur)
    }
  })

  it('재료를 더 넣으면 바로 만들 수 있는 메뉴가 늘어난다', () => {
    const few = recommend(RECIPES, fridge(['rice']), { today: TODAY })
    const many = recommend(
      RECIPES,
      fridge(['rice', 'egg', 'kimchi', 'tofu', 'onion', 'green-onion', 'garlic']),
      { today: TODAY },
    )
    const readyCount = (rs: typeof few) => rs.filter((r) => r.status === 'ready').length
    expect(readyCount(many)).toBeGreaterThan(readyCount(few))
  })
})
