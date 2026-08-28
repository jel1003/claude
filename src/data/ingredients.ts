import type { Ingredient, IngredientCategory } from '../core/types'

export const CATEGORY_ORDER: IngredientCategory[] = [
  '채소',
  '육류',
  '해산물',
  '유제품·계란',
  '곡물·면',
  '가공식품',
  '과일',
  '양념·상비',
]

export const INGREDIENTS: Ingredient[] = [
  // ── 채소 ──────────────────────────────────────────────
  { id: 'onion', name: '양파', category: '채소', freshDays: 21 },
  { id: 'green-onion', name: '대파', category: '채소', freshDays: 10, substitutes: ['onion'] },
  { id: 'garlic', name: '마늘', category: '채소', freshDays: 30 },
  { id: 'carrot', name: '당근', category: '채소', freshDays: 21 },
  { id: 'potato', name: '감자', category: '채소', freshDays: 30 },
  { id: 'sweet-potato', name: '고구마', category: '채소', freshDays: 30 },
  { id: 'zucchini', name: '애호박', category: '채소', freshDays: 7 },
  { id: 'cabbage', name: '양배추', category: '채소', freshDays: 14 },
  { id: 'napa-cabbage', name: '배추', category: '채소', freshDays: 10 },
  { id: 'spinach', name: '시금치', category: '채소', freshDays: 4 },
  { id: 'bean-sprout', name: '콩나물', category: '채소', freshDays: 3 },
  { id: 'mushroom', name: '버섯', category: '채소', freshDays: 6 },
  { id: 'cucumber', name: '오이', category: '채소', freshDays: 7 },
  { id: 'tomato', name: '토마토', category: '채소', freshDays: 7 },
  { id: 'paprika', name: '파프리카', category: '채소', freshDays: 10, substitutes: ['bell-pepper'] },
  { id: 'bell-pepper', name: '피망', category: '채소', freshDays: 10, substitutes: ['paprika'] },
  { id: 'chili', name: '청양고추', category: '채소', freshDays: 10 },
  { id: 'lettuce', name: '상추', category: '채소', freshDays: 5 },
  { id: 'perilla-leaf', name: '깻잎', category: '채소', freshDays: 5 },
  { id: 'radish', name: '무', category: '채소', freshDays: 21 },
  { id: 'broccoli', name: '브로콜리', category: '채소', freshDays: 7 },
  { id: 'kimchi', name: '김치', category: '채소', freshDays: 60 },

  // ── 육류 ──────────────────────────────────────────────
  { id: 'pork-belly', name: '삼겹살', category: '육류', freshDays: 3 },
  { id: 'pork-front-leg', name: '돼지 앞다리살', category: '육류', freshDays: 3, substitutes: ['pork-belly'] },
  { id: 'ground-pork', name: '다진 돼지고기', category: '육류', freshDays: 2, substitutes: ['ground-beef'] },
  { id: 'beef-slice', name: '소고기 불고기감', category: '육류', freshDays: 3 },
  { id: 'ground-beef', name: '다진 소고기', category: '육류', freshDays: 2, substitutes: ['ground-pork'] },
  { id: 'chicken-breast', name: '닭가슴살', category: '육류', freshDays: 3, substitutes: ['chicken-thigh'] },
  { id: 'chicken-thigh', name: '닭다리살', category: '육류', freshDays: 3, substitutes: ['chicken-breast'] },

  // ── 해산물 ────────────────────────────────────────────
  { id: 'shrimp', name: '새우', category: '해산물', freshDays: 3 },
  { id: 'squid', name: '오징어', category: '해산물', freshDays: 2 },
  { id: 'anchovy', name: '멸치', category: '해산물', freshDays: 90 },
  { id: 'canned-tuna', name: '참치캔', category: '해산물', freshDays: 365 },
  { id: 'mackerel', name: '고등어', category: '해산물', freshDays: 2 },
  { id: 'clam', name: '바지락', category: '해산물', freshDays: 2 },
  { id: 'dried-seaweed', name: '미역', category: '해산물', freshDays: 365 },
  { id: 'gim', name: '김', category: '해산물', freshDays: 180 },

  // ── 유제품·계란 ───────────────────────────────────────
  { id: 'egg', name: '계란', category: '유제품·계란', freshDays: 21 },
  { id: 'milk', name: '우유', category: '유제품·계란', freshDays: 7 },
  { id: 'cheese', name: '슬라이스 치즈', category: '유제품·계란', freshDays: 30 },
  { id: 'mozzarella', name: '모짜렐라 치즈', category: '유제품·계란', freshDays: 14, substitutes: ['cheese'] },
  { id: 'butter', name: '버터', category: '유제품·계란', freshDays: 60 },
  { id: 'yogurt', name: '플레인 요거트', category: '유제품·계란', freshDays: 14 },

  // ── 곡물·면 ───────────────────────────────────────────
  { id: 'rice', name: '쌀밥', category: '곡물·면', freshDays: 2 },
  { id: 'noodle-somen', name: '소면', category: '곡물·면', freshDays: 365 },
  { id: 'noodle-udon', name: '우동면', category: '곡물·면', freshDays: 30 },
  { id: 'spaghetti', name: '스파게티면', category: '곡물·면', freshDays: 365 },
  { id: 'ramen', name: '라면 사리', category: '곡물·면', freshDays: 180 },
  { id: 'bread', name: '식빵', category: '곡물·면', freshDays: 5 },
  { id: 'tortilla', name: '또띠아', category: '곡물·면', freshDays: 30 },
  { id: 'oat', name: '오트밀', category: '곡물·면', freshDays: 180 },

  // ── 가공식품 ──────────────────────────────────────────
  { id: 'tofu', name: '두부', category: '가공식품', freshDays: 7 },
  { id: 'ham', name: '햄', category: '가공식품', freshDays: 14 },
  { id: 'sausage', name: '소시지', category: '가공식품', freshDays: 14, substitutes: ['ham'] },
  { id: 'fish-cake', name: '어묵', category: '가공식품', freshDays: 10 },
  { id: 'rice-cake', name: '떡볶이떡', category: '가공식품', freshDays: 14 },
  { id: 'canned-corn', name: '옥수수콘', category: '가공식품', freshDays: 365 },
  { id: 'tomato-sauce', name: '토마토소스', category: '가공식품', freshDays: 180 },

  // ── 과일 ──────────────────────────────────────────────
  { id: 'banana', name: '바나나', category: '과일', freshDays: 5 },
  { id: 'apple', name: '사과', category: '과일', freshDays: 14 },
  { id: 'lemon', name: '레몬', category: '과일', freshDays: 14 },
  { id: 'berry', name: '냉동 베리', category: '과일', freshDays: 180 },

  // ── 양념·상비 ─────────────────────────────────────────
  { id: 'salt', name: '소금', category: '양념·상비', pantry: true },
  { id: 'sugar', name: '설탕', category: '양념·상비', pantry: true },
  { id: 'pepper', name: '후추', category: '양념·상비', pantry: true },
  { id: 'soy-sauce', name: '간장', category: '양념·상비', pantry: true },
  { id: 'gochujang', name: '고추장', category: '양념·상비', pantry: true },
  { id: 'gochugaru', name: '고춧가루', category: '양념·상비', pantry: true },
  { id: 'doenjang', name: '된장', category: '양념·상비', pantry: true },
  { id: 'sesame-oil', name: '참기름', category: '양념·상비', pantry: true },
  { id: 'cooking-oil', name: '식용유', category: '양념·상비', pantry: true },
  { id: 'vinegar', name: '식초', category: '양념·상비', pantry: true },
  { id: 'oyster-sauce', name: '굴소스', category: '양념·상비', pantry: true },
  { id: 'mayo', name: '마요네즈', category: '양념·상비', pantry: true },
  { id: 'ketchup', name: '케찹', category: '양념·상비', pantry: true },
  { id: 'sesame', name: '통깨', category: '양념·상비', pantry: true },
  { id: 'starch', name: '전분가루', category: '양념·상비', pantry: true },
  { id: 'flour', name: '밀가루', category: '양념·상비', pantry: true },
  { id: 'honey', name: '꿀', category: '양념·상비', pantry: true },
  { id: 'curry-powder', name: '카레가루', category: '양념·상비', pantry: true },
]

export const INGREDIENT_BY_ID: Map<string, Ingredient> = new Map(
  INGREDIENTS.map((ing) => [ing.id, ing]),
)

export function ingredientName(id: string): string {
  return INGREDIENT_BY_ID.get(id)?.name ?? id
}
