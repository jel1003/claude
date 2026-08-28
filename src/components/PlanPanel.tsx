import { ingredientName } from '../data/ingredients'
import { RECIPE_BY_ID } from '../data/recipes'
import { shoppingListFor, summarizePlan } from '../core/planner'
import { MEAL_SLOT_LABEL } from '../core/types'
import type { DayPlan, MatchResult } from '../core/types'

interface Props {
  plan: DayPlan | undefined
  planTime: string
  matchById: Map<string, MatchResult>
  onGenerate: () => void
  onRegenerate: () => void
  onOpen: (match: MatchResult) => void
}

export default function PlanPanel({
  plan,
  planTime,
  matchById,
  onGenerate,
  onRegenerate,
  onOpen,
}: Props) {
  if (!plan) {
    return (
      <section className="card">
        <div className="card-head">
          <div>
            <h2>오늘의 식단</h2>
            <div className="sub">매일 아침 {planTime}에 자동으로 짜여요</div>
          </div>
          <button className="btn btn-primary" onClick={onGenerate}>
            지금 짜기
          </button>
        </div>
        <p className="empty">
          아직 오늘 식단이 없어요. {planTime}이 지나 앱을 열면 자동으로 만들어집니다.
        </p>
      </section>
    )
  }

  const summary = summarizePlan(plan)
  const shopping = shoppingListFor(plan)

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>오늘의 식단</h2>
          <div className="sub">
            냉장고 기준 자동 편성 · 바로 가능 {summary.readyCount}/{summary.totalCount}끼
          </div>
        </div>
        <button className="btn" onClick={onRegenerate}>
          다시 짜기
        </button>
      </div>

      <div className="plan-grid">
        {plan.meals.map((meal) => {
          const recipe = RECIPE_BY_ID.get(meal.recipeId)
          const match = matchById.get(meal.recipeId)
          if (!recipe) return null
          const status = match?.status ?? meal.status
          const missing = match?.missingEssential ?? meal.missingEssential
          return (
            <button
              className="meal"
              key={meal.slot}
              onClick={() => match && onOpen(match)}
              disabled={!match}
            >
              <span className="slot">{MEAL_SLOT_LABEL[meal.slot]}</span>
              <span className="name">{recipe.name}</span>
              <span className="meta">
                {recipe.minutes}분 · {recipe.kcal}kcal
              </span>
              <span>
                <span className={`badge ${status}`}>
                  {status === 'ready'
                    ? '재료 있음'
                    : status === 'almost'
                      ? `${missing.length}개 부족`
                      : '재료 부족'}
                </span>
              </span>
              {missing.length > 0 && (
                <span className="meta">사야 할 것: {missing.map(ingredientName).join(', ')}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="plan-summary">
        <span>
          하루 <b>{summary.kcal}kcal</b>
        </span>
        <span>
          총 조리 <b>{summary.minutes}분</b>
        </span>
      </div>

      {shopping.length > 0 && (
        <>
          <div className="card-head" style={{ marginTop: 18, marginBottom: 10 }}>
            <div>
              <h2>장보기 목록</h2>
              <div className="sub">오늘 식단에 부족한 재료</div>
            </div>
          </div>
          <div className="shopping">
            {shopping.map((item) => (
              <span className="item" key={item.id}>
                {ingredientName(item.id)}
                <span style={{ opacity: 0.6 }}> · {item.forRecipes.join(', ')}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
