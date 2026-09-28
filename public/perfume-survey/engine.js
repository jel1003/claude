/**
 * 조향 상담 설문 — 데이터와 분석 로직.
 *
 * 분류 체계는 Fragrantica 의 방식을 따른다.
 *  - 메인 어코드(main accords): 향수 한 병을 요약하는 색 막대. 여기서도 결과를 어코드 막대로 보여준다.
 *  - 향 계열(olfactory family): 시트러스 · 아로마틱 푸제르 · 플로럴 · 앰버 · 우디 · 쉬프레 · 레더 …
 *  - 노트 분류: 노트 사전의 12개 카테고리 (시트러스, 과일·채소·너트, 꽃, 화이트 플라워 …)
 *  - 사용 평가: 계절 · 낮/밤 · 지속력(매우 약함~아주 오래감) · 확산력(은은함~매우 강함) · 성별 이미지 5단계
 *
 * 화면(DOM)과 분리된 순수 함수만 둔다. tests/perfumeSurvey.test.ts 가 이 파일을 직접 검사한다.
 */

/** 메인 어코드. color 는 결과 막대 색. */
export const ACCORDS = [
  { key: 'citrus', ko: '시트러스', en: 'citrus', color: '#E6D43A' },
  { key: 'fresh', ko: '프레시', en: 'fresh', color: '#9BE0E8' },
  { key: 'aromatic', ko: '아로마틱', en: 'aromatic', color: '#37A089' },
  { key: 'green', ko: '그린', en: 'green', color: '#1F8F2E' },
  { key: 'herbal', ko: '허벌', en: 'herbal', color: '#6C9A5A' },
  { key: 'aquatic', ko: '아쿠아틱', en: 'aquatic', color: '#4FBFD6' },
  { key: 'ozonic', ko: '오조닉', en: 'ozonic', color: '#A6CBE0' },
  { key: 'floral', ko: '플로럴', en: 'floral', color: '#F2628F' },
  { key: 'white_floral', ko: '화이트 플로럴', en: 'white floral', color: '#EEE6F2' },
  { key: 'rose', ko: '로즈', en: 'rose', color: '#E0146A' },
  { key: 'powdery', ko: '파우더리', en: 'powdery', color: '#EBD6CB' },
  { key: 'fruity', ko: '프루티', en: 'fruity', color: '#F2552F' },
  { key: 'sweet', ko: '스위트', en: 'sweet', color: '#E23B40' },
  { key: 'vanilla', ko: '바닐라', en: 'vanilla', color: '#F7F1B5' },
  { key: 'fresh_spicy', ko: '프레시 스파이시', en: 'fresh spicy', color: '#8CC63F' },
  { key: 'warm_spicy', ko: '웜 스파이시', en: 'warm spicy', color: '#C4380F' },
  { key: 'woody', ko: '우디', en: 'woody', color: '#7A4A1C' },
  { key: 'earthy', ko: '어시', en: 'earthy', color: '#5A4C3B' },
  { key: 'mossy', ko: '모시', en: 'mossy', color: '#5E6E31' },
  { key: 'amber', ko: '앰버', en: 'amber', color: '#B9540F' },
  { key: 'balsamic', ko: '발사믹', en: 'balsamic', color: '#A06A47' },
  { key: 'musky', ko: '머스키', en: 'musky', color: '#E2D5EA' },
  { key: 'soapy', ko: '소피(비누)', en: 'soapy', color: '#D3ECEF' },
  { key: 'aldehydic', ko: '알데하이딕', en: 'aldehydic', color: '#D6DDEE' },
  { key: 'leather', ko: '레더', en: 'leather', color: '#6E4632' },
  { key: 'smoky', ko: '스모키', en: 'smoky', color: '#7A7780' },
  { key: 'tobacco', ko: '타바코', en: 'tobacco', color: '#8E6538' },
  { key: 'oud', ko: '오우드', en: 'oud', color: '#3B2A20' },
  { key: 'animalic', ko: '애니멀릭', en: 'animalic', color: '#8A5A2E' },
]

/** 결과 막대에 쓸 글자색 (배경색 밝기에 따라). */
export function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return lum > 0.55 ? '#1E1B29' : '#FFFFFF'
}

