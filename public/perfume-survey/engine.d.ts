// engine.js 의 타입 선언 (테스트에서 import 할 때 쓴다)

export type AccordKey = string
export type Layer = 'top' | 'middle' | 'base'
export type Weights = Record<AccordKey, number>

export interface Accord { key: AccordKey; ko: string; en: string; color: string }
export interface Family { id: string; ko: string; en: string; desc: string; accords: Weights }
export interface Note { id: string; ko: string; category: string; layer: Layer; accords: Weights }
export interface PickedNote extends Note { score: number; favorite: boolean }
export interface Descriptor { id: string; left: string; right: string; leftAccords: AccordKey[]; rightAccords: AccordKey[] }
export interface Concentration { id: string; ko: string; range: string; life: string }

export interface Answers {
  name: string
  forWhom: '' | 'self' | 'gift'
  experience: string
  seasons: string[]
  daytime: '' | 'day' | 'night' | 'both'
  occasions: string[]
  longevity: number
  sillage: number
  concentration: string
  skin: string
  families: Record<string, 1 | -1>
  accords: Record<AccordKey, -1 | 0 | 1 | 2>
  notes: Record<string, 1 | -1>
  descriptors: Record<string, number>
  moods: string[]
  gender: number | null
  lovedPerfumes: string
  dislikedPerfumes: string
  allergies: string
  memo: string
}

export interface Result {
  scores: Record<AccordKey, number>
  topAccords: (Accord & { score: number; pct: number })[]
  avoidedAccords: string[]
  family: { primary: (Family & { affinity: number }) | null; secondary: (Family & { affinity: number }) | null }
  pyramid: Record<Layer, PickedNote[]>
  ratio: Record<Layer, number>
  concentration: Concentration & { reason: string }
  avoidedNotes: string[]
  progress: { done: number; total: number; sections: boolean[] }
  confidence: 'none' | 'low' | 'mid' | 'high'
}

export const ACCORDS: Accord[]
export const FAMILIES: Family[]
export const NOTE_CATEGORIES: { id: string; ko: string }[]
export const NOTES: Note[]
export const SEASONS: { id: string; ko: string; accords: Weights }[]
export const DAYTIME: { id: string; ko: string; accords: Weights }[]
export const OCCASIONS: { id: string; ko: string }[]
export const LONGEVITY: { value: number; ko: string; hint: string }[]
export const SILLAGE: { value: number; ko: string; hint: string }[]
export const GENDER: { value: number; ko: string }[]
export const CONCENTRATIONS: Concentration[]
export const SKIN: { id: string; ko: string; hint: string }[]
export const DESCRIPTORS: Descriptor[]
export const MOODS: { id: string; ko: string; accords: AccordKey[] }[]
export const MAX_MOODS: number
export const ACCORD_RATINGS: { value: number; ko: string }[]

export function inkFor(hex: string): string
export function emptyAnswers(): Answers
export function sampleAnswers(): Answers
export function scoreAccords(answers: Answers): Record<AccordKey, number>
export function layerRatio(answers: Answers): Record<Layer, number>
export function recommendConcentration(answers: Answers): Concentration & { reason: string }
export function sectionProgress(answers: Answers): { done: number; total: number; sections: boolean[] }
export function analyze(answers: Answers): Result
export function formatSummary(answers: Answers, result: Result): string
