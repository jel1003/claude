// 설문 '좋아하는 향수' 단계에서 검색하는 향수 목록 (초안).
//
// 노트는 브랜드가 공개한 노트 구성을 요약해 설문의 노트 목록(engine.js NOTES) id 로 옮긴 것이다.
// 목록에 없는 노트는 other 에 한글 이름으로만 남긴다(화면에 참고로만 보인다).
// family 는 engine.js FAMILIES 의 id. 매장에서 쓰기 전에 브랜드 공식 설명과 한 번씩 대조할 것.

/**
 * @typedef {{ id: string, brand: string, brandKo: string, name: string, nameKo: string, family: string,
 *   top: string[], middle: string[], base: string[], other?: string[], aliases?: string[], check?: boolean }} Perfume
 * check: 노트 정보가 특히 불확실해 공식 설명으로 꼭 확인해야 하는 항목
 */

/** @type {Perfume[]} */
export const PERFUMES = [
  // 조 말론 런던
  { id: 'jm-wood-sage-sea-salt', brand: 'Jo Malone London', brandKo: '조 말론', name: 'Wood Sage & Sea Salt', nameKo: '우드 세이지 앤 씨 솔트', family: 'aromatic',
    top: ['grapefruit'], middle: ['sea_salt'], base: ['clary_sage'], other: ['앰브레트 씨드', '해초'], aliases: ['우드세이지'] },
  { id: 'jm-english-pear-freesia', brand: 'Jo Malone London', brandKo: '조 말론', name: 'English Pear & Freesia', nameKo: '잉글리쉬 페어 앤 프리지아', family: 'fruity',
    top: ['pear'], middle: ['rose'], base: ['patchouli', 'amber', 'white_musk'], other: ['멜론', '프리지아', '루바브'], aliases: ['잉페', '잉글리시 페어'] },
  { id: 'jm-peony-blush-suede', brand: 'Jo Malone London', brandKo: '조 말론', name: 'Peony & Blush Suede', nameKo: '피오니 앤 블러쉬 스웨이드', family: 'floral',
    top: ['apple'], middle: ['peony', 'jasmine', 'rose'], base: ['leather'], other: ['스웨이드', '길리플라워'], aliases: ['피오니'] },
  { id: 'jm-lime-basil-mandarin', brand: 'Jo Malone London', brandKo: '조 말론', name: 'Lime Basil & Mandarin', nameKo: '라임 바질 앤 만다린', family: 'citrus',
    top: ['mandarin', 'bergamot'], middle: ['basil', 'iris'], base: ['vetiver', 'patchouli', 'amber'], other: ['라임', '타임'], aliases: ['라바만'] },
  { id: 'jm-blackberry-bay', brand: 'Jo Malone London', brandKo: '조 말론', name: 'Blackberry & Bay', nameKo: '블랙베리 앤 베이', family: 'fruity',
    top: ['grapefruit'], middle: [], base: ['cedar', 'vetiver'], other: ['블랙베리', '월계수 잎'] },
  { id: 'jm-wild-bluebell', brand: 'Jo Malone London', brandKo: '조 말론', name: 'Wild Bluebell', nameKo: '와일드 블루벨', family: 'green',
    top: [], middle: ['lily_of_the_valley', 'clove'], base: ['white_musk'], other: ['블루벨', '감'] },
  { id: 'jm-pomegranate-noir', brand: 'Jo Malone London', brandKo: '조 말론', name: 'Pomegranate Noir', nameKo: '포머그래니트 누와르', family: 'chypre',
    top: ['raspberry', 'pink_pepper'], middle: ['rose'], base: ['guaiac', 'patchouli', 'frankincense', 'amber'], other: ['석류', '자두'] },
  { id: 'jm-myrrh-tonka', brand: 'Jo Malone London', brandKo: '조 말론', name: 'Myrrh & Tonka', nameKo: '미르 앤 통카', family: 'amber',
    top: ['lavender'], middle: ['myrrh'], base: ['tonka', 'vanilla', 'almond'] },
  { id: 'jm-nectarine-blossom-honey', brand: 'Jo Malone London', brandKo: '조 말론', name: 'Nectarine Blossom & Honey', nameKo: '넥타린 블로썸 앤 허니', family: 'fruity',
    top: ['blackcurrant', 'peach'], middle: ['honey'], base: ['vetiver'], other: ['천도복숭아', '자두'] },

  // 딥티크
  { id: 'dip-philosykos', brand: 'Diptyque', brandKo: '딥티크', name: 'Philosykos', nameKo: '필로시코스', family: 'green',
    top: ['fig'], middle: ['coconut'], base: ['cedar'], other: ['무화과 잎'] },
  { id: 'dip-do-son', brand: 'Diptyque', brandKo: '딥티크', name: 'Do Son', nameKo: '도손', family: 'floral',
    top: ['orange_blossom', 'pink_pepper'], middle: ['tuberose', 'rose', 'sea_notes'], base: ['white_musk', 'benzoin'] },
  { id: 'dip-tam-dao', brand: 'Diptyque', brandKo: '딥티크', name: 'Tam Dao', nameKo: '탐다오', family: 'woody',
    top: ['rose'], middle: ['cedar'], base: ['sandalwood', 'amber'], other: ['사이프러스', '머틀'] },
  { id: 'dip-orpheon', brand: 'Diptyque', brandKo: '딥티크', name: 'Orphéon', nameKo: '오르페옹', family: 'woody',
    top: [], middle: ['jasmine'], base: ['cedar', 'tonka'], other: ['주니퍼 베리'] },
  { id: 'dip-fleur-de-peau', brand: 'Diptyque', brandKo: '딥티크', name: 'Fleur de Peau', nameKo: '플레르 드 뽀', family: 'musk',
    top: ['pink_pepper'], middle: ['iris', 'rose'], base: ['white_musk'], other: ['앰브레트', '안젤리카'] },
  { id: 'dip-eau-rose', brand: 'Diptyque', brandKo: '딥티크', name: 'Eau Rose', nameKo: '오 로즈', family: 'floral',
    top: ['blackcurrant', 'bergamot'], middle: ['rose'], base: ['white_musk', 'cedar', 'honey'], other: ['리치', '제라늄'] },

  // 르 라보
  { id: 'll-santal-33', brand: 'Le Labo', brandKo: '르 라보', name: 'Santal 33', nameKo: '상탈 33', family: 'woody',
    top: ['cardamom', 'violet'], middle: ['iris', 'ambroxan'], base: ['sandalwood', 'cedar', 'leather'], other: ['파피루스'], aliases: ['상탈'] },
  { id: 'll-another-13', brand: 'Le Labo', brandKo: '르 라보', name: 'Another 13', nameKo: '어나더 13', family: 'musk',
    top: ['pear'], middle: ['jasmine'], base: ['ambroxan', 'white_musk', 'oakmoss'], other: ['앰브레트'] },
  { id: 'll-rose-31', brand: 'Le Labo', brandKo: '르 라보', name: 'Rose 31', nameKo: '로즈 31', family: 'woody',
    top: ['rose'], middle: ['labdanum'], base: ['oud', 'guaiac', 'cedar', 'vetiver', 'frankincense'], other: ['커민'] },
  { id: 'll-the-noir-29', brand: 'Le Labo', brandKo: '르 라보', name: 'Thé Noir 29', nameKo: '떼 누아 29', family: 'woody',
    top: ['bergamot', 'fig'], middle: ['black_tea'], base: ['cedar', 'vetiver', 'tobacco', 'white_musk'], other: ['월계수 잎'], aliases: ['테누아'] },
  { id: 'll-bergamote-22', brand: 'Le Labo', brandKo: '르 라보', name: 'Bergamote 22', nameKo: '베르가못 22', family: 'citrus',
    top: ['bergamot', 'grapefruit'], middle: ['orange_blossom'], base: ['amber', 'vetiver', 'white_musk', 'cedar'], other: ['페티그레인'] },

  // 바이레도
  { id: 'by-blanche', brand: 'Byredo', brandKo: '바이레도', name: 'Blanche', nameKo: '블랑쉬', family: 'musk',
    top: ['aldehydes', 'pink_pepper', 'rose'], middle: ['peony', 'violet', 'neroli'], base: ['sandalwood', 'white_musk'] },
  { id: 'by-gypsy-water', brand: 'Byredo', brandKo: '바이레도', name: 'Gypsy Water', nameKo: '집시 워터', family: 'woody',
    top: ['bergamot', 'lemon', 'black_pepper'], middle: ['frankincense', 'iris'], base: ['amber', 'vanilla', 'sandalwood'], other: ['주니퍼 베리', '솔잎'] },
  { id: 'by-mojave-ghost', brand: 'Byredo', brandKo: '바이레도', name: 'Mojave Ghost', nameKo: '모하비 고스트', family: 'woody',
    top: [], middle: ['magnolia', 'violet'], base: ['sandalwood', 'cedar', 'amber', 'white_musk'], other: ['앰브레트', '사포딜라'] },
  { id: 'by-bal-dafrique', brand: 'Byredo', brandKo: '바이레도', name: "Bal d'Afrique", nameKo: '발 다프리크', family: 'woody',
    top: ['bergamot', 'lemon', 'neroli', 'blackcurrant'], middle: ['violet', 'jasmine'], base: ['vetiver', 'white_musk', 'amber', 'cedar'], other: ['마리골드', '시클라멘'] },

  // 샤넬
  { id: 'ch-chance-eau-tendre', brand: 'Chanel', brandKo: '샤넬', name: 'Chance Eau Tendre', nameKo: '샹스 오 땅드르', family: 'fruity',
    top: ['grapefruit'], middle: ['jasmine'], base: ['white_musk', 'iris', 'amber'], other: ['퀸스(마르멜로)', '히아신스'], aliases: ['샹스'] },
  { id: 'ch-coco-mademoiselle', brand: 'Chanel', brandKo: '샤넬', name: 'Coco Mademoiselle', nameKo: '코코 마드모아젤', family: 'chypre',
    top: ['mandarin', 'bergamot', 'orange_blossom'], middle: ['rose', 'jasmine', 'mimosa'], base: ['patchouli', 'vetiver', 'vanilla', 'white_musk', 'tonka'], other: ['오렌지', '일랑일랑'] },
  { id: 'ch-no5', brand: 'Chanel', brandKo: '샤넬', name: 'N°5', nameKo: '넘버 5', family: 'floral',
    top: ['aldehydes', 'neroli', 'bergamot', 'lemon'], middle: ['iris', 'jasmine', 'rose', 'lily_of_the_valley'], base: ['sandalwood', 'white_musk', 'amber', 'vanilla', 'vetiver', 'oakmoss'], other: ['일랑일랑'], aliases: ['no5', '넘버파이브'] },
  { id: 'ch-bleu-de-chanel', brand: 'Chanel', brandKo: '샤넬', name: 'Bleu de Chanel', nameKo: '블루 드 샤넬', family: 'woody',
    top: ['grapefruit', 'lemon', 'mint', 'pink_pepper'], middle: ['ginger', 'jasmine'], base: ['frankincense', 'vetiver', 'cedar', 'sandalwood', 'labdanum'], other: ['넛맥'] },

  // 디올
  { id: 'di-miss-dior-blooming', brand: 'Dior', brandKo: '디올', name: 'Miss Dior Blooming Bouquet', nameKo: '미스 디올 블루밍 부케', family: 'floral',
    top: ['bergamot'], middle: ['peony', 'rose'], base: ['white_musk'], aliases: ['블루밍 부케'] },
  { id: 'di-sauvage', brand: 'Dior', brandKo: '디올', name: 'Sauvage', nameKo: '소바쥬', family: 'aromatic',
    top: ['bergamot', 'pink_pepper'], middle: ['lavender', 'black_pepper', 'vetiver', 'patchouli'], base: ['ambroxan', 'cedar', 'labdanum'], other: ['쓰촨 페퍼', '제라늄'] },
  { id: 'di-jadore', brand: 'Dior', brandKo: '디올', name: "J'adore", nameKo: '쟈도르', family: 'floral',
    top: ['pear', 'peach', 'mandarin', 'bergamot'], middle: ['jasmine', 'magnolia', 'tuberose', 'rose', 'lily_of_the_valley'], base: ['white_musk', 'vanilla', 'cedar'], other: ['멜론', '일랑일랑'] },

  // 입생로랑
  { id: 'ysl-libre', brand: 'Yves Saint Laurent', brandKo: '입생로랑', name: 'Libre', nameKo: '리브르', family: 'amber',
    top: ['lavender', 'mandarin', 'blackcurrant'], middle: ['orange_blossom', 'jasmine'], base: ['vanilla', 'white_musk', 'cedar', 'ambergris'], other: ['페티그레인'] },
  { id: 'ysl-black-opium', brand: 'Yves Saint Laurent', brandKo: '입생로랑', name: 'Black Opium', nameKo: '블랙 오피움', family: 'gourmand',
    top: ['pear', 'pink_pepper', 'orange_blossom'], middle: ['coffee', 'jasmine', 'almond'], base: ['vanilla', 'patchouli', 'cedar'], other: ['감초'] },

  // 메종 마르지엘라 레플리카
  { id: 'mm-lazy-sunday-morning', brand: 'Maison Margiela', brandKo: '메종 마르지엘라', name: 'Replica Lazy Sunday Morning', nameKo: '레이지 선데이 모닝', family: 'musk',
    top: ['aldehydes', 'pear'], middle: ['lily_of_the_valley', 'iris', 'rose'], base: ['white_musk', 'patchouli'], other: ['앰브레트'], aliases: ['레플리카', '레이지선데이'] },
  { id: 'mm-jazz-club', brand: 'Maison Margiela', brandKo: '메종 마르지엘라', name: 'Replica Jazz Club', nameKo: '재즈 클럽', family: 'amber',
    top: ['pink_pepper', 'lemon', 'neroli'], middle: ['rum', 'clary_sage', 'vetiver'], base: ['tobacco', 'vanilla'], other: ['스티락스'], aliases: ['레플리카'] },
  { id: 'mm-by-the-fireplace', brand: 'Maison Margiela', brandKo: '메종 마르지엘라', name: 'Replica By the Fireplace', nameKo: '바이 더 파이어플레이스', family: 'amber',
    top: ['pink_pepper', 'orange_blossom', 'clove'], middle: ['guaiac'], base: ['vanilla', 'peru_balsam'], other: ['밤', '주니퍼 베리', '캐시미어 우드'], aliases: ['레플리카', '파이어플레이스'] },
  { id: 'mm-beach-walk', brand: 'Maison Margiela', brandKo: '메종 마르지엘라', name: 'Replica Beach Walk', nameKo: '비치 워크', family: 'floral',
    top: ['bergamot', 'pink_pepper', 'lemon'], middle: ['coconut'], base: ['white_musk', 'cedar', 'benzoin'], other: ['일랑일랑', '헬리오트로프'], aliases: ['레플리카'] },

  // 톰 포드
  { id: 'tf-lost-cherry', brand: 'Tom Ford', brandKo: '톰 포드', name: 'Lost Cherry', nameKo: '로스트 체리', family: 'gourmand',
    top: ['almond'], middle: ['rose', 'jasmine'], base: ['peru_balsam', 'tonka', 'sandalwood', 'vetiver', 'cinnamon'], other: ['블랙 체리', '체리 리큐어'] },
  { id: 'tf-tobacco-vanille', brand: 'Tom Ford', brandKo: '톰 포드', name: 'Tobacco Vanille', nameKo: '타바코 바닐', family: 'amber',
    top: ['tobacco'], middle: ['vanilla', 'cacao', 'tonka'], base: [], other: ['담배꽃', '말린 과일', '향신료'] },
  { id: 'tf-oud-wood', brand: 'Tom Ford', brandKo: '톰 포드', name: 'Oud Wood', nameKo: '오드 우드', family: 'woody',
    top: ['cardamom'], middle: ['oud', 'sandalwood', 'vetiver'], base: ['tonka', 'vanilla', 'amber'], other: ['로즈우드', '중국 후추'] },
  { id: 'tf-neroli-portofino', brand: 'Tom Ford', brandKo: '톰 포드', name: 'Neroli Portofino', nameKo: '네롤리 포르토피노', family: 'citrus',
    top: ['bergamot', 'mandarin', 'lemon', 'lavender', 'rosemary'], middle: ['neroli', 'orange_blossom', 'jasmine'], base: ['amber'], other: ['머틀', '앰브레트', '안젤리카'] },

  // 그 밖의 니치 · 디자이너
  { id: 'adp-colonia', brand: 'Acqua di Parma', brandKo: '아쿠아 디 파르마', name: 'Colonia', nameKo: '콜로니아', family: 'citrus',
    top: ['lemon', 'bergamot'], middle: ['lavender', 'rosemary', 'rose', 'jasmine'], base: ['vetiver', 'sandalwood', 'patchouli'], other: ['스위트 오렌지', '버베나'] },
  { id: 'he-jardin-nil', brand: 'Hermès', brandKo: '에르메스', name: 'Un Jardin sur le Nil', nameKo: '운 자르뎅 쉬르 닐', family: 'green',
    top: ['grapefruit'], middle: [], base: ['frankincense', 'white_musk', 'iris'], other: ['그린 망고', '연꽃', '히아신스'], aliases: ['나일강', '닐'] },
  { id: 'he-terre', brand: 'Hermès', brandKo: '에르메스', name: "Terre d'Hermès", nameKo: '떼르 데르메스', family: 'woody',
    top: ['grapefruit'], middle: ['black_pepper'], base: ['vetiver', 'cedar', 'patchouli', 'benzoin'], other: ['오렌지', '제라늄', '미네랄'] },
  { id: 'mfk-br540', brand: 'Maison Francis Kurkdjian', brandKo: '메종 프란시스 커정', name: 'Baccarat Rouge 540', nameKo: '바카라 루쥬 540', family: 'amber',
    top: ['saffron', 'jasmine'], middle: ['ambroxan'], base: ['ambergris', 'cedar'], other: ['전나무 레진'], aliases: ['바카라', 'br540', '커정'] },
  { id: 'cr-aventus', brand: 'Creed', brandKo: '크리드', name: 'Aventus', nameKo: '어벤투스', family: 'chypre',
    top: ['bergamot', 'blackcurrant', 'apple'], middle: ['birch_tar', 'patchouli', 'jasmine', 'rose'], base: ['white_musk', 'oakmoss', 'ambergris', 'vanilla'], other: ['파인애플'] },
  { id: 'la-la-vie-est-belle', brand: 'Lancôme', brandKo: '랑콤', name: 'La Vie Est Belle', nameKo: '라비에벨', family: 'gourmand',
    top: ['blackcurrant', 'pear'], middle: ['iris', 'jasmine', 'orange_blossom'], base: ['praline', 'vanilla', 'patchouli', 'tonka'] },
  { id: 'gu-bloom', brand: 'Gucci', brandKo: '구찌', name: 'Bloom', nameKo: '블룸', family: 'floral',
    top: [], middle: ['jasmine', 'tuberose'], base: [], other: ['랑군 크리퍼'] },
  { id: 'mj-daisy', brand: 'Marc Jacobs', brandKo: '마크 제이콥스', name: 'Daisy', nameKo: '데이지', family: 'floral',
    top: ['grapefruit', 'violet_leaf'], middle: ['gardenia', 'violet', 'jasmine'], base: ['white_musk', 'vanilla'], other: ['딸기', '화이트 우드'] },
  { id: 'cl-chloe-edp', brand: 'Chloé', brandKo: '끌로에', name: 'Chloé Eau de Parfum', nameKo: '끌로에 오 드 퍼퓸', family: 'floral',
    top: ['peony'], middle: ['rose', 'magnolia', 'lily_of_the_valley'], base: ['cedar', 'amber'], other: ['리치', '프리지아'] },
  { id: 'dg-light-blue', brand: 'Dolce & Gabbana', brandKo: '돌체앤가바나', name: 'Light Blue', nameKo: '라이트 블루', family: 'citrus',
    top: ['lemon', 'apple'], middle: ['jasmine', 'rose'], base: ['cedar', 'white_musk', 'amber'], other: ['벨플라워', '대나무'] },
  { id: 'clean-warm-cotton', brand: 'Clean Reserve', brandKo: '클린', name: 'Warm Cotton', nameKo: '웜 코튼', family: 'musk',
    top: ['lemon', 'mandarin'], middle: ['orange_blossom', 'ozone'], base: ['white_musk', 'amber'], aliases: ['코튼'] },
  // 한국 브랜드 — 제품 구성과 노트를 공식 설명으로 꼭 확인할 것 (check: true)
  { id: 'tb-chamo', brand: 'TAMBURINS', brandKo: '탬버린즈', name: 'CHAMO', nameKo: '카모', family: 'aromatic', check: true,
    top: ['bergamot'], middle: [], base: ['white_musk'], other: ['캐모마일'], aliases: ['탬버린'] },
  { id: 'tb-berga-sand', brand: 'TAMBURINS', brandKo: '탬버린즈', name: 'BERGA SAND', nameKo: '베르가 샌드', family: 'woody', check: true,
    top: ['bergamot'], middle: [], base: ['sandalwood', 'white_musk'], aliases: ['탬버린', '베르가샌드'] },
  { id: 'nf-santal-cream', brand: 'NONFICTION', brandKo: '논픽션', name: 'SANTAL CREAM', nameKo: '상탈 크림', family: 'woody', check: true,
    top: ['cardamom'], middle: [], base: ['sandalwood', 'vanilla'], other: ['밀크'] },
  { id: 'nf-gentle-night', brand: 'NONFICTION', brandKo: '논픽션', name: 'GENTLE NIGHT', nameKo: '젠틀 나잇', family: 'musk', check: true,
    top: [], middle: [], base: ['white_musk'], aliases: ['젠틀나이트'] },
  { id: 'fm-cotton-hug', brand: 'FORMENT', brandKo: '포맨트', name: 'Cotton Hug', nameKo: '코튼 허그', family: 'musk', check: true,
    top: [], middle: [], base: ['white_musk'], other: ['코튼'], aliases: ['포멘트', '코튼허그'] },

  { id: 'aesop-tacit', brand: 'Aēsop', brandKo: '이솝', name: 'Tacit', nameKo: '테싯', family: 'citrus',
    top: ['yuzu'], middle: ['basil', 'clove'], base: ['vetiver'], aliases: ['태싯'] },
]