/** 향 계열. accords 는 이 계열을 좋아할 때 올라가는 어코드와 가중치. */
export const FAMILIES = [
  { id: 'citrus', ko: '시트러스', en: 'Citrus', desc: '레몬·베르가못·자몽처럼 막 깎은 껍질의 상큼함', accords: { citrus: 2, fresh: 1, aromatic: 0.5 } },
  { id: 'aromatic', ko: '아로마틱 · 푸제르', en: 'Aromatic Fougère', desc: '라벤더·로즈마리·이끼. 면도 후 같은 단정한 허브 향', accords: { aromatic: 2, herbal: 1, fresh_spicy: 0.8, mossy: 0.5, woody: 0.5 } },
  { id: 'aquatic', ko: '아쿠아틱', en: 'Aquatic', desc: '바닷바람, 젖은 돌, 깨끗한 공기', accords: { aquatic: 2, ozonic: 1.5, fresh: 1 } },
  { id: 'green', ko: '그린', en: 'Green', desc: '갓 벤 풀, 줄기를 꺾었을 때의 쌉싸름함', accords: { green: 2, herbal: 1, fresh: 1 } },
  { id: 'floral', ko: '플로럴', en: 'Floral', desc: '장미·작약·아이리스. 꽃다발 그 자체', accords: { floral: 2, rose: 1, white_floral: 0.8, powdery: 0.5 } },
  { id: 'fruity', ko: '플로럴 프루티', en: 'Floral Fruity', desc: '복숭아·배·베리가 꽃과 섞인 발랄한 향', accords: { fruity: 2, floral: 1.2, sweet: 1 } },
  { id: 'chypre', ko: '쉬프레', en: 'Chypre', desc: '베르가못으로 열고 이끼·패츌리로 닫는 클래식한 대비', accords: { mossy: 2, earthy: 1, citrus: 1, floral: 0.8, woody: 0.5 } },
  { id: 'musk', ko: '우디 플로럴 머스크', en: 'Woody Floral Musk', desc: '갓 세탁한 셔츠, 살냄새 같은 포근함', accords: { musky: 2, powdery: 1, soapy: 0.8, woody: 0.8, floral: 0.5, aldehydic: 0.4 } },
  { id: 'gourmand', ko: '구르망 · 앰버 바닐라', en: 'Amber Vanilla', desc: '바닐라·캐러멜·통카. 디저트처럼 달콤한 향', accords: { vanilla: 2, sweet: 2, balsamic: 0.5, warm_spicy: 0.4 } },
  { id: 'amber', ko: '앰버 (오리엔탈)', en: 'Amber Spicy', desc: '레진·향신료·앰버. 따뜻하고 묵직한 잔향', accords: { amber: 2, warm_spicy: 1.5, balsamic: 1, vanilla: 0.8 } },
  { id: 'woody', ko: '우디', en: 'Woody', desc: '샌달우드·시더·베티버. 마른 나무와 흙', accords: { woody: 2, earthy: 1, fresh_spicy: 0.5, smoky: 0.4 } },
  { id: 'leather', ko: '레더', en: 'Leather', desc: '가죽·스모크·타바코. 무게감 있는 어른의 향', accords: { leather: 2, smoky: 1, tobacco: 1, animalic: 0.5, woody: 0.5 } },
]

/** 노트 사전의 카테고리 */
export const NOTE_CATEGORIES = [
  { id: 'citrus', ko: '시트러스' },
  { id: 'fruits', ko: '과일 · 채소 · 너트' },
  { id: 'flowers', ko: '꽃' },
  { id: 'white_flowers', ko: '화이트 플라워' },
  { id: 'greens', ko: '그린 · 허브 · 푸제르' },
  { id: 'spices', ko: '스파이스' },
  { id: 'sweets', ko: '스위트 · 구르망' },
  { id: 'woods', ko: '우드 · 이끼' },
  { id: 'resins', ko: '레진 · 발삼' },
  { id: 'musks', ko: '머스크 · 앰버 · 애니멀릭' },
  { id: 'beverages', ko: '음료' },
  { id: 'other', ko: '천연 · 합성 · 이색 원료' },
]

