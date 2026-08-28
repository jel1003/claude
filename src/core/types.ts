/** 하루의 끼니 구분 */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner']

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
}

export type IngredientCategory =
  | '채소'
  | '과일'
  | '육류'
  | '해산물'
  | '유제품·계란'
  | '곡물·면'
  | '가공식품'
  | '양념·상비'

/** 주재료 계열 — 하루 식단에서 단백질이 겹치지 않게 하는 데 쓴다 */
export type ProteinType = 'beef' | 'pork' | 'chicken' | 'seafood' | 'egg' | 'tofu' | 'none'

/** 조리법 — 하루 식단에서 조리법이 겹치지 않게 하는 데 쓴다 */
export type CookMethod = '볶음' | '국물' | '구이' | '무침' | '찜' | '튀김' | '비조리' | '밥'

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  /** 소금·간장처럼 늘 있다고 가정할 수 있는 상비 재료 */
  pantry?: boolean
  /** 이 재료가 없을 때 대신 쓸 수 있는 재료 id 목록 */
  substitutes?: string[]
  /** 냉장 보관 시 대략적인 신선도 유지 기간(일). 유통기한 입력을 돕는 기본값 */
  freshDays?: number
}

export interface RecipeIngredient {
  id: string
  /** 4인 기준이 아니라 레시피 servings 기준 분량 */
  amount?: string
  /** true면 없어도 만들 수 있는 재료 */
  optional?: boolean
}

export interface Recipe {
  id: string
  name: string
  summary: string
  /** 어울리는 끼니 */
  slots: MealSlot[]
  /** 조리 시간(분) */
  minutes: number
  /** 1=쉬움, 2=보통, 3=조금 어려움 */
  difficulty: 1 | 2 | 3
  servings: number
  /** 1인분 기준 대략 열량 */
  kcal: number
  protein: ProteinType
  method: CookMethod
  tags: string[]
  /** 그 자체로 한 끼가 되기 어려운 밑반찬. 다른 후보가 없을 때만 끼니에 배치한다 */
  side?: boolean
  ingredients: RecipeIngredient[]
  steps: string[]
}

/** 냉장고에 들어있는 재료 한 건 */
export interface FridgeItem {
  /** Ingredient.id */
  id: string
  /** 담은 날짜 (YYYY-MM-DD) */
  addedAt: string
  /** 유통기한 (YYYY-MM-DD). 없으면 기한을 따지지 않는다 */
  expiresAt?: string
}

export type MatchStatus =
  /** 필수 재료가 전부 있음 — 지금 바로 가능 */
  | 'ready'
  /** 필수 재료가 1~2개 부족 — 조금만 사면 가능 */
  | 'almost'
  /** 그 이상 부족 */
  | 'lacking'

export interface Substitution {
  /** 원래 필요한 재료 */
  needed: string
  /** 냉장고에 있어서 대신 쓰는 재료 */
  used: string
}

export interface MatchResult {
  recipe: Recipe
  status: MatchStatus
  /** 0~1. 정렬용 종합 점수 */
  score: number
  haveEssential: string[]
  missingEssential: string[]
  haveOptional: string[]
  missingOptional: string[]
  /** 대체 재료로 메운 항목 */
  substitutions: Substitution[]
  /** 이 레시피로 소진할 수 있는 유통기한 임박 재료 */
  usesExpiring: string[]
}

export interface MatchOptions {
  /** 소금·간장 등 상비 재료는 항상 있다고 가정 (기본 true) */
  assumePantry?: boolean
  /** 대체 재료 허용 (기본 true) */
  allowSubstitutes?: boolean
  /** 'almost'로 볼 최대 부족 개수 (기본 2) */
  almostThreshold?: number
  /** 유통기한이 이 일수 안으로 남은 재료를 '임박'으로 본다 (기본 3) */
  expiringWithinDays?: number
  /** 기준 날짜 (YYYY-MM-DD). 유통기한 계산에 쓴다 */
  today?: string
}

export interface PlannedMeal {
  slot: MealSlot
  recipeId: string
  status: MatchStatus
  missingEssential: string[]
}

export interface DayPlan {
  /** YYYY-MM-DD */
  date: string
  meals: PlannedMeal[]
  /** ISO timestamp */
  generatedAt: string
  /** 같은 날 '다시 짜기'를 누른 횟수 — 시드에 섞인다 */
  nonce: number
}

export interface ShoppingItem {
  id: string
  /** 이 재료가 필요한 레시피 이름들 */
  forRecipes: string[]
}
