/**
 * 现代英语合成词拆解（非拉丁/希腊屈折词干）。
 * @typedef {import('./etymologyData.js').EtyPart} EtyPart
 */

/** @type {Record<string, { meaning: string, source: string }>} */
const FREE_MORPHEMES = {
  set: { meaning: '集合；放置', source: 'Old English sette「放、固定」' },
  way: { meaning: '道路；方式', source: 'Old English weg' },
  land: { meaning: '陆地', source: 'Old English land' },
  line: { meaning: '线；行', source: 'Latin linea → English line' },
  side: { meaning: '边', source: 'Old English sīde' },
  head: { meaning: '头', source: 'Old English hēafod' },
  book: { meaning: '书', source: 'Old English bōc' },
  work: { meaning: '工作', source: 'Old English weorc' },
  life: { meaning: '生命', source: 'Old English līf' },
  span: { meaning: '跨度', source: 'Old English spann' },
  hand: { meaning: '手', source: 'Old English hand' },
  pick: { meaning: '挑选', source: 'Middle English picken' },
  cast: { meaning: '投、铸', source: 'Old Norse kasta' },
  mark: { meaning: '标记', source: 'Old English mearc' },
  point: { meaning: '点', source: 'Latin punctum → English' },
  field: { meaning: '田野', source: 'Old English feld' },
  man: { meaning: '人', source: 'Old English mann' },
  woman: { meaning: '女人', source: 'Old English wīfmann' },
  child: { meaning: '孩子', source: 'Old English cild' },
  water: { meaning: '水', source: 'Old English wæter' },
  air: { meaning: '空气', source: 'Old French air' },
  fire: { meaning: '火', source: 'Old English fȳr' },
  light: { meaning: '光', source: 'Old English lēoht' },
  dark: { meaning: '暗', source: 'Old English deorc' },
  room: { meaning: '房间', source: 'Old English rūm' },
  board: { meaning: '板', source: 'Old English bord' },
  house: { meaning: '房屋', source: 'Old English hūs' },
  hold: { meaning: '持有', source: 'Old English healdan' },
  stand: { meaning: '站立', source: 'Old English standan' },
  fall: { meaning: '落下', source: 'Old English feallan' },
  break: { meaning: '打破', source: 'Old English brecan' },
  make: { meaning: '制作', source: 'Old English macian' },
  take: { meaning: '拿', source: 'Old English tacan' },
  give: { meaning: '给', source: 'Old English giefan' },
  get: { meaning: '获得', source: 'Old Norse geta' },
  go: { meaning: '去', source: 'Old English gān' },
  come: { meaning: '来', source: 'Old English cuman' },
  run: { meaning: '跑', source: 'Old English rinnan' },
  turn: { meaning: '转', source: 'Latin tornare → English' },
  play: { meaning: '玩', source: 'Old English plegan' },
  day: { meaning: '日', source: 'Old English dæg' },
  night: { meaning: '夜', source: 'Old English niht' },
  time: { meaning: '时间', source: 'Old English tīma' },
  year: { meaning: '年', source: 'Old English gēar' },
  week: { meaning: '周', source: 'Old English wicu' },
  end: { meaning: '末端', source: 'Old English endian' },
  start: { meaning: '开始', source: 'Old English steort' },
  back: { meaning: '背、后', source: 'Old English bæc' },
  fore: { meaning: '前', source: 'Old English fore' },
  after: { meaning: '之后', source: 'Old English æfter' },
  before: { meaning: '之前', source: 'Old English beforan' },
  with: { meaning: '与', source: 'Old English wiþ' },
  out: { meaning: '外', source: 'Old English ūt' },
  over: { meaning: '越过', source: 'Old English ofer' },
  under: { meaning: '在下', source: 'Old English under' },
  up: { meaning: '向上', source: 'Old English upp' },
  down: { meaning: '向下', source: 'Old English dūn' },
  side: { meaning: '侧', source: 'Old English sīde' },
  top: { meaning: '顶', source: 'Old English top' },
  bottom: { meaning: '底', source: 'Old English botm' },
  sea: { meaning: '海', source: 'Old English sǣ' },
  wave: { meaning: '浪', source: 'Old English wafu' },
  ship: { meaning: '船', source: 'Old English scip' },
  port: { meaning: '港', source: 'Latin portus → English port' },
  class: { meaning: '等级', source: 'Latin classis' },
  group: { meaning: '组', source: 'Italian gruppo' },
  type: { meaning: '类型', source: 'Greek typos' },
  form: { meaning: '形式', source: 'Latin forma' },
  graph: { meaning: '图', source: 'Greek graphein' },
  phone: { meaning: '声音', source: 'Greek phone' },
  scope: { meaning: '范围', source: 'Greek skopos' },
  meter: { meaning: '测量', source: 'Greek metron' },
  logy: { meaning: '学科', source: 'Greek -logia' },
  culture: { meaning: '文化', source: 'Latin cultura' },
  category: { meaning: '类别', source: 'Greek kategoria' },
  domain: { meaning: '领域', source: 'Latin domus' },
  marine: { meaning: '海洋', source: 'Latin mare' },
  merge: { meaning: '合并', source: 'Latin mergere' },
  divide: { meaning: '分开', source: 'Latin dividere' },
  title: { meaning: '标题', source: 'Latin titulus' },
  text: { meaning: '文本', source: 'Latin textus' },
  script: { meaning: '书写', source: 'Latin scriptum' },
  code: { meaning: '编码', source: 'Latin codex' },
  net: { meaning: '网', source: 'Old English net' },
  web: { meaning: '网', source: 'Old English webb' },
  site: { meaning: '地点', source: 'Latin situs' },
  line: { meaning: '线', source: 'Latin linea' },
  load: { meaning: '负载', source: 'Old English lād' },
  cast: { meaning: '投掷', source: 'Old Norse kasta' },
  print: { meaning: '印刷', source: 'Latin premere → impress' },
  cut: { meaning: '切', source: 'Old English cyttan' },
  strip: { meaning: '条；剥', source: 'Middle Dutch strippe' },
  bar: { meaning: '条', source: 'Old French barre' },
  bed: { meaning: '床', source: 'Old English bedd' },
  room: { meaning: '室', source: 'Old English rūm' },
  mate: { meaning: '伙伴', source: 'Middle Low German mate' },
  ship: { meaning: '船；关系', source: 'Old English -scip「状态」' },
  proof: { meaning: '证明', source: 'Latin probare' },
  worth: { meaning: '价值', source: 'Old English weorþ' },
  long: { meaning: '长', source: 'Old English lang' },
  short: { meaning: '短', source: 'Old English sceort' },
  wide: { meaning: '宽', source: 'Old English wīd' },
  high: { meaning: '高', source: 'Old English hēah' },
  low: { meaning: '低', source: 'Old Norse lāgr' },
  fast: { meaning: '快', source: 'Old English fæst' },
  slow: { meaning: '慢', source: 'Old English slāw' },
  hard: { meaning: '硬', source: 'Old English heard' },
  soft: { meaning: '软', source: 'Old English sōfte' },
  new: { meaning: '新', source: 'Old English nīwe' },
  old: { meaning: '旧', source: 'Old English eald' },
  raw: { meaning: '生的', source: 'Old English hrēaw' },
  dry: { meaning: '干', source: 'Old English drȳge' },
  wet: { meaning: '湿', source: 'Old English wǣt' },
  hot: { meaning: '热', source: 'Old English hāt' },
  cold: { meaning: '冷', source: 'Old English cald' },
  war: { meaning: '战争', source: 'Old French werre' },
  peace: { meaning: '和平', source: 'Latin pax' },
  law: { meaning: '法', source: 'Old English lagu' },
  right: { meaning: '右；权利', source: 'Old English riht' },
  left: { meaning: '左', source: 'Old English lyft' },
  self: { meaning: '自身', source: 'Old English self' },
  body: { meaning: '身体', source: 'Old English bodig' },
  mind: { meaning: '心智', source: 'Old English gemynd' },
  heart: { meaning: '心', source: 'Old English heorte' },
  eye: { meaning: '眼', source: 'Old English ēage' },
  ear: { meaning: '耳', source: 'Old English ēare' },
  mouth: { meaning: '口', source: 'Old English mūþ' },
  foot: { meaning: '脚', source: 'Old English fōt' },
  arm: { meaning: '臂', source: 'Old English earm' },
  leg: { meaning: '腿', source: 'Old Norse leggr' },
  skin: { meaning: '皮', source: 'Old Norse skinn' },
  bone: { meaning: '骨', source: 'Old English bān' },
  blood: { meaning: '血', source: 'Old English blōd' },
  green: { meaning: '绿', source: 'Old English grēne' },
  blue: { meaning: '蓝', source: 'Old French bleu' },
  red: { meaning: '红', source: 'Old English rēad' },
  white: { meaning: '白', source: 'Old English hwīt' },
  black: { meaning: '黑', source: 'Old English blæc' },
  gold: { meaning: '金', source: 'Old English gold' },
  silver: { meaning: '银', source: 'Old English seolfor' },
  iron: { meaning: '铁', source: 'Old English īren' },
  stone: { meaning: '石', source: 'Old English stān' },
  wood: { meaning: '木', source: 'Old English wudu' },
  paper: { meaning: '纸', source: 'Latin papyrus' },
  pen: { meaning: '笔', source: 'Latin penna' },
  key: { meaning: '钥匙', source: 'Old English cǣg' },
  door: { meaning: '门', source: 'Old English duru' },
  window: { meaning: '窗', source: 'Old Norse vindauga' },
  sun: { meaning: '太阳', source: 'Old English sunne' },
  moon: { meaning: '月亮', source: 'Old English mōna' },
  star: { meaning: '星', source: 'Old English steorra' },
  cloud: { meaning: '云', source: 'Old English clūd' },
  rain: { meaning: '雨', source: 'Old English regn' },
  snow: { meaning: '雪', source: 'Old English snāw' },
  wind: { meaning: '风', source: 'Old English wind' },
  storm: { meaning: '风暴', source: 'Old English storm' },
  quake: { meaning: '震动', source: 'Old English cwacian' },
  along: { meaning: '沿着', source: 'Old English andlang' },
  side: { meaning: '侧', source: 'Old English sīde' },
  mate: { meaning: '同伴', source: 'Middle Low German mate' },
  wave: { meaning: '波', source: 'Old English wafu' },
  tsunami: { meaning: '海啸', source: 'Japanese 津波（借词，整体不可拆）' },
}