/** 노트. layer 는 피라미드에서 주로 쓰이는 자리 (top/middle/base). */
export const NOTES = [
  // 시트러스
  { id: 'bergamot', ko: '베르가못', category: 'citrus', layer: 'top', accords: { citrus: 2, fresh: 1, aromatic: 0.5 } },
  { id: 'lemon', ko: '레몬', category: 'citrus', layer: 'top', accords: { citrus: 2, fresh: 1 } },
  { id: 'grapefruit', ko: '자몽', category: 'citrus', layer: 'top', accords: { citrus: 2, fresh: 1, fruity: 0.5 } },
  { id: 'mandarin', ko: '만다린', category: 'citrus', layer: 'top', accords: { citrus: 2, sweet: 0.5, fruity: 0.5 } },
  { id: 'yuzu', ko: '유자', category: 'citrus', layer: 'top', accords: { citrus: 2, fresh: 1, green: 0.5 } },
  { id: 'neroli', ko: '네롤리', category: 'citrus', layer: 'top', accords: { citrus: 1.5, floral: 1, white_floral: 0.5 } },
  // 과일
  { id: 'pear', ko: '배', category: 'fruits', layer: 'top', accords: { fruity: 2, fresh: 1, sweet: 0.5 } },
  { id: 'blackcurrant', ko: '블랙커런트', category: 'fruits', layer: 'top', accords: { fruity: 2, green: 0.5, sweet: 0.3 } },
  { id: 'apple', ko: '사과', category: 'fruits', layer: 'top', accords: { fruity: 2, fresh: 1 } },
  { id: 'raspberry', ko: '라즈베리', category: 'fruits', layer: 'top', accords: { fruity: 2, sweet: 1 } },
  { id: 'peach', ko: '복숭아', category: 'fruits', layer: 'middle', accords: { fruity: 2, sweet: 1 } },
  { id: 'fig', ko: '무화과', category: 'fruits', layer: 'middle', accords: { green: 1.5, fruity: 1, woody: 0.5 } },
  { id: 'coconut', ko: '코코넛', category: 'fruits', layer: 'middle', accords: { sweet: 1.5, fruity: 0.5, vanilla: 0.5 } },
  { id: 'almond', ko: '아몬드', category: 'fruits', layer: 'base', accords: { sweet: 1.5, powdery: 0.5, vanilla: 0.5 } },
  // 꽃
  { id: 'rose', ko: '장미', category: 'flowers', layer: 'middle', accords: { rose: 2, floral: 1.5 } },
  { id: 'peony', ko: '작약', category: 'flowers', layer: 'middle', accords: { floral: 2, fresh: 1, rose: 0.5 } },
  { id: 'iris', ko: '아이리스', category: 'flowers', layer: 'middle', accords: { powdery: 2, floral: 1, earthy: 0.5 } },
  { id: 'violet', ko: '바이올렛', category: 'flowers', layer: 'middle', accords: { powdery: 1.5, floral: 1, green: 0.5 } },
  { id: 'lavender', ko: '라벤더', category: 'flowers', layer: 'middle', accords: { aromatic: 2, herbal: 1, fresh: 0.5 } },
  { id: 'magnolia', ko: '목련', category: 'flowers', layer: 'middle', accords: { floral: 2, citrus: 0.5, fresh: 0.5 } },
  { id: 'mimosa', ko: '미모사', category: 'flowers', layer: 'middle', accords: { powdery: 1.5, floral: 1, sweet: 0.5 } },
  { id: 'osmanthus', ko: '금목서', category: 'flowers', layer: 'middle', accords: { fruity: 1.5, floral: 1.5 } },
  // 화이트 플라워
  { id: 'jasmine', ko: '자스민', category: 'white_flowers', layer: 'middle', accords: { white_floral: 2, floral: 1, animalic: 0.3 } },
  { id: 'tuberose', ko: '튜베로즈', category: 'white_flowers', layer: 'middle', accords: { white_floral: 2, sweet: 0.5, animalic: 0.3 } },
  { id: 'gardenia', ko: '가드니아', category: 'white_flowers', layer: 'middle', accords: { white_floral: 2, floral: 1 } },
  { id: 'orange_blossom', ko: '오렌지 블로섬', category: 'white_flowers', layer: 'middle', accords: { white_floral: 2, citrus: 0.5, sweet: 0.5 } },
  { id: 'lily_of_the_valley', ko: '은방울꽃', category: 'white_flowers', layer: 'middle', accords: { white_floral: 1, floral: 1.5, fresh: 1, soapy: 0.5 } },
  // 그린 · 허브
  { id: 'mint', ko: '민트', category: 'greens', layer: 'top', accords: { fresh: 2, aromatic: 1, herbal: 0.5 } },
  { id: 'basil', ko: '바질', category: 'greens', layer: 'top', accords: { aromatic: 1.5, herbal: 1, green: 1 } },
  { id: 'rosemary', ko: '로즈마리', category: 'greens', layer: 'top', accords: { aromatic: 2, herbal: 1 } },
  { id: 'galbanum', ko: '갈바넘', category: 'greens', layer: 'top', accords: { green: 2, earthy: 0.5 } },
  { id: 'violet_leaf', ko: '바이올렛 잎', category: 'greens', layer: 'top', accords: { green: 2, fresh: 0.5 } },
  { id: 'clary_sage', ko: '클라리 세이지', category: 'greens', layer: 'middle', accords: { aromatic: 1.5, herbal: 1.5 } },
  // 스파이스
  { id: 'pink_pepper', ko: '핑크 페퍼', category: 'spices', layer: 'top', accords: { fresh_spicy: 2, fruity: 0.5 } },
  { id: 'black_pepper', ko: '블랙 페퍼', category: 'spices', layer: 'top', accords: { fresh_spicy: 1.5, warm_spicy: 0.5, woody: 0.5 } },
  { id: 'cardamom', ko: '카다멈', category: 'spices', layer: 'top', accords: { fresh_spicy: 1.5, aromatic: 1 } },
  { id: 'ginger', ko: '생강', category: 'spices', layer: 'top', accords: { fresh_spicy: 1.5, citrus: 0.5 } },
  { id: 'cinnamon', ko: '시나몬', category: 'spices', layer: 'middle', accords: { warm_spicy: 2, sweet: 0.5 } },
  { id: 'clove', ko: '정향', category: 'spices', layer: 'middle', accords: { warm_spicy: 2, woody: 0.5 } },
  { id: 'saffron', ko: '사프란', category: 'spices', layer: 'middle', accords: { warm_spicy: 1, leather: 1, powdery: 0.5 } },
  // 스위트 · 구르망
  { id: 'vanilla', ko: '바닐라', category: 'sweets', layer: 'base', accords: { vanilla: 2, sweet: 1, powdery: 0.5 } },
  { id: 'tonka', ko: '통카빈', category: 'sweets', layer: 'base', accords: { sweet: 1.5, vanilla: 1, powdery: 0.5, warm_spicy: 0.3 } },
  { id: 'caramel', ko: '캐러멜', category: 'sweets', layer: 'base', accords: { sweet: 2, vanilla: 0.5 } },
  { id: 'honey', ko: '꿀', category: 'sweets', layer: 'middle', accords: { sweet: 2, animalic: 0.3, floral: 0.3 } },
  { id: 'praline', ko: '프랄린', category: 'sweets', layer: 'base', accords: { sweet: 2, vanilla: 0.5 } },
  { id: 'cacao', ko: '카카오', category: 'sweets', layer: 'base', accords: { sweet: 1.5, earthy: 0.5 } },
  // 우드 · 이끼
  { id: 'sandalwood', ko: '샌달우드', category: 'woods', layer: 'base', accords: { woody: 2, powdery: 0.5, sweet: 0.3 } },
  { id: 'cedar', ko: '시더우드', category: 'woods', layer: 'base', accords: { woody: 2, fresh_spicy: 0.3 } },
  { id: 'vetiver', ko: '베티버', category: 'woods', layer: 'base', accords: { earthy: 1.5, woody: 1, green: 0.5, smoky: 0.5 } },
  { id: 'patchouli', ko: '패츌리', category: 'woods', layer: 'base', accords: { earthy: 2, woody: 1 } },
  { id: 'oakmoss', ko: '오크모스', category: 'woods', layer: 'base', accords: { mossy: 2, earthy: 1, green: 0.5 } },
  { id: 'guaiac', ko: '과이악우드', category: 'woods', layer: 'base', accords: { woody: 1.5, smoky: 1 } },
  { id: 'oud', ko: '오우드(침향)', category: 'woods', layer: 'base', accords: { oud: 2, woody: 1, animalic: 0.5, smoky: 0.5 } },
  // 레진 · 발삼
  { id: 'benzoin', ko: '벤조인', category: 'resins', layer: 'base', accords: { balsamic: 1.5, vanilla: 1, amber: 0.5, sweet: 0.5 } },
  { id: 'labdanum', ko: '랍다넘', category: 'resins', layer: 'base', accords: { amber: 2, leather: 0.5, balsamic: 0.5 } },
  { id: 'frankincense', ko: '유향(올리바넘)', category: 'resins', layer: 'base', accords: { smoky: 1.5, balsamic: 1, woody: 0.5 } },
  { id: 'myrrh', ko: '몰약', category: 'resins', layer: 'base', accords: { balsamic: 1.5, warm_spicy: 0.5, smoky: 0.5 } },
  { id: 'peru_balsam', ko: '페루 발삼', category: 'resins', layer: 'base', accords: { balsamic: 2, vanilla: 0.5 } },
  // 머스크 · 앰버 · 애니멀릭
  { id: 'white_musk', ko: '화이트 머스크', category: 'musks', layer: 'base', accords: { musky: 2, soapy: 0.5, powdery: 0.5 } },
  { id: 'amber', ko: '앰버', category: 'musks', layer: 'base', accords: { amber: 2, balsamic: 0.5, vanilla: 0.5, warm_spicy: 0.3 } },
  { id: 'ambergris', ko: '앰버그리스', category: 'musks', layer: 'base', accords: { amber: 1, musky: 1, aquatic: 0.5, animalic: 0.3 } },
  { id: 'ambroxan', ko: '암브록산', category: 'musks', layer: 'base', accords: { amber: 1.5, woody: 1, musky: 0.5 } },
  { id: 'leather', ko: '가죽', category: 'musks', layer: 'base', accords: { leather: 2, smoky: 0.5, animalic: 0.5 } },
  { id: 'civet', ko: '시벳(합성)', category: 'musks', layer: 'base', accords: { animalic: 2, musky: 0.5 } },
  // 음료
  { id: 'green_tea', ko: '녹차', category: 'beverages', layer: 'top', accords: { fresh: 1, green: 1, aromatic: 0.5, herbal: 0.5 } },
  { id: 'black_tea', ko: '홍차', category: 'beverages', layer: 'middle', accords: { woody: 0.5, smoky: 0.5, fresh: 0.5, sweet: 0.3 } },
  { id: 'coffee', ko: '커피', category: 'beverages', layer: 'middle', accords: { earthy: 0.5, smoky: 0.5, sweet: 0.5, woody: 0.3 } },
  { id: 'rum', ko: '럼', category: 'beverages', layer: 'base', accords: { sweet: 1, balsamic: 0.5, warm_spicy: 0.5 } },
  // 천연 · 합성 · 이색
  { id: 'aldehydes', ko: '알데하이드', category: 'other', layer: 'top', accords: { aldehydic: 2, soapy: 1, powdery: 0.5 } },
  { id: 'sea_notes', ko: '바다 노트', category: 'other', layer: 'top', accords: { aquatic: 2, ozonic: 1, fresh: 1 } },
  { id: 'ozone', ko: '오존', category: 'other', layer: 'top', accords: { ozonic: 2, fresh: 1 } },
  { id: 'sea_salt', ko: '바다 소금', category: 'other', layer: 'middle', accords: { aquatic: 1, fresh: 0.5, musky: 0.3 } },
  { id: 'tobacco', ko: '타바코 잎', category: 'other', layer: 'base', accords: { tobacco: 2, sweet: 0.5, warm_spicy: 0.5, smoky: 0.5 } },
  { id: 'birch_tar', ko: '자작나무 타르', category: 'other', layer: 'base', accords: { smoky: 2, leather: 1 } },
]

