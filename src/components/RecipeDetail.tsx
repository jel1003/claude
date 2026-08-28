import { ingredientName } from '../data/ingredients'
import type { MatchResult } from '../core/types'

interface Props {
  match: MatchResult
  onClose: () => void
}

const STATUS_LABEL = {
  ready: '지금 만들 수 있어요',
  almost: '조금만 사면 돼요',
  lacking: '재료가 많이 부족해요',
} as const

export default function RecipeDetail({ match, onClose }: Props) {
  const { recipe } = match
  const missing = new Set([...match.missingEssential, ...match.missingOptional])
  const substituted = new Map(match.substitutions.map((s) => [s.needed, s.used]))

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{recipe.name}</h2>
        <p className="summary">{recipe.summary}</p>

        <div className="filter-row">
          <span className={`badge ${match.status}`}>{STATUS_LABEL[match.status]}</span>
          <span className="badge">{recipe.minutes}분</span>
          <span className="badge">{recipe.servings}인분</span>
          <span className="badge">{recipe.kcal}kcal</span>
          {recipe.tags.map((tag) => (
            <span className="badge" key={tag}>
              #{tag}
            </span>
          ))}
        </div>

        <h3>재료</h3>
        <div>
          {recipe.ingredients.map((item) => {
            const gone = missing.has(item.id)
            const sub = substituted.get(item.id)
            return (
              <div className={`ing-line${gone ? ' miss' : ''}`} key={item.id}>
                <span className="mark" aria-hidden="true">
                  {gone ? '✕' : '✓'}
                </span>
                <span>
                  {ingredientName(item.id)}
                  {item.optional && <span className="amount"> (선택)</span>}
                  {sub && <span className="amount"> → {ingredientName(sub)}로 대체</span>}
                </span>
                {item.amount && <span className="amount">{item.amount}</span>}
              </div>
            )
          })}
        </div>

        <h3>만드는 법</h3>
        <ol>
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
