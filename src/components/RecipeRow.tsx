import { ingredientName } from '../data/ingredients'
import type { MatchResult } from '../core/types'

interface Props {
  match: MatchResult
  onOpen: (match: MatchResult) => void
}

export default function RecipeRow({ match, onOpen }: Props) {
  const { recipe } = match
  return (
    <button className="recipe-row" onClick={() => onOpen(match)}>
      <span className={`gauge ${match.status}`}>{Math.round(match.score * 100)}</span>
      <span className="body">
        <span className="title">
          <strong>{recipe.name}</strong>
          <span className="badge">{recipe.minutes}분</span>
          {match.usesExpiring.length > 0 && (
            <span className="badge expiring">
              {ingredientName(match.usesExpiring[0] ?? '')} 소진
            </span>
          )}
        </span>
        <span className="summary" style={{ display: 'block' }}>
          {recipe.summary}
        </span>
        {match.missingEssential.length > 0 && (
          <span className="missing" style={{ display: 'block' }}>
            부족: {match.missingEssential.map(ingredientName).join(', ')}
          </span>
        )}
        {match.substitutions.length > 0 && (
          <span className="subs" style={{ display: 'block' }}>
            대체 사용:{' '}
            {match.substitutions
              .map((s) => `${ingredientName(s.needed)}→${ingredientName(s.used)}`)
              .join(', ')}
          </span>
        )}
      </span>
    </button>
  )
}