/** 계절 (Fragrantica 의 계절 투표와 같은 네 칸). 고르면 그 계절에 어울리는 어코드가 올라간다. */
export const SEASONS = [
  { id: 'spring', ko: '봄', accords: { floral: 1, green: 1, fruity: 0.5 } },
  { id: 'summer', ko: '여름', accords: { citrus: 1, aquatic: 1, fresh: 1, ozonic: 0.5 } },
  { id: 'fall', ko: '가을', accords: { woody: 1, warm_spicy: 1, earthy: 0.5, tobacco: 0.5 } },
  { id: 'winter', ko: '겨울', accords: { amber: 1, vanilla: 1, balsamic: 0.5, oud: 0.5, leather: 0.3 } },
]

export const DAYTIME = [
  { id: 'day', ko: '낮', accords: { fresh: 0.5, citrus: 0.5 } },
  { id: 'night', ko: '밤', accords: { amber: 0.5, musky: 0.3, animalic: 0.3, warm_spicy: 0.3 } },
  { id: 'both', ko: '낮·밤 모두', accords: {} },
]

export const OCCASIONS = [
  { id: 'work', ko: '출근 · 업무' },
  { id: 'daily', ko: '일상' },
  { id: 'date', ko: '데이트' },
  { id: 'event', ko: '특별한 날 · 행사' },
  { id: 'rest', ko: '휴식 · 잠들기 전' },
  { id: 'sport', ko: '운동 · 야외' },
]