/** 검색용 정규화: 소문자, 공백 · 기호 제거 */
const norm = (s) => String(s).toLowerCase().normalize('NFC').replace(/[\s&'’.\-·°()]/g, '')

const index = PERFUMES.map((p) => ({
  p,
  text: norm([p.brand, p.brandKo, p.name, p.nameKo, ...(p.aliases ?? [])].join('|')),
  brand: norm(`${p.brand}|${p.brandKo}`),
}))

/**
 * 브랜드 · 이름(한글/영문) · 별칭으로 찾는다. 검색어를 띄어쓰기로 나눠 모든 조각이 들어 있어야 맞는 것으로 친다.
 * 이름이 검색어로 시작하면 앞에 둔다.
 */
export function searchPerfumes(query, limit = 8) {
  const parts = String(query).trim().split(/\s+/).map(norm).filter(Boolean)
  if (!parts.length) return []
  return index
    .filter(({ text }) => parts.every((q) => text.includes(q)))
    .map(({ p, text, brand }) => ({ p, rank: (norm(p.nameKo).startsWith(parts[0]) || norm(p.name).startsWith(parts[0]) ? 0 : 1) + (brand.includes(parts[0]) ? 0 : 0.5) + text.indexOf(parts[0]) / 1000 }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ p }) => p)
}

export const perfumeById = Object.fromEntries(PERFUMES.map((p) => [p.id, p]))

/** 향수에 들어 있는 (설문 노트 목록에 있는) 노트 id 전부 */
export function perfumeNoteIds(p) {
  return [...new Set([...p.top, ...p.middle, ...p.base])]
}
