/** YYYY-MM-DD 문자열로 변환 (로컬 시간 기준) */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now)
}

/** YYYY-MM-DD 를 로컬 자정 Date 로 파싱 */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/** from 에서 to 까지 남은 일수. 과거면 음수 */
export function daysBetween(from: string, to: string): number {
  const ms = parseDateKey(to).getTime() - parseDateKey(from).getTime()
  return Math.round(ms / 86_400_000)
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function formatKorean(key: string): string {
  const date = parseDateKey(key)
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`
}
