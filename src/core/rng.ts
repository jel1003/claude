/** 문자열 → 32bit 정수 시드 (FNV-1a) */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * mulberry32 — 시드가 같으면 항상 같은 수열이 나온다.
 * 같은 날짜에는 언제 열어도 같은 식단이 나오도록 하는 데 쓴다.
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

/** 가중치에 비례해 하나를 고른다. 후보가 없으면 undefined */
export function weightedPick<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  rng: () => number,
): T | undefined {
  const weights = items.map((item) => Math.max(weightOf(item), 0))
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (items.length === 0) return undefined
  if (total <= 0) return items[Math.floor(rng() * items.length)]

  let threshold = rng() * total
  for (let i = 0; i < items.length; i++) {
    threshold -= weights[i] ?? 0
    if (threshold <= 0) return items[i]
  }
  return items[items.length - 1]
}