/** 지속력 5단계 (very weak → eternal) */
export const LONGEVITY = [
  { value: 1, ko: '매우 약함', hint: '1시간 이내' },
  { value: 2, ko: '약함', hint: '1~2시간' },
  { value: 3, ko: '보통', hint: '3~5시간' },
  { value: 4, ko: '오래감', hint: '6~12시간' },
  { value: 5, ko: '아주 오래감', hint: '12시간 이상' },
]

/** 확산력 4단계 (intimate → enormous) */
export const SILLAGE = [
  { value: 1, ko: '은은함', hint: '피부 가까이에서만' },
  { value: 2, ko: '보통', hint: '팔 길이 정도' },
  { value: 3, ko: '강함', hint: '방 안에 머무름' },
  { value: 4, ko: '매우 강함', hint: '지나간 자리에 남음' },
]

/** 성별 이미지 5단계 (female → male). 값은 -2..2 */
export const GENDER = [
  { value: -2, ko: '여성적' },
  { value: -1, ko: '약간 여성적' },
  { value: 0, ko: '유니섹스' },
  { value: 1, ko: '약간 남성적' },
  { value: 2, ko: '남성적' },
]

export const CONCENTRATIONS = [
  { id: 'edc', ko: '오 드 코롱 (EDC)', range: '부향률 2~5%', life: '1~2시간' },
  { id: 'edt', ko: '오 드 뚜왈렛 (EDT)', range: '부향률 5~15%', life: '3~5시간' },
  { id: 'edp', ko: '오 드 퍼퓸 (EDP)', range: '부향률 15~20%', life: '5~8시간' },
  { id: 'extrait', ko: '엑스트레 드 퍼퓸 (Parfum)', range: '부향률 20~30%', life: '8시간 이상' },
]

export const SKIN = [
  { id: 'dry', ko: '건성', hint: '향이 빨리 날아가는 편' },
  { id: 'normal', ko: '중성', hint: '' },
  { id: 'oily', ko: '지성', hint: '향이 오래, 진하게 남는 편' },
  { id: 'unknown', ko: '잘 모르겠음', hint: '' },
]

/** 향 표현 축. 왼쪽(-)과 오른쪽(+)에 해당하는 어코드가 각각 올라간다. */
export const DESCRIPTORS = [
  { id: 'weight', left: '가벼운', right: '묵직한', leftAccords: ['citrus', 'fresh', 'aquatic', 'green', 'ozonic'], rightAccords: ['amber', 'oud', 'balsamic', 'leather', 'vanilla', 'woody'] },
  { id: 'sweet', left: '드라이한', right: '달콤한', leftAccords: ['woody', 'earthy', 'fresh_spicy', 'herbal', 'mossy'], rightAccords: ['sweet', 'vanilla', 'fruity'] },
  { id: 'sensual', left: '깨끗한', right: '관능적인', leftAccords: ['soapy', 'musky', 'aldehydic', 'fresh', 'ozonic'], rightAccords: ['animalic', 'white_floral', 'amber', 'oud', 'warm_spicy'] },
  { id: 'warm', left: '차가운', right: '따뜻한', leftAccords: ['aquatic', 'ozonic', 'fresh', 'fresh_spicy', 'green'], rightAccords: ['warm_spicy', 'amber', 'vanilla', 'tobacco', 'balsamic'] },
  { id: 'urban', left: '자연 그대로', right: '도시적인', leftAccords: ['green', 'herbal', 'earthy', 'mossy', 'woody'], rightAccords: ['aldehydic', 'musky', 'ozonic', 'leather'] },
]

/** 이미지 단어 (최대 3개) */
export const MOODS = [
  { id: 'crisp', ko: '청량한', accords: ['citrus', 'fresh', 'aquatic'] },
  { id: 'clean', ko: '깨끗한', accords: ['soapy', 'musky', 'fresh'] },
  { id: 'cozy', ko: '포근한', accords: ['musky', 'powdery', 'vanilla'] },
  { id: 'elegant', ko: '우아한', accords: ['floral', 'powdery', 'aldehydic'] },
  { id: 'lively', ko: '발랄한', accords: ['fruity', 'citrus', 'sweet'] },
  { id: 'calm', ko: '차분한', accords: ['woody', 'herbal', 'green'] },
  { id: 'natural', ko: '숲속 같은', accords: ['green', 'earthy', 'mossy'] },
  { id: 'sensual', ko: '관능적인', accords: ['amber', 'white_floral', 'animalic'] },
  { id: 'mysterious', ko: '신비로운', accords: ['balsamic', 'smoky', 'oud'] },
  { id: 'luxurious', ko: '고급스러운', accords: ['oud', 'leather', 'rose'] },
  { id: 'neutral', ko: '중성적인', accords: ['woody', 'aromatic', 'fresh_spicy'] },
  { id: 'nostalgic', ko: '그리운', accords: ['powdery', 'tobacco', 'sweet'] },
]
export const MAX_MOODS = 3