/** 精确合成词条 */
/** @type {Record<string, EtyPart[]>} */
const COMPOUND_LEXICON = {
  subset: [
    { type: 'prefix', part: 'sub-', meaning: '在下、次级', etymology: 'Latin sub（现代英语中作 productive prefix）' },
    {
      type: 'root',
      part: 'set',
      meaning: '集合；一组',
      etymology: 'Old English sette「放、固定」→ 现代独立词 set（非 subtle 的 tex- 词根）',
    },
  ],
  onset: [
    { type: 'prefix', part: 'on-', meaning: '向上、开始', etymology: 'Old English on / Germanic' },
    { type: 'root', part: 'set', meaning: '放置；固定', etymology: 'Old English sette' },
  ],
  offset: [
    { type: 'prefix', part: 'off-', meaning: '离开', etymology: 'Old English of' },
    { type: 'root', part: 'set', meaning: '放置', etymology: 'Old English sette' },
  ],
  reset: [
    { type: 'prefix', part: 're-', meaning: '再', etymology: 'Latin re' },
    { type: 'root', part: 'set', meaning: '放置', etymology: 'Old English sette' },
  ],
  upset: [
    { type: 'prefix', part: 'up-', meaning: '向上', etymology: 'Old English upp' },
    { type: 'root', part: 'set', meaning: '放置', etymology: 'Old English sette' },
  ],
  lifespan: [
    { type: 'root', part: 'life', meaning: '生命', etymology: 'Old English līf' },
    { type: 'connect', part: '+', meaning: '合成', etymology: '现代英语复合' },
    { type: 'root', part: 'span', meaning: '跨度', etymology: 'Old English spann' },
  ],
  handbook: [
    { type: 'root', part: 'hand', meaning: '手', etymology: 'Old English hand' },
    { type: 'connect', part: '+', meaning: '合成', etymology: '现代英语复合' },
    { type: 'root', part: 'book', meaning: '书', etymology: 'Old English bōc' },
  ],
  undertake: [
    { type: 'prefix', part: 'under-', meaning: '在下', etymology: 'Old English under' },
    { type: 'root', part: 'take', meaning: '拿、承担', etymology: 'Old English tacan' },
  ],
  alongside: [
    { type: 'prefix', part: 'along-', meaning: '沿着', etymology: 'Old English andlang' },
    { type: 'root', part: 'side', meaning: '边', etymology: 'Old English sīde' },
  ],
  subway: [
    { type: 'prefix', part: 'sub-', meaning: '在下', etymology: 'Latin sub' },
    { type: 'root', part: 'way', meaning: '道路', etymology: 'Old English weg' },
  ],
  subculture: [
    { type: 'prefix', part: 'sub-', meaning: '次级', etymology: 'Latin sub' },
    { type: 'root', part: 'culture', meaning: '文化', etymology: 'Latin cultura' },
  ],
  subdomain: [
    { type: 'prefix', part: 'sub-', meaning: '次级', etymology: 'Latin sub' },
    { type: 'root', part: 'domain', meaning: '领域', etymology: 'Latin domus' },
  ],
}

