import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, formatKorean, parseDateKey, toDateKey } from '../src/core/date'
import { isPastTime } from '../src/hooks/useDaily'

describe('날짜 유틸', () => {
  it('로컬 자정 기준으로 왕복 변환된다', () => {
    expect(toDateKey(parseDateKey('2026-08-28'))).toBe('2026-08-28')
  })

  it('월을 넘겨서 더한다', () => {
    expect(addDays('2026-08-28', 5)).toBe('2026-09-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('남은 일수를 센다', () => {
    expect(daysBetween('2026-08-28', '2026-08-31')).toBe(3)
    expect(daysBetween('2026-08-28', '2026-08-28')).toBe(0)
    expect(daysBetween('2026-08-28', '2026-08-25')).toBe(-3)
  })

  it('요일까지 한국어로 표시한다', () => {
    expect(formatKorean('2026-08-28')).toBe('8월 28일 (금)')
  })
})

describe('isPastTime', () => {
  it('설정 시각을 지났는지 판단한다', () => {
    const at = (h: number, m: number) => new Date(2026, 7, 28, h, m)
    expect(isPastTime('07:00', at(6, 59))).toBe(false)
    expect(isPastTime('07:00', at(7, 0))).toBe(true)
    expect(isPastTime('07:00', at(23, 30))).toBe(true)
  })
})
