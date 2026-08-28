import { describe, expect, it } from 'vitest'
import { createRng, hashSeed, weightedPick } from '../src/core/rng'

describe('createRng', () => {
  it('같은 시드는 같은 수열을 낸다', () => {
    const a = createRng(hashSeed('2026-08-28#0'))
    const b = createRng(hashSeed('2026-08-28#0'))
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('다른 시드는 다른 수열을 낸다', () => {
    const a = createRng(hashSeed('2026-08-28#0'))
    const b = createRng(hashSeed('2026-08-29#0'))
    expect(a()).not.toBe(b())
  })

  it('0 이상 1 미만을 낸다', () => {
    const rng = createRng(hashSeed('seed'))
    for (let i = 0; i < 500; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('weightedPick', () => {
  it('가중치가 큰 쪽이 자주 뽑힌다', () => {
    const rng = createRng(hashSeed('pick'))
    const counts = { a: 0, b: 0 }
    for (let i = 0; i < 1000; i++) {
      const picked = weightedPick(['a', 'b'] as const, (x) => (x === 'a' ? 9 : 1), rng)
      if (picked) counts[picked]++
    }
    expect(counts.a).toBeGreaterThan(counts.b * 4)
  })

  it('후보가 없으면 undefined', () => {
    expect(weightedPick([], () => 1, Math.random)).toBeUndefined()
  })

  it('가중치가 전부 0이면 그래도 하나를 고른다', () => {
    const picked = weightedPick(['a', 'b'], () => 0, createRng(1))
    expect(['a', 'b']).toContain(picked)
  })
})