/** 어코드 평가 4단계 → 점수 */
const ACCORD_RATING_SCORE = { '-1': -3, 0: 0, 1: 1.5, 2: 3 }
export const ACCORD_RATINGS = [
  { value: -1, ko: '싫어요' },
  { value: 0, ko: '보통' },
  { value: 1, ko: '좋아요' },
  { value: 2, ko: '최애' },
]

export function emptyAnswers() {
  return {
    name: '',
    contact: '',
    forWhom: '',
    experience: '',
    seasons: [],
    daytime: '',
    occasions: [],
    longevity: 0,
    sillage: 0,
    concentration: 'auto',
    skin: '',
    families: {},
    accords: {},
    notes: {},
    descriptors: { weight: 0, sweet: 0, sensual: 0, warm: 0, urban: 0 },
    moods: [],
    gender: null,
    lovedPerfumes: '',
    dislikedPerfumes: '',
    allergies: '',
    memo: '',
  }
}

const accordByKey = Object.fromEntries(ACCORDS.map((a) => [a.key, a]))
const noteById = Object.fromEntries(NOTES.map((n) => [n.id, n]))
const familyById = Object.fromEntries(FAMILIES.map((f) => [f.id, f]))

function addWeights(scores, weights, factor) {
  for (const [key, w] of Object.entries(weights)) scores[key] += w * factor
}

function primaryAccord(note) {
  let best = ''
  let bestW = -Infinity
  for (const [k, w] of Object.entries(note.accords)) {
    if (w > bestW) {
      best = k
      bestW = w
    }
  }
  return best
}

/** 답변을 어코드 점수로 바꾼다. 신호가 없으면 전부 0. */
export function scoreAccords(answers) {
  const scores = Object.fromEntries(ACCORDS.map((a) => [a.key, 0]))

  for (const [key, rating] of Object.entries(answers.accords ?? {})) {
    if (key in scores) scores[key] += ACCORD_RATING_SCORE[String(rating)] ?? 0
  }

  for (const [id, pref] of Object.entries(answers.families ?? {})) {
    const fam = familyById[id]
    if (!fam) continue
    if (pref === 1) addWeights(scores, fam.accords, 1)
    else if (pref === -1) addWeights(scores, fam.accords, -1.2)
  }

  for (const d of DESCRIPTORS) {
    const v = answers.descriptors?.[d.id] ?? 0
    if (!v) continue
    const side = v < 0 ? d.leftAccords : d.rightAccords
    for (const key of side) scores[key] += Math.abs(v) * 0.6
  }

  for (const id of answers.moods ?? []) {
    const mood = MOODS.find((m) => m.id === id)
    if (mood) for (const key of mood.accords) scores[key] += 1
  }

  const seasons = SEASONS.filter((s) => (answers.seasons ?? []).includes(s.id))
  // 네 계절을 다 고르면 사실상 중립이 되도록 고른 개수로 나눈다
  for (const s of seasons) addWeights(scores, s.accords, 1.2 / seasons.length)

  const time = DAYTIME.find((t) => t.id === answers.daytime)
  if (time) addWeights(scores, time.accords, 1)

  for (const [id, pref] of Object.entries(answers.notes ?? {})) {
    const note = noteById[id]
    if (!note) continue
    addWeights(scores, note.accords, pref === 1 ? 1 : -0.5)
  }

  const g = answers.gender
  if (typeof g === 'number' && g !== 0) {
    const k = Math.abs(g) * 0.3
    const keys = g < 0 ? ['floral', 'powdery', 'sweet', 'fruity'] : ['aromatic', 'woody', 'fresh_spicy', 'leather']
    for (const key of keys) scores[key] += k
  }

  return scores
}

function noteScore(note, scores, answers) {
  let s = 0
  for (const [k, w] of Object.entries(note.accords)) s += w * scores[k]
  if (answers.notes?.[note.id] === 1) s += 4
  return s
}

/** 레이어별로 노트를 고른다. 같은 레이어에서 주 어코드가 겹칠 때마다 40%씩 감점해 구성을 다양하게 한다. */
function pickLayer(layer, scores, answers, count) {
  const candidates = NOTES.filter((n) => n.layer === layer && answers.notes?.[n.id] !== -1)
    .map((n) => ({ note: n, score: noteScore(n, scores, answers) }))
    .filter((c) => c.score > 0.5)

  const picked = []
  const usedPrimary = new Map()
  while (picked.length < count && candidates.length) {
    let bestIdx = 0
    let bestAdj = -Infinity
    candidates.forEach((c, i) => {
      const adj = c.score * 0.6 ** (usedPrimary.get(primaryAccord(c.note)) ?? 0)
      if (adj > bestAdj) {
        bestAdj = adj
        bestIdx = i
      }
    })
    const [chosen] = candidates.splice(bestIdx, 1)
    const key = primaryAccord(chosen.note)
    usedPrimary.set(key, (usedPrimary.get(key) ?? 0) + 1)
    picked.push({ ...chosen.note, score: Math.round(chosen.score * 10) / 10, favorite: answers.notes?.[chosen.note.id] === 1 })
  }
  return picked
}