/** @type {{ form: string, meaning: string, source: string }[]} */
const PRODUCTIVE_PREFIXES = [
  { form: 'counter', meaning: '相对、反', source: 'Latin contra' },
  { form: 'inter', meaning: '之间', source: 'Latin inter' },
  { form: 'super', meaning: '在上', source: 'Latin super' },
  { form: 'under', meaning: '在下', source: 'Old English under' },
  { form: 'over', meaning: '越过', source: 'Old English ofer' },
  { form: 'after', meaning: '之后', source: 'Old English æfter' },
  { form: 'before', meaning: '之前', source: 'Old English beforan' },
  { form: 'along', meaning: '沿着', source: 'Old English andlang' },
  { form: 'down', meaning: '向下', source: 'Old English dūn' },
  { form: 'out', meaning: '向外', source: 'Old English ūt' },
  { form: 'off', meaning: '离开', source: 'Old English of' },
  { form: 'up', meaning: '向上', source: 'Old English upp' },
  { form: 'on', meaning: '向上、附着', source: 'Old English on' },
  { form: 'in', meaning: '向内', source: 'Old English in' },
  { form: 'non', meaning: '非', source: 'Latin non' },
  { form: 'anti', meaning: '反对', source: 'Greek anti' },
  { form: 'semi', meaning: '半', source: 'Latin semi' },
  { form: 'multi', meaning: '多', source: 'Latin multus' },
  { form: 'mid', meaning: '中间', source: 'Old English mid' },
  { form: 'sub', meaning: '在下、次级', source: 'Latin sub' },
  { form: 'pre', meaning: '在前', source: 'Latin prae' },
  { form: 'post', meaning: '在后', source: 'Latin post' },
  { form: 're', meaning: '再', source: 'Latin re' },
  { form: 'de', meaning: '向下', source: 'Latin de' },
  { form: 'dis', meaning: '分开', source: 'Latin dis' },
  { form: 'mis', meaning: '错', source: 'Germanic mis-' },
  { form: 'un', meaning: '不', source: 'Germanic un-' },
  { form: 'en', meaning: '使', source: 'French en-' },
  { form: 'em', meaning: '使、入', source: 'French en- → em-' },
  { form: 'be', meaning: '围绕、使', source: 'Old English be-' },
  { form: 'with', meaning: '与', source: 'Old English wiþ' },
]

