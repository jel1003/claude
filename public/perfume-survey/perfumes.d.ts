// perfumes.js 의 타입 선언
import type { Perfume } from './engine.js'
export type { Perfume }
export const PERFUMES: Perfume[]
export const perfumeById: Record<string, Perfume>
export function searchPerfumes(query: string, limit?: number): Perfume[]
export function perfumeNoteIds(p: Perfume): string[]