/** 탑/미들/베이스 비율(%). 묵직할수록, 지속력을 원할수록 베이스 비중이 커진다. */
export function layerRatio(answers) {
  const weight = answers.descriptors?.weight ?? 0
  const longevity = answers.longevity || 3
  let top = 25 - weight * 4 - (longevity - 3) * 2
  let base = 35 + weight * 4 + (longevity - 3) * 3
  top = Math.max(12, Math.min(40, Math.round(top)))
  base = Math.max(20, Math.min(55, Math.round(base)))
  return { top, middle: 100 - top - base, base }
}

/** 부향률 추천. 고객이 직접 고른 농도가 있으면 그대로 따르되 이유를 남긴다. */
export function recommendConcentration(answers) {
  const reasons = []
  if (answers.concentration && answers.concentration !== 'auto') {
    const chosen = CONCENTRATIONS.find((c) => c.id === answers.concentration)
    if (chosen) return { ...chosen, reason: '고객이 직접 고른 농도' }
  }
  let need = answers.longevity || 3
  if (answers.longevity) reasons.push(`지속력 '${LONGEVITY[answers.longevity - 1].ko}' 희망`)
  if (answers.sillage) {
    need += (answers.sillage - 2) * 0.5
    reasons.push(`확산력 '${SILLAGE[answers.sillage - 1].ko}' 희망`)
  }
  if (answers.skin === 'dry') {
    need += 0.5
    reasons.push('건성 피부라 향이 빨리 날아감')
  } else if (answers.skin === 'oily') {
    need -= 0.5
    reasons.push('지성 피부라 향이 오래 남음')
  }
  const id = need <= 1.5 ? 'edc' : need <= 2.75 ? 'edt' : need <= 4 ? 'edp' : 'extrait'
  const c = CONCENTRATIONS.find((x) => x.id === id)
  return { ...c, reason: reasons.length ? reasons.join(' · ') : '기본값 (지속력·확산력 미응답)' }
}

/** 계열 친화도: 그 계열 어코드들의 양(+) 점수 가중 평균. 직접 고른 계열에는 가산점. */
function rankFamilies(scores, answers) {
  return FAMILIES.filter((f) => answers.families?.[f.id] !== -1)
    .map((f) => {
      let sum = 0
      let wsum = 0
      for (const [k, w] of Object.entries(f.accords)) {
        sum += w * Math.max(0, scores[k])
        wsum += w
      }
      const bonus = answers.families?.[f.id] === 1 ? 1 : 0
      return { ...f, affinity: sum / wsum + bonus }
    })
    .filter((f) => f.affinity > 0)
    .sort((a, b) => b.affinity - a.affinity)
}

/** 설문에서 답이 채워진 섹션 수 (8개 중) */
export function sectionProgress(answers) {
  const d = answers.descriptors ?? {}
  const done = [
    Boolean(answers.forWhom || answers.experience || answers.name),
    Boolean((answers.seasons ?? []).length || answers.daytime || (answers.occasions ?? []).length),
    Boolean(answers.longevity || answers.sillage || answers.skin || (answers.concentration && answers.concentration !== 'auto')),
    Object.keys(answers.families ?? {}).length > 0,
    Object.values(answers.accords ?? {}).some((v) => v !== 0),
    Object.keys(answers.notes ?? {}).length > 0,
    Object.values(d).some((v) => v !== 0) || (answers.moods ?? []).length > 0 || answers.gender !== null,
    Boolean(answers.lovedPerfumes || answers.dislikedPerfumes || answers.allergies || answers.memo),
  ]
  return { done: done.filter(Boolean).length, total: done.length, sections: done }
}

export function analyze(answers) {
  const scores = scoreAccords(answers)
  const ranked = ACCORDS.map((a) => ({ ...a, score: scores[a.key] }))
    .filter((a) => a.score > 0.3)
    .sort((a, b) => b.score - a.score)
  const max = ranked[0]?.score ?? 1
  const topAccords = ranked.slice(0, 6).map((a) => ({ ...a, pct: Math.max(8, Math.round((a.score / max) * 100)) }))
  const avoidedAccords = ACCORDS.filter((a) => scores[a.key] < -1).map((a) => a.ko)

  const families = rankFamilies(scores, answers)
  const pyramid = {
    top: pickLayer('top', scores, answers, 3),
    middle: pickLayer('middle', scores, answers, 3),
    base: pickLayer('base', scores, answers, 3),
  }
  const avoidedNotes = Object.entries(answers.notes ?? {})
    .filter(([, v]) => v === -1)
    .map(([id]) => noteById[id]?.ko)
    .filter(Boolean)

  const progress = sectionProgress(answers)
  const signal = ranked.length
  const confidence = signal === 0 ? 'none' : progress.done >= 6 ? 'high' : progress.done >= 3 ? 'mid' : 'low'

  return {
    scores,
    topAccords,
    avoidedAccords,
    family: { primary: families[0] ?? null, secondary: families[1] ?? null },
    pyramid,
    ratio: layerRatio(answers),
    concentration: recommendConcentration(answers),
    avoidedNotes,
    progress,
    confidence,
  }
}

function listKo(ids, table) {
  return ids.map((id) => table.find((x) => x.id === id)?.ko).filter(Boolean).join(', ')
}

