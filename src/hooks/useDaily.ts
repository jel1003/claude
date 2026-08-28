import { useEffect, useRef, useState } from 'react'
import { todayKey } from '../core/date'

/** 자정을 넘기면 자동으로 갱신되는 오늘 날짜(YYYY-MM-DD) */
export function useToday(): string {
  const [today, setToday] = useState(() => todayKey())

  useEffect(() => {
    const tick = () => setToday((prev) => (todayKey() === prev ? prev : todayKey()))
    const timer = window.setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [])

  return today
}

/** "HH:MM" 이 지금 시각보다 앞서 있는지 */
export function isPastTime(hhmm: string, now: Date = new Date()): boolean {
  const [h, m] = hhmm.split(':').map(Number)
  const target = new Date(now)
  target.setHours(h ?? 0, m ?? 0, 0, 0)
  return now.getTime() >= target.getTime()
}

interface AutoPlanParams {
  /** 오늘 날짜 */
  today: string
  /** 오늘 식단이 이미 있는지 */
  hasPlan: boolean
  /** 자동 생성 시각 "HH:MM" */
  planTime: string
  /** 실제 생성 동작 */
  generate: () => void
}

/**
 * 매일 아침 식단 자동 생성.
 *
 * 브라우저만으로 도는 앱이라 서버 크론 대신, 설정한 시각이 지난 뒤
 * 앱이 열려 있거나 다시 열릴 때 그날 식단이 없으면 만든다.
 * 결과는 날짜를 시드로 쓰기 때문에 몇 시에 열든 같은 식단이 나온다.
 */
export function useAutoPlan({ today, hasPlan, planTime, generate }: AutoPlanParams): void {
  const generateRef = useRef(generate)
  generateRef.current = generate

  useEffect(() => {
    if (hasPlan) return

    const check = () => {
      if (isPastTime(planTime)) generateRef.current()
    }

    check()
    const timer = window.setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [today, hasPlan, planTime])
}
