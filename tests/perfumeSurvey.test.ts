import {
  ACCORDS,
  DESCRIPTORS,
  FAMILIES,
  MOODS,
  NOTES,
  NOTE_CATEGORIES,
  SEASONS,
  analyze,
  emptyAnswers,
  formatSummary,
  layerRatio,
  gramsFromDrops,
  suggestRecipe,
  recommendConcentration,
  sampleAnswers,
} from '../public/perfume-survey/engine.js'

const accordKeys = new Set(ACCORDS.map((a) => a.key))

describe('조향 설문 데이터', () => {
  it('노트·계열·계절·표현·무드가 참조하는 어코드는 전부 정의돼 있다', () => {
    const refs = [
      ...NOTES.flatMap((n) => Object.keys(n.accords)),
      ...FAMILIES.flatMap((f) => Object.keys(f.accords)),
      ...SEASONS.flatMap((s) => Object.keys(s.accords)),
      ...DESCRIPTORS.flatMap((d) => [...d.leftAccords, ...d.rightAccords]),
      ...MOODS.flatMap((m) => m.accords),
    ]
    expect(refs.filter((k) => !accordKeys.has(k))).toEqual([])
  })

  it('노트 id 는 겹치지 않고 카테고리는 12개 분류 안에 있다', () => {
    const ids = NOTES.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
    const cats = new Set(NOTE_CATEGORIES.map((c) => c.id))
    expect(NOTE_CATEGORIES).toHaveLength(12)
    expect(NOTES.filter((n) => !cats.has(n.category))).toEqual([])
  })

  it('모든 카테고리와 레이어에 노트가 있다', () => {
    for (const c of NOTE_CATEGORIES) expect(NOTES.some((n) => n.category === c.id)).toBe(true)
    for (const layer of ['top', 'middle', 'base'] as const) {
      expect(NOTES.filter((n) => n.layer === layer).length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('analyze', () => {
  it('아무 답도 없으면 추천을 만들지 않는다', () => {
    const r = analyze(emptyAnswers())
    expect(r.topAccords).toEqual([])
    expect(r.family.primary).toBeNull()
    expect(r.pyramid.top).toEqual([])
    expect(r.confidence).toBe('none')
  })

  it('여름 · 시트러스 · 청량한 답변은 시트러스 계열과 시트러스 탑노트로 이어진다', () => {
    const a = emptyAnswers()
    a.seasons = ['summer']
    a.families = { citrus: 1 }
    a.accords = { citrus: 2 }
    a.moods = ['crisp']
    const r = analyze(a)
    expect(r.topAccords[0]?.key).toBe('citrus')
    expect(r.family.primary?.id).toBe('citrus')
    expect(r.pyramid.top.some((n) => n.category === 'citrus')).toBe(true)
  })

  it('피하고 싶다고 고른 노트는 어떤 경우에도 처방에 들어가지 않는다', () => {
    const a = emptyAnswers()
    a.accords = { sweet: 2, vanilla: 2 }
    a.notes = { vanilla: -1, caramel: -1 }
    const r = analyze(a)
    const all = [...r.pyramid.top, ...r.pyramid.middle, ...r.pyramid.base].map((n) => n.id)
    expect(all).not.toContain('vanilla')
    expect(all).not.toContain('caramel')
    expect(r.avoidedNotes).toEqual(['바닐라', '캐러멜'])
  })

  it('싫다고 고른 계열은 대표 계열이 되지 않는다', () => {
    const a = emptyAnswers()
    a.accords = { vanilla: 2, sweet: 2 }
    a.families = { gourmand: -1 }
    const r = analyze(a)
    expect(r.family.primary?.id).not.toBe('gourmand')
  })

  it('같은 레이어에서 주 어코드가 한쪽으로 쏠리지 않는다', () => {
    const a = emptyAnswers()
    a.accords = { citrus: 2, fresh: 1 }
    const tops = analyze(a).pyramid.top
    expect(tops).toHaveLength(3)
    expect(tops.filter((n) => n.category === 'citrus').length).toBeLessThan(3)
  })

  it('예시 응답은 요약 텍스트까지 만들어진다', () => {
    const a = sampleAnswers()
    const r = analyze(a)
    expect(r.confidence).toBe('high')
    const text = formatSummary(a, r)
    expect(text).toContain('예시 고객')
    expect(text).toContain('제외 노트: 캐러멜, 튜베로즈')
  })
})

describe('비율과 농도', () => {
  it('묵직하고 오래가는 향일수록 베이스 비중이 커지고 합은 100이다', () => {
    const light = emptyAnswers()
    light.descriptors.weight = -2
    light.longevity = 2
    const heavy = emptyAnswers()
    heavy.descriptors.weight = 2
    heavy.longevity = 5
    const l = layerRatio(light)
    const h = layerRatio(heavy)
    expect(h.base).toBeGreaterThan(l.base)
    expect(l.top).toBeGreaterThan(h.top)
    for (const r of [l, h]) expect(r.top + r.middle + r.base).toBe(100)
  })

  it('지속력·확산력·피부 타입으로 농도를 고른다', () => {
    const a = emptyAnswers()
    a.longevity = 1
    expect(recommendConcentration(a).id).toBe('edc')
    a.longevity = 3
    expect(recommendConcentration(a).id).toBe('edp')
    a.longevity = 5
    a.sillage = 4
    expect(recommendConcentration(a).id).toBe('extrait')
    a.longevity = 3
    a.sillage = 0
    a.skin = 'oily'
    expect(recommendConcentration(a).id).toBe('edt')
  })

  it('고객이 직접 고른 농도가 있으면 그대로 따른다', () => {
    const a = emptyAnswers()
    a.longevity = 5
    a.concentration = 'edc'
    expect(recommendConcentration(a)).toMatchObject({ id: 'edc', reason: '고객이 직접 고른 농도' })
  })
})

describe('실제 레시피 초안 (방울 → g)', () => {
  const prescription = {
    top: ['bergamot', 'lemon'],
    middle: ['rose'],
    base: ['cedar', 'musk', 'amber'],
    ratio: { top: 30, middle: 40, base: 30 },
    concentration: 'edp',
  }
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)

  it('총 방울 수를 층별 추천 비율로 나누고, 방울 비율대로 향료 g 을 나눈다', () => {
    const r = suggestRecipe(prescription, 30)
    expect(r.strengthPct).toBe(18)
    expect(r.oilG).toBe(5.4)
    const drops = r.ingredients.map((g) => g.drops)
    expect(sum(drops)).toBe(30)
    expect(drops.every((d) => Number.isInteger(d) && d >= 1)).toBe(true)
    // 탑 30% · 미들 40% · 베이스 30% → 9 · 12 · 9 방울
    const layerDrops = (l: string) => sum(r.ingredients.filter((g) => g.layer === l).map((g) => g.drops))
    expect([layerDrops('top'), layerDrops('middle'), layerDrops('base')]).toEqual([9, 12, 9])
    expect(sum(r.ingredients.map((g) => g.grams))).toBeCloseTo(5.4, 5)
    expect(r.ingredients[0]).toEqual({ name: '베르가못', layer: 'top', drops: 5, grams: 0.9 })
  })

  it('노트가 많아도 최소 1방울씩 준다', () => {
    const r = suggestRecipe(prescription, 30, 18, 4)
    expect(r.ingredients.every((g) => g.drops >= 1)).toBe(true)
  })
})

describe('방울 → g 변환', () => {
  it('방울 비율대로 향료 총량을 나눈다', () => {
    expect(gramsFromDrops([3, 5, 2], 5)).toEqual([1.5, 2.5, 1])
    // 반올림 오차는 마지막 재료가 맞춘다
    const g = gramsFromDrops([1, 1, 1], 1)
    expect(g.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 5)
  })

  it('방울이 0인 재료는 0g, 방울이 없거나 목표가 0이면 모두 0g', () => {
    expect(gramsFromDrops([2, 0, 2], 4)).toEqual([2, 0, 2])
    expect(gramsFromDrops([0, 0], 4)).toEqual([0, 0])
    expect(gramsFromDrops([1, 2], 0)).toEqual([0, 0])
  })
})
