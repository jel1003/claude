import { useMemo, useState } from 'react'
import RecipeRow from './RecipeRow'
import { MEAL_SLOTS, MEAL_SLOT_LABEL } from '../core/types'
import type { MatchResult, MealSlot } from '../core/types'

type SlotFilter = MealSlot | 'all'

interface Props {
  matches: MatchResult[]
  fridgeSize: number
  onOpen: (match: MatchResult) => void
}

const PAGE = 8

export default function RecommendList({ matches, fridgeSize, onOpen }: Props) {
  const [slot, setSlot] = useState<SlotFilter>('all')
  const [readyOnly, setReadyOnly] = useState(false)
  const [limit, setLimit] = useState(PAGE)

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (slot !== 'all' && !m.recipe.slots.includes(slot)) return false
      if (readyOnly && m.status !== 'ready') return false
      return true
    })
  }, [matches, slot, readyOnly])

  const readyCount = useMemo(() => matches.filter((m) => m.status === 'ready').length, [matches])

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>지금 만들 수 있는 메뉴</h2>
          <div className="sub">
            {fridgeSize === 0
              ? '재료를 체크하면 여기에 추천이 나와요'
              : `바로 가능 ${readyCount}개 · 전체 ${matches.length}개`}
          </div>
        </div>
      </div>

      <div className="filter-row">
        <button
          className={`chip${slot === 'all' ? ' on' : ''}`}
          onClick={() => setSlot('all')}
          aria-pressed={slot === 'all'}
        >
          전체
        </button>
        {MEAL_SLOTS.map((s) => (
          <button
            key={s}
            className={`chip${slot === s ? ' on' : ''}`}
            onClick={() => setSlot(s)}
            aria-pressed={slot === s}
          >
            {MEAL_SLOT_LABEL[s]}
          </button>
        ))}
        <button
          className={`chip${readyOnly ? ' on' : ''}`}
          onClick={() => setReadyOnly((v) => !v)}
          aria-pressed={readyOnly}
        >
          재료 다 있는 것만
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">
          {readyOnly
            ? '지금 바로 만들 수 있는 메뉴가 없어요. 필터를 풀면 조금만 사면 되는 메뉴가 보여요.'
            : '조건에 맞는 메뉴가 없어요.'}
        </p>
      ) : (
        <div className="recipe-list">
          {filtered.slice(0, limit).map((match) => (
            <RecipeRow key={match.recipe.id} match={match} onOpen={onOpen} />
          ))}
        </div>
      )}

      {filtered.length > limit && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button className="btn" onClick={() => setLimit((n) => n + PAGE)}>
            {filtered.length - limit}개 더 보기
          </button>
        </div>
      )}
    </section>
  )
}
