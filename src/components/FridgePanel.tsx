import { useMemo, useState } from 'react'
import { CATEGORY_ORDER, INGREDIENTS, INGREDIENT_BY_ID } from '../data/ingredients'
import { addDays, daysBetween } from '../core/date'
import type { FridgeItem, Ingredient } from '../core/types'

/** 저장 시각을 HH:MM 으로 */
function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

interface Props {
  fridge: FridgeItem[]
  today: string
  onToggle: (ingredient: Ingredient) => void
  onSetExpiry: (id: string, expiresAt: string | undefined) => void
  onClear: () => void
  expiringWithinDays: number
  /** 마지막 저장 시각 */
  savedAt: Date | null
  /** 브라우저가 저장을 막고 있는지 */
  storageBlocked: boolean
}

export default function FridgePanel({
  fridge,
  today,
  onToggle,
  onSetExpiry,
  onClear,
  expiringWithinDays,
  savedAt,
  storageBlocked,
}: Props) {
  const [query, setQuery] = useState('')
  const [showPantry, setShowPantry] = useState(false)

  const inFridge = useMemo(() => new Map(fridge.map((item) => [item.id, item])), [fridge])

  const visible = useMemo(() => {
    const q = query.trim()
    return INGREDIENTS.filter((ing) => {
      if (ing.pantry && !showPantry) return false
      if (!q) return true
      return ing.name.includes(q) || ing.id.includes(q.toLowerCase())
    })
  }, [query, showPantry])

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: visible.filter((ing) => ing.category === category),
    })).filter((group) => group.items.length > 0)
  }, [visible])

  const withExpiry = useMemo(
    () =>
      fridge
        .filter((item) => item.expiresAt)
        .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? '')),
    [fridge],
  )

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>냉장고</h2>
            <div className="sub">가지고 있는 재료를 눌러 체크하세요</div>
          </div>
          {fridge.length > 0 && (
            <button className="btn btn-ghost btn-tiny" onClick={onClear}>
              전체 비우기
            </button>
          )}
        </div>

        <div className="search-row">
          <input
            type="search"
            value={query}
            placeholder="재료 검색 (예: 계란, 두부)"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="재료 검색"
          />
        </div>

        {grouped.length === 0 && <p className="empty">검색 결과가 없어요.</p>}

        {grouped.map(({ category, items }) => (
          <div className="category" key={category}>
            <h3>{category}</h3>
            <div className="chips">
              {items.map((ing) => {
                const item = inFridge.get(ing.id)
                const on = Boolean(item)
                const left = item?.expiresAt ? daysBetween(today, item.expiresAt) : undefined
                const soon = left !== undefined && left <= expiringWithinDays
                return (
                  <button
                    key={ing.id}
                    className={`chip${on ? ' on' : ''}${on && soon ? ' expiring' : ''}`}
                    aria-pressed={on}
                    onClick={() => onToggle(ing)}
                  >
                    {on && <span className="dot" aria-hidden="true" />}
                    {ing.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="fridge-summary">
          <span>
            체크한 재료 {fridge.length}개
            {storageBlocked ? (
              <span className="save-state blocked"> · 저장 안 됨</span>
            ) : (
              <span className="save-state"> · 자동 저장됨{savedAt ? ` ${clock(savedAt)}` : ''}</span>
            )}
          </span>
          <button className="btn btn-ghost btn-tiny" onClick={() => setShowPantry((v) => !v)}>
            {showPantry ? '양념·상비 숨기기' : '양념·상비 보기'}
          </button>
        </div>

        {storageBlocked && (
          <p className="notice">
            브라우저가 저장을 막고 있어서 재료가 남지 않습니다. 시크릿 모드이거나 사이트 데이터
            저장이 꺼져 있는지 확인해 주세요.
          </p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>유통기한</h2>
            <div className="sub">임박한 재료를 쓰는 메뉴를 먼저 추천해요</div>
          </div>
        </div>

        {fridge.length === 0 ? (
          <p className="empty">재료를 먼저 체크해 주세요.</p>
        ) : (
          <ul className="expiry-list">
            {fridge.map((item) => {
              const left = item.expiresAt ? daysBetween(today, item.expiresAt) : undefined
              return (
                <li key={item.id}>
                  <span className="name">{INGREDIENT_BY_ID.get(item.id)?.name ?? item.id}</span>
                  <input
                    type="date"
                    value={item.expiresAt ?? ''}
                    min={addDays(today, -30)}
                    onChange={(e) => onSetExpiry(item.id, e.target.value || undefined)}
                    aria-label={`${INGREDIENT_BY_ID.get(item.id)?.name ?? item.id} 유통기한`}
                  />
                  {left !== undefined && (
                    <span className={`days-left${left <= expiringWithinDays ? ' warn' : ''}`}>
                      {left < 0 ? `${-left}일 지남` : left === 0 ? '오늘까지' : `${left}일 남음`}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {withExpiry.length > 0 && (
          <p className="settings hint" style={{ marginTop: 10 }}>
            기한을 입력한 재료 {withExpiry.length}개 — 비우려면 날짜를 지우세요.
          </p>
        )}
      </section>
    </>
  )
}