/**
 * @param {EtyPart[]} parts
 */
export function isCompoundMorphology(parts) {
  if (!parts?.length) return false
  return parts.some(
    (p) =>
      p.type === 'connect' ||
      (p.etymology && /现代|独立词|合成|Old English|Germanic/i.test(p.etymology)),
  )
}

/**
 * @param {EtyPart[]} parts
 * @returns {string | null}
 */
export function getCompoundFamilyKey(parts) {
  if (!isCompoundMorphology(parts)) return null
  const pre = parts.find((p) => p.type === 'prefix')?.part.replace(/-$/, '') || ''
  const roots = parts.filter((p) => p.type === 'root').map((p) => p.part)
  if (pre && roots.length) return `pfx:${pre}+${roots.join('+')}`
  if (roots.length >= 2) return `join:${roots.join('+')}`
  if (roots.length === 1) return `free:${roots[0]}`
  return null
}

/**
 * @param {string} token
 * @returns {EtyPart[] | null}
 */
export function decomposeCompound(token) {
  const w = token.toLowerCase().replace(/[^a-z]/g, '')
  if (!w || w.length < 4) return null

  if (COMPOUND_LEXICON[w]) return COMPOUND_LEXICON[w].map((p) => ({ ...p }))

  for (const p of PRODUCTIVE_PREFIXES) {
    if (!w.startsWith(p.form) || w.length <= p.form.length + 2) continue
    const rest = w.slice(p.form.length)
    const meta = FREE_MORPHEMES[rest]
    if (meta) {
      return [
        {
          type: 'prefix',
          part: `${p.form}-`,
          meaning: p.meaning,
          etymology: `${p.source}（现代英语 productive prefix）`,
        },
        {
          type: 'root',
          part: rest,
          meaning: meta.meaning,
          etymology: `${meta.source}（现代独立词，合成法）`,
        },
      ]
    }
  }

  for (let i = 3; i <= w.length - 3; i++) {
    const a = w.slice(0, i)
    const b = w.slice(i)
    const ma = FREE_MORPHEMES[a]
    const mb = FREE_MORPHEMES[b]
    if (ma && mb) {
      return [
        { type: 'root', part: a, meaning: ma.meaning, etymology: `${ma.source}（合成成分）` },
        { type: 'connect', part: '+', meaning: '复合', etymology: '现代英语合成法' },
        { type: 'root', part: b, meaning: mb.meaning, etymology: `${mb.source}（合成成分）` },
      ]
    }
  }

  return null
}

/**
 * @param {EtyPart[]} parts
 * @param {string} gloss
 */
export function buildCompoundEvolution(parts, gloss) {
  const segs = parts
    .filter((p) => p.type !== 'connect')
    .map((p) => `${p.part}「${p.meaning}」`)
  return `现代合成：${segs.join(' + ')} → ${gloss}`
}