/** 조향사에게 넘길 요약 (복사용 일반 텍스트) */
export function formatSummary(answers, result) {
  const lines = []
  const who = answers.name ? `${answers.name} 님` : '고객'
  lines.push(`[조향 상담 요약] ${who}${answers.forWhom === 'gift' ? ' (선물용)' : ''}`)
  if (answers.contact) lines.push(`연락처: ${answers.contact}`)
  lines.push('')
  if (result.family.primary) {
    const fam = [result.family.primary, result.family.secondary].filter(Boolean).map((f) => `${f.ko} (${f.en})`)
    lines.push(`향 계열: ${fam.join(' → ')}`)
  }
  if (result.topAccords.length) {
    lines.push(`메인 어코드: ${result.topAccords.map((a) => `${a.ko} ${a.pct}`).join(' / ')}`)
  }
  const layer = (arr) => arr.map((n) => n.ko + (n.favorite ? '*' : '')).join(', ') || '—'
  lines.push(`탑 ${result.ratio.top}%: ${layer(result.pyramid.top)}`)
  lines.push(`미들 ${result.ratio.middle}%: ${layer(result.pyramid.middle)}`)
  lines.push(`베이스 ${result.ratio.base}%: ${layer(result.pyramid.base)}`)
  lines.push(`농도: ${result.concentration.ko} · ${result.concentration.range} (${result.concentration.reason})`)
  lines.push('')
  if (answers.seasons.length || answers.daytime) {
    lines.push(`계절/시간: ${listKo(answers.seasons, SEASONS) || '—'} · ${DAYTIME.find((d) => d.id === answers.daytime)?.ko ?? '—'}`)
  }
  if (answers.occasions.length) lines.push(`사용 상황: ${listKo(answers.occasions, OCCASIONS)}`)
  if (answers.gender !== null) lines.push(`성별 이미지: ${GENDER.find((g) => g.value === answers.gender)?.ko}`)
  if (answers.moods.length) lines.push(`이미지 단어: ${listKo(answers.moods, MOODS)}`)
  if (result.avoidedNotes.length) lines.push(`제외 노트: ${result.avoidedNotes.join(', ')}`)
  if (result.avoidedAccords.length) lines.push(`피할 어코드: ${result.avoidedAccords.join(', ')}`)
  if (answers.allergies) lines.push(`알레르기·주의: ${answers.allergies}`)
  if (answers.lovedPerfumes) lines.push(`좋아한 향수: ${answers.lovedPerfumes}`)
  if (answers.dislikedPerfumes) lines.push(`별로였던 향수: ${answers.dislikedPerfumes}`)
  if (answers.memo) lines.push(`메모: ${answers.memo}`)
  lines.push('')
  lines.push('* 표시는 고객이 직접 좋아한다고 고른 노트')
  return lines.join('\n')
}

/** 화면의 '예시로 채워보기'용 샘플 응답 */
/** 농도별 기본 부향률 (중량 %). 실제 레시피 초안에 쓴다. */
export const STRENGTH_DEFAULT = { edc: 4, edt: 10, edp: 18, extrait: 25 }

const round2 = (n) => Math.round(n * 100) / 100

/**
 * 추천 처방을 g 단위 레시피 초안으로 바꾼다.
 * 향료 총량 = 완성 중량 × 부향률. 이것을 탑 · 미들 · 베이스 추천 비율로 나누고,
 * 같은 층의 노트끼리는 똑같이 나눈다. 0.01g 단위로 반올림하고 끝자리는 마지막 노트가 맞춘다.
 */
export function suggestRecipe(prescription, totalG, strengthPct) {
  const strength = strengthPct || STRENGTH_DEFAULT[prescription.concentration] || 18
  const oil = round2((totalG * strength) / 100)
  const layers = ['top', 'middle', 'base'].filter((l) => prescription[l]?.length)
  const ratioSum = layers.reduce((sum, l) => sum + (prescription.ratio?.[l] || 0), 0)
  const ingredients = []
  for (const layer of layers) {
    const share = ratioSum ? (prescription.ratio[layer] || 0) / ratioSum : 1 / layers.length
    const each = (oil * share) / prescription[layer].length
    for (const id of prescription[layer]) {
      ingredients.push({ name: NOTES.find((n) => n.id === id)?.ko ?? id, layer, grams: round2(each) })
    }
  }
  if (ingredients.length) {
    const last = ingredients[ingredients.length - 1]
    last.grams = round2(last.grams + oil - ingredients.reduce((sum, g) => sum + g.grams, 0))
  }
  return { strengthPct: strength, oilG: oil, ingredients }
}

export function sampleAnswers() {
  return {
    ...emptyAnswers(),
    name: '예시 고객',
    contact: '010-0000-0000',
    forWhom: 'self',
    experience: 'sometimes',
    seasons: ['spring', 'summer'],
    daytime: 'day',
    occasions: ['work', 'daily'],
    longevity: 4,
    sillage: 2,
    skin: 'dry',
    families: { citrus: 1, musk: 1, gourmand: -1 },
    accords: { citrus: 2, musky: 1, fresh: 1, woody: 1, sweet: -1, animalic: -1 },
    notes: { bergamot: 1, neroli: 1, white_musk: 1, iris: 1, caramel: -1, tuberose: -1 },
    descriptors: { weight: -1, sweet: -1, sensual: -2, warm: 0, urban: 1 },
    moods: ['clean', 'crisp', 'calm'],
    gender: 0,
    lovedPerfumes: '갓 세탁한 셔츠 같은 머스크 향',
    dislikedPerfumes: '바닐라가 진한 향수는 머리가 아팠음',
    allergies: '',
    memo: '사무실에서 은은하게 쓸 향',
  }
}
