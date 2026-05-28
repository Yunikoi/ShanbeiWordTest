/**
 * 印欧语源学向词根库（本地规则，非 API）。
 * @typedef {{ type: 'prefix' | 'root' | 'suffix' | 'connect', part: string, meaning: string, etymology: string }} EtyPart
 */

import { EXTENDED_ROOTS } from './extendedRoots.js'
import { decomposeCompound } from './compoundMorphology.js'
import { GERMANIC_LEXICON } from './germanicLexicon.js'

/** @type {Record<string, { meaning: string, source: string, pie?: string }>} */
export const ROOT_ETYMOLOGY = {
  struct: { meaning: '建造、堆叠', source: 'Latin struere', pie: 'PIE *stere-「铺开、建造」' },
  stru: { meaning: '建造', source: 'Latin struere', pie: 'PIE *stere-' },
  port: { meaning: '携带、运输', source: 'Latin portare', pie: 'PIE *per-「通过、向前」' },
  dict: { meaning: '说、断言', source: 'Latin dicere', pie: 'PIE *deik-「指示、说」' },
  duc: { meaning: '引导', source: 'Latin ducere', pie: 'PIE *deuk-「拉、引导」' },
  duct: { meaning: '引导', source: 'Latin ducere', pie: 'PIE *deuk-' },
  ject: { meaning: '投掷', source: 'Latin iacere / iactum', pie: 'PIE *ye-「扔」' },
  spect: { meaning: '看', source: 'Latin specere', pie: 'PIE *spek-「看」' },
  spec: { meaning: '看', source: 'Latin specere', pie: 'PIE *spek-' },
  vert: { meaning: '转', source: 'Latin vertere', pie: 'PIE *wer-「转」' },
  vers: { meaning: '转', source: 'Latin vertere', pie: 'PIE *wer-' },
  scrib: { meaning: '写', source: 'Latin scribere', pie: 'PIE *skribh-「切、划」' },
  script: { meaning: '写', source: 'Latin scribere', pie: 'PIE *skribh-' },
  graph: { meaning: '写、画', source: 'Greek graphein', pie: 'PIE *gerbh-「刻划」' },
  gram: { meaning: '写、记录', source: 'Greek gramma', pie: 'PIE *gerbh-' },
  phon: { meaning: '声音', source: 'Greek phone', pie: 'PIE *bha-「说」' },
  log: { meaning: '说、学', source: 'Greek logos', pie: 'PIE *leg-「收集、说」' },
  leg: { meaning: '读、法', source: 'Latin lex / legere', pie: 'PIE *leg-「收集」' },
  lect: { meaning: '读、选', source: 'Latin legere', pie: 'PIE *leg-' },
  fer: { meaning: '携带', source: 'Latin ferre', pie: 'PIE *bher-「携带」' },
  lat: { meaning: '携带、带来', source: 'Latin latus (ferre)', pie: 'PIE *bher-' },
  mit: { meaning: '送', source: 'Latin mittere', pie: 'PIE *mei-「走、送」' },
  miss: { meaning: '送', source: 'Latin mittere', pie: 'PIE *mei-' },
  pos: { meaning: '放', source: 'Latin ponere', pie: 'PIE *apo-「离开」+ *dhe-「放」' },
  pon: { meaning: '放', source: 'Latin ponere', pie: 'PIE *dhe-「放」' },
  press: { meaning: '压', source: 'Latin premere', pie: 'PIE *per-「向前压」' },
  tract: { meaning: '拉', source: 'Latin trahere', pie: 'PIE *tragh-「拖、拉」' },
  tend: { meaning: '伸、趋向', source: 'Latin tendere', pie: 'PIE *ten-「拉紧」' },
  tens: { meaning: '拉紧', source: 'Latin tendere', pie: 'PIE *ten-' },
  tain: { meaning: '持有', source: 'Latin tenere', pie: 'PIE *ten-「持有」' },
  ten: { meaning: '持有', source: 'Latin tenere', pie: 'PIE *ten-' },
  ced: { meaning: '走、让', source: 'Latin cedere', pie: 'PIE *ked-「走」' },
  ceed: { meaning: '走', source: 'Latin cedere', pie: 'PIE *ked-' },
  cess: { meaning: '走', source: 'Latin cedere', pie: 'PIE *ked-' },
  grad: { meaning: '步、级', source: 'Latin gradus', pie: 'PIE *ghredh-「走」' },
  gress: { meaning: '走', source: 'Latin gradi', pie: 'PIE *ghredh-' },
  mot: { meaning: '动', source: 'Latin movere', pie: 'PIE *mei-「推、动」' },
  mov: { meaning: '动', source: 'Latin movere', pie: 'PIE *mei-' },
  mob: { meaning: '动', source: 'Latin mobilis', pie: 'PIE *mei-' },
  form: { meaning: '形、式', source: 'Latin forma', pie: 'PIE *mer-「划界」?' },
  flu: { meaning: '流', source: 'Latin fluere', pie: 'PIE *bhleu-「流」' },
  fac: { meaning: '做', source: 'Latin facere', pie: 'PIE *dhe-「做、放」' },
  fect: { meaning: '做', source: 'Latin facere', pie: 'PIE *dhe-' },
  fic: { meaning: '做', source: 'Latin facere', pie: 'PIE *dhe-' },
  gen: { meaning: '生、种', source: 'Latin genus / gignere', pie: 'PIE *gene-「生」' },
  gest: { meaning: '带、手势', source: 'Latin gerere', pie: 'PIE *bher-' },
  jud: { meaning: '判断', source: 'Latin iudicare', pie: 'PIE *deik-「说」' },
  junct: { meaning: '连接', source: 'Latin iungere', pie: 'PIE *yeug-「连接」' },
  liber: { meaning: '自由', source: 'Latin liber', pie: 'PIE *h₁leudh-「人民」' },
  loc: { meaning: '地方', source: 'Latin locus', pie: 'PIE *stel-「放」' },
  man: { meaning: '手', source: 'Latin manus', pie: 'PIE *man-「手」' },
  manu: { meaning: '手', source: 'Latin manus', pie: 'PIE *man-' },
  mand: { meaning: '命令', source: 'Latin mandare', pie: 'PIE *man- + *dhe-' },
  mem: { meaning: '记忆', source: 'Latin memor', pie: 'PIE *men-「思」' },
  min: { meaning: '小', source: 'Latin minus', pie: 'PIE *mei-「小」' },
  mir: { meaning: '惊奇', source: 'Latin mirari', pie: 'PIE *smei-「笑、惊」' },
  mort: { meaning: '死', source: 'Latin mors', pie: 'PIE *mer-「死」' },
  nat: { meaning: '生、自然', source: 'Latin nasci', pie: 'PIE *gene-「生」' },
  nov: { meaning: '新', source: 'Latin novus', pie: 'PIE *newo-「新」' },
  numer: { meaning: '数', source: 'Latin numerus', pie: 'PIE *nem-「分、数」' },
  oper: { meaning: '工作', source: 'Latin opus', pie: 'PIE *op-「工作」' },
  ord: { meaning: '顺序', source: 'Latin ordo', pie: 'PIE *ar-「连接」' },
  path: { meaning: '情、苦', source: 'Greek pathos', pie: 'PIE *kwent(h)-「苦」' },
  ped: { meaning: '脚', source: 'Latin pes', pie: 'PIE *ped-「脚」' },
  pel: { meaning: '推', source: 'Latin pellere', pie: 'PIE *pel-「推」' },
  pend: { meaning: '挂、付', source: 'Latin pendere', pie: 'PIE *(s)pen-「拉、悬」' },
  pet: { meaning: '求', source: 'Latin petere', pie: 'PIE *pet-「冲、求」' },
  plic: { meaning: '折', source: 'Latin plicare', pie: 'PIE *plek-「编、折」' },
  ply: { meaning: '折', source: 'Latin plicare', pie: 'PIE *plek-' },
  pon: { meaning: '放', source: 'Latin ponere', pie: 'PIE *dhe-' },
  pot: { meaning: '能', source: 'Latin potis', pie: 'PIE *poti-「有力」' },
  prim: { meaning: '第一', source: 'Latin primus', pie: 'PIE *per-「前」' },
  psych: { meaning: '心理', source: 'Greek psyche', pie: 'PIE *bhes-「呼吸、灵魂」' },
  quer: { meaning: '问', source: 'Latin quaerere', pie: 'PIE *kwe-「问」' },
  quir: { meaning: '求', source: 'Latin quaerere', pie: 'PIE *kwe-' },
  quis: { meaning: '求', source: 'Latin quaerere', pie: 'PIE *kwe-' },
  rupt: { meaning: '破', source: 'Latin rumpere', pie: 'PIE *runp-「破」' },
  sci: { meaning: '知', source: 'Latin scire', pie: 'PIE *skei-「切、辨」' },
  sect: { meaning: '切', source: 'Latin secare', pie: 'PIE *sek-「切」' },
  sent: { meaning: '感觉', source: 'Latin sentire', pie: 'PIE *sent-「走、感」' },
  sequ: { meaning: '跟随', source: 'Latin sequi', pie: 'PIE *sekw-「跟随」' },
  serv: { meaning: '保持、服务', source: 'Latin servare', pie: 'PIE *ser-「保护」' },
  sid: { meaning: '坐', source: 'Latin sedere', pie: 'PIE *sed-「坐」' },
  sess: { meaning: '坐', source: 'Latin sedere', pie: 'PIE *sed-' },
  sign: { meaning: '标记', source: 'Latin signum', pie: 'PIE *sekw-「跟随」' },
  sist: { meaning: '立', source: 'Latin stare', pie: 'PIE *steh₂-「站」' },
  sta: { meaning: '站', source: 'Latin stare', pie: 'PIE *steh₂-' },
  stat: { meaning: '站、状态', source: 'Latin stare', pie: 'PIE *steh₂-' },
  solv: { meaning: '解', source: 'Latin solvere', pie: 'PIE *se-lu-「松开」' },
  solu: { meaning: '解', source: 'Latin solvere', pie: 'PIE *se-lu-' },
  spir: { meaning: '呼吸', source: 'Latin spirare', pie: 'PIE *spei-「呼吸」' },
  tact: { meaning: '触', source: 'Latin tangere', pie: 'PIE *tag-「触」' },
  tend: { meaning: '伸', source: 'Latin tendere', pie: 'PIE *ten-' },
  terr: { meaning: '地', source: 'Latin terra', pie: 'PIE *ters-「干、地」' },
  test: { meaning: '见证', source: 'Latin testis', pie: 'PIE *trei-「三、证」' },
  text: { meaning: '编织', source: 'Latin texere', pie: 'PIE *teks-「织」' },
  tribut: { meaning: '给', source: 'Latin tribuere', pie: 'PIE *treb-「给」' },
  urb: { meaning: '城', source: 'Latin urbs', pie: '不确定' },
  vac: { meaning: '空', source: 'Latin vacare', pie: 'PIE *eue-「空」' },
  val: { meaning: '价值、强', source: 'Latin valere', pie: 'PIE *h₂welh₁-「强壮」' },
  ven: { meaning: '来', source: 'Latin venire', pie: 'PIE *gwa-「来」' },
  vent: { meaning: '来', source: 'Latin venire', pie: 'PIE *gwa-' },
  ver: { meaning: '真', source: 'Latin verus', pie: 'PIE *h₁wer-「真」' },
  vid: { meaning: '看', source: 'Latin videre', pie: 'PIE *weid-「看」' },
  vis: { meaning: '看', source: 'Latin visus', pie: 'PIE *weid-' },
  vit: { meaning: '生命', source: 'Latin vita', pie: 'PIE *gwei-「活」' },
  viv: { meaning: '活', source: 'Latin vivere', pie: 'PIE *gwei-' },
  voc: { meaning: '叫', source: 'Latin vocare', pie: 'PIE *wekw-「叫」' },
  volv: { meaning: '转、卷', source: 'Latin volvere', pie: 'PIE *wel-「转」' },
  vok: { meaning: '叫', source: 'Latin vocare', pie: 'PIE *wekw-' },
  vol: { meaning: '意愿', source: 'Latin velle', pie: 'PIE *wel-「愿」' },
  bio: { meaning: '生命', source: 'Greek bios', pie: 'PIE *gwei-' },
  geo: { meaning: '地', source: 'Greek ge', pie: 'PIE *dʰgeh₁-' },
  demo: { meaning: '人民', source: 'Greek demos', pie: 'PIE *da-「分」' },
  cracy: { meaning: '统治', source: 'Greek kratos', pie: 'PIE *krat-「力」' },
  crat: { meaning: '统治', source: 'Greek kratos', pie: 'PIE *krat-' },
  photo: { meaning: '光', source: 'Greek photos', pie: 'PIE *bha-「光」' },
  chron: { meaning: '时间', source: 'Greek chronos', pie: 'PIE *sker-「切、时」' },
  tempor: { meaning: '时间', source: 'Latin tempus', pie: 'PIE *tem-「切、时」' },
  theo: { meaning: '神', source: 'Greek theos', pie: 'PIE *dhes-' },
  thesis: { meaning: '放置、论题', source: 'Greek thesis', pie: 'PIE *dhe-「放」' },
  hydr: { meaning: '水', source: 'Greek hydor', pie: 'PIE *wed-' },
  therm: { meaning: '热', source: 'Greek thermos', pie: 'PIE *gʷher-' },
  anthrop: { meaning: '人', source: 'Greek anthropos', pie: 'PIE *h₂ner-' },
  phil: { meaning: '爱', source: 'Greek philos', pie: 'PIE *bheu-「成长、爱」' },
  soph: { meaning: '智慧', source: 'Greek sophos', pie: 'PIE *sebh-' },
  meter: { meaning: '测量', source: 'Greek metron', pie: 'PIE *me-「测」' },
  metr: { meaning: '测量', source: 'Greek metron', pie: 'PIE *me-' },
  scope: { meaning: '看', source: 'Greek skopos', pie: 'PIE *spek-' },
  tele: { meaning: '远', source: 'Greek tele', pie: 'PIE *kwel-「远」' },
  micro: { meaning: '小', source: 'Greek mikros', pie: 'PIE *smik-' },
  macro: { meaning: '大', source: 'Greek makros', pie: 'PIE *mak-' },
  mono: { meaning: '单', source: 'Greek monos', pie: 'PIE *sem-「一」' },
  poly: { meaning: '多', source: 'Greek polys', pie: 'PIE *pleh₁-' },
  semi: { meaning: '半', source: 'Latin semi', pie: 'PIE *semi-' },
  hem: { meaning: '半', source: 'Greek hemi', pie: 'PIE *semi-' },
  equ: { meaning: '相等', source: 'Latin aequus', pie: 'PIE *h₂eyk-' },
  ambi: { meaning: '周围', source: 'Latin ambi', pie: 'PIE *ambhi-' },
  amphi: { meaning: '两侧', source: 'Greek amphi', pie: 'PIE *ambhi-' },
  syn: { meaning: '共同', source: 'Greek syn', pie: 'PIE *ksun-' },
  sym: { meaning: '共同', source: 'Greek syn', pie: 'PIE *ksun-' },
  pir: { meaning: '试、经验', source: 'Greek peira', pie: 'PIE *per-「尝试、经历」' },
  peir: { meaning: '试、经验', source: 'Greek peira', pie: 'PIE *per-「尝试、经历」' },
  peri: { meaning: '试、经历', source: 'Latin experiri / Greek peira', pie: 'PIE *per-「尝试」' },
  flor: { meaning: '花', source: 'Latin flos', pie: 'PIE *bhel-「开、膨胀」' },
  glob: { meaning: '球', source: 'Latin globus', pie: 'PIE *gʷleb-' },
  agr: { meaning: '田、农', source: 'Latin ager', pie: 'PIE *ag-「驱、田」' },
  cult: { meaning: '耕、培养', source: 'Latin cultus', pie: 'PIE *kwel-' },
  cur: { meaning: '跑、关心', source: 'Latin currere', pie: 'PIE *kers-「跑」' },
  curr: { meaning: '跑', source: 'Latin currere', pie: 'PIE *kers-' },
  corp: { meaning: '身体', source: 'Latin corpus', pie: 'PIE *krep-' },
  cord: { meaning: '心', source: 'Latin cor', pie: 'PIE *kerd-「心」' },
  cred: { meaning: '相信', source: 'Latin credere', pie: 'PIE *kred-「信任」' },
  cap: { meaning: '头、抓', source: 'Latin caput / capere', pie: 'PIE *kap-「头/抓」' },
  cept: { meaning: '拿', source: 'Latin capere', pie: 'PIE *kap-' },
  capt: { meaning: '拿', source: 'Latin capere', pie: 'PIE *kap-' },
  civ: { meaning: '公民', source: 'Latin civis', pie: 'PIE *kei-「躺、家」' },
  civi: { meaning: '公民', source: 'Latin civis', pie: 'PIE *kei-' },
  clar: { meaning: '清楚', source: 'Latin clarus', pie: 'PIE *kleh₂-' },
  clin: { meaning: '倾、床', source: 'Latin clinare', pie: 'PIE *klei-' },
  clos: { meaning: '关', source: 'Latin claudere', pie: 'PIE *klau-' },
  clud: { meaning: '关', source: 'Latin claudere', pie: 'PIE *klau-' },
  clus: { meaning: '关', source: 'Latin claudere', pie: 'PIE *klau-' },
  tect: { meaning: '遮盖', source: 'Latin tegere', pie: 'PIE *steg-「遮盖」' },
  teg: { meaning: '遮盖', source: 'Latin tegere', pie: 'PIE *steg-「遮盖」' },
  dic: { meaning: '说、指', source: 'Latin dicere', pie: 'PIE *deik-「指示、说」' },
  cogn: { meaning: '知', source: 'Latin cognoscere', pie: 'PIE *gno-「知」' },
  gn: { meaning: '知', source: 'Greek gignoskein', pie: 'PIE *gno-' },
  gno: { meaning: '知', source: 'Greek gignoskein', pie: 'PIE *gno-' },
  labor: { meaning: '劳动', source: 'Latin labor', pie: 'PIE *lab-「滑、落」' },
  laps: { meaning: '滑', source: 'Latin labi', pie: 'PIE *lab-' },
  lect: { meaning: '读', source: 'Latin legere', pie: 'PIE *leg-' },
  lig: { meaning: '绑', source: 'Latin ligare', pie: 'PIE *leig-' },
  lingu: { meaning: '舌、语', source: 'Latin lingua', pie: 'PIE *h₁dnghu-' },
  liter: { meaning: '文字', source: 'Latin littera', pie: 'PIE *lin-「线」' },
  luc: { meaning: '光', source: 'Latin lux', pie: 'PIE *leuk-' },
  lum: { meaning: '光', source: 'Latin lumen', pie: 'PIE *leuk-' },
  magn: { meaning: '大', source: 'Latin magnus', pie: 'PIE *meg-' },
  maj: { meaning: '较大', source: 'Latin maior', pie: 'PIE *meg-' },
  maxim: { meaning: '最大', source: 'Latin maximus', pie: 'PIE *meg-' },
  mar: { meaning: '海', source: 'Latin mare', pie: 'PIE *mori-' },
  mater: { meaning: '母', source: 'Latin mater', pie: 'PIE *meh₂ter-' },
  pater: { meaning: '父', source: 'Latin pater', pie: 'PIE *ph₂ter-' },
  medi: { meaning: '中间', source: 'Latin medius', pie: 'PIE *medhyo-' },
  migr: { meaning: '迁移', source: 'Latin migrare', pie: 'PIE *mei-「变」' },
  milit: { meaning: '兵', source: 'Latin miles', pie: 'PIE *mile-' },
  mont: { meaning: '山', source: 'Latin mons', pie: 'PIE *men-' },
  mor: { meaning: '习俗、道德', source: 'Latin mos', pie: 'PIE *me-「量」' },
  morph: { meaning: '形', source: 'Greek morphe', pie: 'PIE *mer-' },
  mun: { meaning: '防御、公共', source: 'Latin munire', pie: 'PIE *mei-' },
  mut: { meaning: '变', source: 'Latin mutare', pie: 'PIE *mei-' },
  nasc: { meaning: '生', source: 'Latin nasci', pie: 'PIE *gene-' },
  nat: { meaning: '生', source: 'Latin nasci', pie: 'PIE *gene-' },
  nav: { meaning: '船', source: 'Latin navis', pie: 'PIE *nau-' },
  neg: { meaning: '否', source: 'Latin negare', pie: 'PIE *ne-' },
  noc: { meaning: '害', source: 'Latin nocere', pie: 'PIE *nek-' },
  nox: { meaning: '夜', source: 'Latin nox', pie: 'PIE *nekʷt-' },
  nomen: { meaning: '名', source: 'Latin nomen', pie: 'PIE *h₁nomn-' },
  nom: { meaning: '名', source: 'Latin nomen', pie: 'PIE *h₁nomn-' },
  norm: { meaning: '规范', source: 'Latin norma', pie: 'PIE *gn-「知」' },
  not: { meaning: '标记', source: 'Latin nota', pie: 'PIE *gno-' },
  nov: { meaning: '新', source: 'Latin novus', pie: 'PIE *newo-' },
  nutr: { meaning: '滋养', source: 'Latin nutrire', pie: 'PIE *(s)nau-' },
  ocul: { meaning: '眼', source: 'Latin oculus', pie: 'PIE *h₃ekʷ-' },
  od: { meaning: '路', source: 'Greek hodos', pie: 'PIE *sed-' },
  ol: { meaning: '闻', source: 'Latin olere', pie: 'PIE *h₃el-' },
  ora: { meaning: '说、口', source: 'Latin orare', pie: 'PIE *or-' },
  ori: { meaning: '升起', source: 'Latin oriri', pie: 'PIE *h₃er-' },
  orn: { meaning: '装饰', source: 'Latin ornare', pie: 'PIE *ar-' },
  par: { meaning: '相等、生', source: 'Latin par / parere', pie: 'PIE *per-「生」' },
  part: { meaning: '部分', source: 'Latin pars', pie: 'PIE *per-「分」' },
  pass: { meaning: '步、通过', source: 'Latin passus', pie: 'PIE *pet-' },
  pat: { meaning: '感受、父', source: 'Latin pati', pie: 'PIE *peh₁-' },
  path: { meaning: '病、情', source: 'Greek pathos', pie: 'PIE *kwent(h)-' },
  ped: { meaning: '脚', source: 'Latin pes', pie: 'PIE *ped-' },
  pel: { meaning: '推', source: 'Latin pellere', pie: 'PIE *pel-' },
  pens: { meaning: '衡量', source: 'Latin pensare', pie: 'PIE *(s)pen-' },
  petr: { meaning: '石', source: 'Greek petra', pie: 'PIE *per-' },
  phob: { meaning: '惧', source: 'Greek phobos', pie: 'PIE *bhegw-' },
  phon: { meaning: '声', source: 'Greek phone', pie: 'PIE *bha-' },
  phot: { meaning: '光', source: 'Greek photos', pie: 'PIE *bha-' },
  phys: { meaning: '自然', source: 'Greek physis', pie: 'PIE *bheu-' },
  plac: { meaning: '取悦', source: 'Latin placere', pie: 'PIE *plak-' },
  plen: { meaning: '满', source: 'Latin plenus', pie: 'PIE *pele-' },
  plic: { meaning: '折', source: 'Latin plicare', pie: 'PIE *plek-' },
  plor: { meaning: '哭喊', source: 'Latin plorare', pie: 'PIE *plu-' },
  pol: { meaning: '城市', source: 'Greek polis', pie: 'PIE *pelh₂-' },
  popul: { meaning: '人民', source: 'Latin populus', pie: 'PIE *pleh₁-' },
  pos: { meaning: '放', source: 'Latin ponere', pie: 'PIE *dhe-' },
  pot: { meaning: '饮、能', source: 'Latin potare / potis', pie: 'PIE *pō(i)-' },
  preci: { meaning: '价', source: 'Latin pretium', pie: 'PIE *per-「卖」' },
  prem: { meaning: '第一', source: 'Latin primus', pie: 'PIE *per-' },
  prop: { meaning: '自己的', source: 'Latin proprius', pie: 'PIE *pro-' },
  prox: { meaning: '近', source: 'Latin proximus', pie: 'PIE *per-' },
  psych: { meaning: '心理', source: 'Greek psyche', pie: 'PIE *bhes-' },
  publ: { meaning: '公众', source: 'Latin publicus', pie: 'PIE *publ-' },
  puls: { meaning: '推', source: 'Latin pellere', pie: 'PIE *pel-' },
  pun: { meaning: '罚', source: 'Latin punire', pie: 'PIE *kwei-' },
  pur: { meaning: '纯', source: 'Latin purus', pie: 'PIE *peu-' },
  quir: { meaning: '求', source: 'Latin quaerere', pie: 'PIE *kwe-' },
  quot: { meaning: '多少', source: 'Latin quot', pie: 'PIE *kwo-' },
  rad: { meaning: '根', source: 'Latin radix', pie: 'PIE *wrad-' },
  ras: { meaning: '刮', source: 'Latin radere', pie: 'PIE *red-' },
  rect: { meaning: '直、正', source: 'Latin regere', pie: 'PIE *h₃reg-' },
  reg: { meaning: '统治', source: 'Latin regere', pie: 'PIE *h₃reg-' },
  rig: { meaning: '直', source: 'Latin regere', pie: 'PIE *h₃reg-' },
  rupt: { meaning: '破', source: 'Latin rumpere', pie: 'PIE *runp-' },
  rot: { meaning: '轮', source: 'Latin rota', pie: 'PIE *ret-' },
  rub: { meaning: '红', source: 'Latin ruber', pie: 'PIE *h₁rewdʰ-' },
  rud: { meaning: '粗', source: 'Latin rudis', pie: 'PIE *reudh-' },
  rupt: { meaning: '破', source: 'Latin rumpere', pie: 'PIE *runp-' },
  sal: { meaning: '盐、跳', source: 'Latin sal / salire', pie: 'PIE *sal- / *sel-' },
  san: { meaning: '健康', source: 'Latin sanus', pie: 'PIE *swen-' },
  sat: { meaning: '满', source: 'Latin satis', pie: 'PIE *seh₂-' },
  scal: { meaning: '爬', source: 'Latin scala', pie: 'PIE *skand-' },
  sci: { meaning: '知', source: 'Latin scire', pie: 'PIE *skei-' },
  scrib: { meaning: '写', source: 'Latin scribere', pie: 'PIE *skribh-' },
  sec: { meaning: '切', source: 'Latin secare', pie: 'PIE *sek-' },
  sens: { meaning: '感', source: 'Latin sentire', pie: 'PIE *sent-' },
  serv: { meaning: '保持', source: 'Latin servare', pie: 'PIE *ser-' },
  sid: { meaning: '坐', source: 'Latin sedere', pie: 'PIE *sed-' },
  sign: { meaning: '记', source: 'Latin signum', pie: 'PIE *sekw-' },
  simil: { meaning: '似', source: 'Latin similis', pie: 'PIE *sem-' },
  sist: { meaning: '立', source: 'Latin sistere', pie: 'PIE *steh₂-' },
  soci: { meaning: '结伴', source: 'Latin socius', pie: 'PIE *sekʷ-' },
  sol: { meaning: '太阳、单独', source: 'Latin sol / solus', pie: 'PIE *sóh₂wl / *se-' },
  somn: { meaning: '睡', source: 'Latin somnus', pie: 'PIE *swep-' },
  son: { meaning: '声', source: 'Latin sonus', pie: 'PIE *swen-' },
  soph: { meaning: '智', source: 'Greek sophos', pie: 'PIE *sebh-' },
  sort: { meaning: '类', source: 'Latin sors', pie: 'PIE *ser-' },
  spec: { meaning: '看', source: 'Latin specere', pie: 'PIE *spek-' },
  spir: { meaning: '呼吸', source: 'Latin spirare', pie: 'PIE *spei-' },
  stat: { meaning: '站', source: 'Latin stare', pie: 'PIE *steh₂-' },
  stell: { meaning: '星', source: 'Latin stella', pie: 'PIE *h₂stḗr' },
  string: { meaning: '紧', source: 'Latin stringere', pie: 'PIE *strengh-' },
  stru: { meaning: '建', source: 'Latin struere', pie: 'PIE *stere-' },
  struct: { meaning: '建', source: 'Latin struere', pie: 'PIE *stere-' },
  sum: { meaning: '总', source: 'Latin summa', pie: 'PIE *sem-' },
  sumpt: { meaning: '取', source: 'Latin sumere', pie: 'PIE *em-' },
  super: { meaning: '上', source: 'Latin super', pie: 'PIE *uper' },
  surg: { meaning: '升起', source: 'Latin surgere', pie: 'PIE *sreg-' },
  tact: { meaning: '触', source: 'Latin tangere', pie: 'PIE *tag-' },
  tail: { meaning: '尾', source: 'Latin cauda', pie: '不确定' },
  techn: { meaning: '技艺', source: 'Greek techne', pie: 'PIE *teks-' },
  tempor: { meaning: '时', source: 'Latin tempus', pie: 'PIE *tem-' },
  tend: { meaning: '伸', source: 'Latin tendere', pie: 'PIE *ten-' },
  tent: { meaning: '触、伸', source: 'Latin tendere', pie: 'PIE *ten-' },
  term: { meaning: '界', source: 'Latin terminus', pie: 'PIE *ter-' },
  terr: { meaning: '地', source: 'Latin terra', pie: 'PIE *ters-' },
  test: { meaning: '证', source: 'Latin testis', pie: 'PIE *trei-' },
  text: { meaning: '织', source: 'Latin texere', pie: 'PIE *teks-' },
  the: { meaning: '神', source: 'Greek theos', pie: 'PIE *dhes-' },
  therm: { meaning: '热', source: 'Greek thermos', pie: 'PIE *gʷher-' },
  thes: { meaning: '放', source: 'Greek thesis', pie: 'PIE *dhe-' },
  tract: { meaning: '拉', source: 'Latin trahere', pie: 'PIE *tragh-' },
  trib: { meaning: '给', source: 'Latin tribuere', pie: 'PIE *treb-' },
  tru: { meaning: '真', source: 'Latin verus', pie: 'PIE *h₁wer-' },
  turb: { meaning: '乱', source: 'Latin turba', pie: 'PIE *twer-' },
  ult: { meaning: '远', source: 'Latin ultra', pie: 'PIE *al-' },
  urb: { meaning: '城', source: 'Latin urbs', pie: '不确定' },
  us: { meaning: '用', source: 'Latin uti', pie: 'PIE *eus-' },
  util: { meaning: '用', source: 'Latin utilis', pie: 'PIE *eus-' },
  vac: { meaning: '空', source: 'Latin vacare', pie: 'PIE *eue-' },
  val: { meaning: '强', source: 'Latin valere', pie: 'PIE *h₂welh₁-' },
  ven: { meaning: '来', source: 'Latin venire', pie: 'PIE *gwa-' },
  vent: { meaning: '来', source: 'Latin venire', pie: 'PIE *gwa-' },
  ver: { meaning: '真', source: 'Latin verus', pie: 'PIE *h₁wer-' },
  vers: { meaning: '转', source: 'Latin vertere', pie: 'PIE *wer-' },
  vert: { meaning: '转', source: 'Latin vertere', pie: 'PIE *wer-' },
  vest: { meaning: '衣', source: 'Latin vestis', pie: 'PIE *wes-' },
  vi: { meaning: '路、力', source: 'Latin via / vis', pie: 'PIE *wegh- / *wī-' },
  vic: { meaning: '胜', source: 'Latin vincere', pie: 'PIE *weik-' },
  vid: { meaning: '看', source: 'Latin videre', pie: 'PIE *weid-' },
  vil: { meaning: '贱', source: 'Latin vilis', pie: 'PIE *welh₁-' },
  vir: { meaning: '男', source: 'Latin vir', pie: 'PIE *h₁wiHr-' },
  vis: { meaning: '力', source: 'Latin vis', pie: 'PIE *wī-' },
  vit: { meaning: '命', source: 'Latin vita', pie: 'PIE *gwei-' },
  viv: { meaning: '活', source: 'Latin vivere', pie: 'PIE *gwei-' },
  voc: { meaning: '叫', source: 'Latin vocare', pie: 'PIE *wekw-' },
  vol: { meaning: '愿', source: 'Latin velle', pie: 'PIE *wel-' },
  volv: { meaning: '卷', source: 'Latin volvere', pie: 'PIE *wel-' },
  vor: { meaning: '吃', source: 'Latin vorare', pie: 'PIE *gʷer-' },
  vot: { meaning: '誓', source: 'Latin votum', pie: 'PIE *h₁wegʷ-' },
  vulg: { meaning: '普通', source: 'Latin vulgaris', pie: 'PIE *wle-' },
  zon: { meaning: '带', source: 'Greek zone', pie: 'PIE *yos-' },
}

/** @type {Record<string, { meaning: string, source: string }>} */
export const PREFIX_ETYMOLOGY = {
  ab: { meaning: '离开', source: 'Latin ab' },
  ad: { meaning: '向、至', source: 'Latin ad' },
  ac: { meaning: '向（ad 同化）', source: 'Latin ad → ac' },
  af: { meaning: '向（ad 同化）', source: 'Latin ad → af' },
  ag: { meaning: '向（ad 同化）', source: 'Latin ad → ag' },
  al: { meaning: '向（ad 同化）', source: 'Latin ad → al' },
  ap: { meaning: '向（ad 同化）', source: 'Latin ad → ap' },
  ar: { meaning: '向（ad 同化）', source: 'Latin ad → ar' },
  as: { meaning: '向（ad 同化）', source: 'Latin ad → as' },
  at: { meaning: '向（ad 同化）', source: 'Latin ad → at' },
  anti: { meaning: '反对', source: 'Greek anti' },
  ante: { meaning: '在前', source: 'Latin ante' },
  auto: { meaning: '自身', source: 'Greek autos' },
  bi: { meaning: '二', source: 'Latin bis' },
  circum: { meaning: '环绕', source: 'Latin circum' },
  co: { meaning: '共同', source: 'Latin cum' },
  col: { meaning: '共同', source: 'Latin cum → col' },
  com: { meaning: '共同', source: 'Latin cum' },
  con: { meaning: '共同', source: 'Latin cum' },
  cor: { meaning: '共同', source: 'Latin cum → cor' },
  contra: { meaning: '反对', source: 'Latin contra' },
  de: { meaning: '向下、去除', source: 'Latin de' },
  dis: { meaning: '分开、否定', source: 'Latin dis' },
  di: { meaning: '分开', source: 'Latin dis → di' },
  dif: { meaning: '分开', source: 'Latin dis → dif' },
  e: { meaning: '出', source: 'Latin ex → e' },
  em: { meaning: '入、在', source: 'Greek en（em 为鼻音前变体）' },
  en: { meaning: '入、在', source: 'Greek en' },
  ex: { meaning: '出', source: 'Latin ex' },
  extra: { meaning: '外', source: 'Latin extra' },
  fore: { meaning: '在前', source: 'Germanic fore' },
  hyper: { meaning: '过度', source: 'Greek hyper' },
  hypo: { meaning: '不足', source: 'Greek hypo' },
  epi: { meaning: '在上', source: 'Greek epi' },
  para: { meaning: '旁', source: 'Greek para' },
  peri: { meaning: '周围', source: 'Greek peri' },
  meta: { meaning: '超越', source: 'Greek meta' },
  proto: { meaning: '最初', source: 'Greek protos' },
  in: { meaning: '入、不', source: 'Latin in' },
  im: { meaning: '入、不', source: 'Latin in → im' },
  il: { meaning: '入、不', source: 'Latin in → il' },
  ir: { meaning: '入、不', source: 'Latin in → ir' },
  inter: { meaning: '之间', source: 'Latin inter' },
  intra: { meaning: '在内', source: 'Latin intra' },
  intro: { meaning: '入内', source: 'Latin intro' },
  macro: { meaning: '大', source: 'Greek makros' },
  micro: { meaning: '小', source: 'Greek mikros' },
  mis: { meaning: '错', source: 'Old English / Germanic' },
  mono: { meaning: '单', source: 'Greek monos' },
  multi: { meaning: '多', source: 'Latin multus' },
  non: { meaning: '非', source: 'Latin non' },
  ob: { meaning: '朝向、对抗', source: 'Latin ob' },
  oc: { meaning: '朝向', source: 'Latin ob → oc' },
  of: { meaning: '朝向', source: 'Latin ob → of' },
  op: { meaning: '朝向', source: 'Latin ob → op' },
  over: { meaning: '过度', source: 'Germanic over' },
  per: { meaning: '贯穿', source: 'Latin per' },
  post: { meaning: '后', source: 'Latin post' },
  pre: { meaning: '前', source: 'Latin prae' },
  pro: { meaning: '向前', source: 'Latin pro' },
  pseudo: { meaning: '假', source: 'Greek pseudes' },
  re: { meaning: '再', source: 'Latin re' },
  retro: { meaning: '向后', source: 'Latin retro' },
  semi: { meaning: '半', source: 'Latin semi' },
  sub: { meaning: '下', source: 'Latin sub' },
  suc: { meaning: '下', source: 'Latin sub → suc' },
  suf: { meaning: '下', source: 'Latin sub → suf' },
  super: { meaning: '上', source: 'Latin super' },
  sur: { meaning: '上', source: 'Latin super → sur' },
  syn: { meaning: '共同', source: 'Greek syn' },
  sym: { meaning: '共同', source: 'Greek syn → sym' },
  syl: { meaning: '共同', source: 'Greek syn → syl' },
  trans: { meaning: '越过', source: 'Latin trans' },
  tri: { meaning: '三', source: 'Latin tres' },
  ultra: { meaning: '超', source: 'Latin ultra' },
  un: { meaning: '不', source: 'Germanic un-' },
  under: { meaning: '下', source: 'Germanic under' },
}

/** @type {Record<string, { meaning: string, source: string }>} */
export const SUFFIX_ETYMOLOGY = {
  able: { meaning: '能够…的', source: 'Latin -abilis' },
  ible: { meaning: '能够…的', source: 'Latin -ibilis' },
  al: { meaning: '与…有关', source: 'Latin -alis' },
  ial: { meaning: '与…有关', source: 'Latin -ialis' },
  ical: { meaning: '…的（形容词）', source: 'Latin -icus + -alis → -ical' },
  ic: { meaning: '…的（形容词）', source: 'Latin -icus / Greek -ikos' },
  ance: { meaning: '名词', source: 'Latin -antia' },
  ence: { meaning: '名词', source: 'Latin -entia' },
  ant: { meaning: '…者', source: 'Latin -ans' },
  ent: { meaning: '…者', source: 'Latin -ens' },
  ary: { meaning: '与…有关', source: 'Latin -arius' },
  ory: { meaning: '场所', source: 'Latin -orium' },
  ate: { meaning: '使、…的', source: 'Latin -atus' },
  ation: { meaning: '行为', source: 'Latin -atio' },
  ition: { meaning: '行为', source: 'Latin -itio' },
  tion: { meaning: '行为', source: 'Latin -tio' },
  sion: { meaning: '行为', source: 'Latin -sio' },
  cy: { meaning: '性质', source: 'Latin -tia → French -cy' },
  ture: { meaning: '结果', source: 'Latin -tura' },
  ure: { meaning: '结果', source: 'Latin -tura' },
  dom: { meaning: '领域', source: 'Germanic -dom' },
  ee: { meaning: '被…者', source: 'French -é' },
  ence: { meaning: '状态', source: 'Latin -entia' },
  er: { meaning: '做…者', source: 'Germanic -er / Latin -or' },
  or: { meaning: '做…者', source: 'Latin -or' },
  ess: { meaning: '女性', source: 'French -esse' },
  ful: { meaning: '充满', source: 'Germanic -ful' },
  fy: { meaning: '使', source: 'Latin -ficare → -fy' },
  ify: { meaning: '使', source: 'Latin -ficare' },
  ize: { meaning: '使', source: 'Greek -izein' },
  ise: { meaning: '使', source: 'Greek -izein' },
  ing: { meaning: '进行', source: 'Germanic -ing' },
  ion: { meaning: '行为', source: 'Greek/Latin -ion' },
  ish: { meaning: '略带', source: 'Germanic -ish' },
  ism: { meaning: '主义', source: 'Greek -ismos' },
  ist: { meaning: '从事者', source: 'Greek -istes' },
  ity: { meaning: '性质', source: 'Latin -itas' },
  ive: { meaning: '…的', source: 'Latin -ivus' },
  less: { meaning: '无', source: 'Germanic -less' },
  ly: { meaning: '…地', source: 'Germanic -lice → -ly' },
  ment: { meaning: '结果', source: 'Latin -mentum' },
  ness: { meaning: '状态', source: 'Germanic -ness' },
  ous: { meaning: '充满', source: 'Latin -osus' },
  eous: { meaning: '充满', source: 'Latin -osus' },
  ious: { meaning: '充满', source: 'Latin -iosus' },
  ship: { meaning: '状态', source: 'Germanic -scip' },
  some: { meaning: '引起', source: 'Germanic -sum' },
  th: { meaning: '序', source: 'Germanic -tha' },
  ty: { meaning: '性质', source: 'Latin -tas' },
  ward: { meaning: '向', source: 'Germanic -weard' },
  y: { meaning: '有…的', source: 'Germanic -ig' },
  logy: { meaning: '学科', source: 'Greek -logia' },
  graphy: { meaning: '书写', source: 'Greek -graphia' },
  meter: { meaning: '测量', source: 'Greek -metron' },
  scope: { meaning: '看', source: 'Greek -skopion' },
  cracy: { meaning: '统治', source: 'Greek -kratia' },
  archy: { meaning: '统治', source: 'Greek -arkhia' },
}

/** 精确词条（优先） @type {Record<string, EtyPart[]>} */
export const WORD_LEXICON = {
  structure: [
    { type: 'root', part: 'struct', meaning: '建造', etymology: 'Latin struere; PIE *stere-' },
    { type: 'suffix', part: '-ure', meaning: '名词结果', etymology: 'Latin -tura' },
  ],
  construction: [
    { type: 'prefix', part: 'con-', meaning: '共同', etymology: 'Latin cum' },
    { type: 'root', part: 'struct', meaning: '建造', etymology: 'Latin struere; PIE *stere-' },
    { type: 'suffix', part: '-ion', meaning: '名词', etymology: 'Latin -tio' },
  ],
  predict: [
    { type: 'prefix', part: 'pre-', meaning: '预先', etymology: 'Latin prae' },
    { type: 'root', part: 'dict', meaning: '说', etymology: 'Latin dicere; PIE *deik-' },
  ],
  transport: [
    { type: 'prefix', part: 'trans-', meaning: '越过', etymology: 'Latin trans' },
    { type: 'root', part: 'port', meaning: '携带', etymology: 'Latin portare; PIE *per-' },
  ],
  visible: [
    { type: 'root', part: 'vis', meaning: '看', etymology: 'Latin videre; PIE *weid-' },
    { type: 'suffix', part: '-ible', meaning: '能够…的', etymology: 'Latin -ibilis' },
  ],
  biology: [
    { type: 'root', part: 'bio', meaning: '生命', etymology: 'Greek bios; PIE *gwei-' },
    { type: 'suffix', part: '-logy', meaning: '学科', etymology: 'Greek -logia' },
  ],
  democracy: [
    { type: 'root', part: 'demo', meaning: '人民', etymology: 'Greek demos; PIE *da-' },
    { type: 'suffix', part: '-cracy', meaning: '统治', etymology: 'Greek kratos' },
  ],
  international: [
    { type: 'prefix', part: 'inter-', meaning: '之间', etymology: 'Latin inter' },
    { type: 'root', part: 'nat', meaning: '生', etymology: 'Latin nasci; PIE *gene-' },
    { type: 'suffix', part: '-ion', meaning: '名词', etymology: 'Latin -tio' },
    { type: 'suffix', part: '-al', meaning: '形容词', etymology: 'Latin -alis' },
  ],
  environment: [
    { type: 'prefix', part: 'en-', meaning: '在…中', etymology: 'Latin in' },
    { type: 'root', part: 'viron', meaning: '环绕', etymology: 'Old French viron (来自 virer「转」)' },
    { type: 'suffix', part: '-ment', meaning: '名词', etymology: 'Latin -mentum' },
  ],
  significant: [
    { type: 'prefix', part: 'sign-', meaning: '标记', etymology: 'Latin signum' },
    { type: 'root', part: 'fic', meaning: '做', etymology: 'Latin facere; PIE *dhe-' },
    { type: 'suffix', part: '-ant', meaning: '…的', etymology: 'Latin -ans' },
  ],
  sufficient: [
    { type: 'prefix', part: 'suf-', meaning: '下、从下', etymology: 'Latin sub' },
    { type: 'root', part: 'fic', meaning: '做', etymology: 'Latin facere' },
    { type: 'suffix', part: '-ient', meaning: '…的', etymology: 'Latin -iens' },
  ],
  influence: [
    { type: 'prefix', part: 'in-', meaning: '进入', etymology: 'Latin in' },
    { type: 'root', part: 'flu', meaning: '流', etymology: 'Latin fluere; PIE *bhleu-' },
    { type: 'suffix', part: '-ence', meaning: '名词', etymology: 'Latin -entia' },
  ],
  contemporary: [
    { type: 'prefix', part: 'con-', meaning: '共同', etymology: 'Latin cum' },
    { type: 'root', part: 'tempor', meaning: '时间', etymology: 'Latin tempus; PIE *tem-' },
    { type: 'suffix', part: '-ary', meaning: '与…有关', etymology: 'Latin -arius' },
  ],
  manufacture: [
    { type: 'root', part: 'manu', meaning: '手', etymology: 'Latin manus; PIE *man-' },
    { type: 'root', part: 'fact', meaning: '做', etymology: 'Latin facere; PIE *dhe-' },
    { type: 'suffix', part: '-ure', meaning: '名词', etymology: 'Latin -tura' },
  ],
  photosynthesis: [
    { type: 'root', part: 'photo', meaning: '光', etymology: 'Greek photos; PIE *bha-' },
    { type: 'root', part: 'syn', meaning: '共同', etymology: 'Greek syn; PIE *ksun-' },
    { type: 'root', part: 'thesis', meaning: '放置', etymology: 'Greek thesis; PIE *dhe-' },
  ],
  hypothesis: [
    { type: 'prefix', part: 'hypo-', meaning: '在下', etymology: 'Greek hypo' },
    { type: 'root', part: 'thesis', meaning: '放置', etymology: 'Greek thesis; PIE *dhe-' },
  ],
  psychology: [
    { type: 'root', part: 'psych', meaning: '心理', etymology: 'Greek psyche; PIE *bhes-' },
    { type: 'suffix', part: '-logy', meaning: '学科', etymology: 'Greek -logia' },
  ],
  technology: [
    { type: 'root', part: 'techn', meaning: '技艺', etymology: 'Greek techne; PIE *teks-' },
    { type: 'suffix', part: '-logy', meaning: '学科', etymology: 'Greek -logia' },
  ],
  revolution: [
    { type: 'prefix', part: 're-', meaning: '再、回', etymology: 'Latin re' },
    { type: 'root', part: 'volv', meaning: '转', etymology: 'Latin volvere; PIE *wel-' },
    { type: 'suffix', part: '-tion', meaning: '名词', etymology: 'Latin -tio' },
  ],
  agriculture: [
    { type: 'root', part: 'agri', meaning: '田', etymology: 'Latin ager; PIE *ag-' },
    { type: 'root', part: 'cult', meaning: '耕', etymology: 'Latin cultus; PIE *kwel-' },
    { type: 'suffix', part: '-ure', meaning: '名词', etymology: 'Latin -tura' },
  ],
  floral: [
    { type: 'root', part: 'flor', meaning: '花', etymology: 'Latin flos; PIE *bhel-' },
    { type: 'suffix', part: '-al', meaning: '与…有关', etymology: 'Latin -alis' },
  ],
  global: [
    { type: 'root', part: 'glob', meaning: '球', etymology: 'Latin globus; PIE *gʷleb-' },
    { type: 'suffix', part: '-al', meaning: '与…有关', etymology: 'Latin -alis' },
  ],
  subtle: [
    { type: 'prefix', part: 'sub-', meaning: '在下', etymology: 'Latin sub' },
    { type: 'root', part: 'tle', meaning: '编织', etymology: 'Latin tela「网」; PIE *teks-' },
  ],
  abstract: [
    { type: 'prefix', part: 'abs-', meaning: '离开', etymology: 'Latin ab' },
    { type: 'root', part: 'tract', meaning: '拉', etymology: 'Latin trahere; PIE *tragh-' },
  ],
  attract: [
    { type: 'prefix', part: 'at-', meaning: '向', etymology: 'Latin ad' },
    { type: 'root', part: 'tract', meaning: '拉', etymology: 'Latin trahere' },
  ],
  contract: [
    { type: 'prefix', part: 'con-', meaning: '共同', etymology: 'Latin cum' },
    { type: 'root', part: 'tract', meaning: '拉', etymology: 'Latin trahere' },
  ],
  extract: [
    { type: 'prefix', part: 'ex-', meaning: '出', etymology: 'Latin ex' },
    { type: 'root', part: 'tract', meaning: '拉', etymology: 'Latin trahere' },
  ],
  proceed: [
    { type: 'prefix', part: 'pro-', meaning: '向前', etymology: 'Latin pro' },
    { type: 'root', part: 'ceed', meaning: '走', etymology: 'Latin cedere; PIE *ked-' },
  ],
  exceed: [
    { type: 'prefix', part: 'ex-', meaning: '出', etymology: 'Latin ex' },
    { type: 'root', part: 'ceed', meaning: '走', etymology: 'Latin cedere' },
  ],
  recede: [
    { type: 'prefix', part: 're-', meaning: '回', etymology: 'Latin re' },
    { type: 'root', part: 'cede', meaning: '走', etymology: 'Latin cedere' },
  ],
  aggressive: [
    { type: 'prefix', part: 'ag-', meaning: '向', etymology: 'Latin ad' },
    { type: 'root', part: 'gress', meaning: '走', etymology: 'Latin gradi; PIE *ghredh-' },
    { type: 'suffix', part: '-ive', meaning: '…的', etymology: 'Latin -ivus' },
  ],
  progress: [
    { type: 'prefix', part: 'pro-', meaning: '向前', etymology: 'Latin pro' },
    { type: 'root', part: 'gress', meaning: '走', etymology: 'Latin gradi' },
  ],
  submit: [
    { type: 'prefix', part: 'sub-', meaning: '在下', etymology: 'Latin sub' },
    { type: 'root', part: 'mit', meaning: '送', etymology: 'Latin mittere; PIE *mei-' },
  ],
  transmit: [
    { type: 'prefix', part: 'trans-', meaning: '越过', etymology: 'Latin trans' },
    { type: 'root', part: 'mit', meaning: '送', etymology: 'Latin mittere' },
  ],
  permit: [
    { type: 'prefix', part: 'per-', meaning: '贯穿', etymology: 'Latin per' },
    { type: 'root', part: 'mit', meaning: '送', etymology: 'Latin mittere' },
  ],
  produce: [
    { type: 'prefix', part: 'pro-', meaning: '向前', etymology: 'Latin pro' },
    { type: 'root', part: 'duc', meaning: '引导', etymology: 'Latin ducere; PIE *deuk-' },
    { type: 'suffix', part: '-e', meaning: '动词', etymology: '拉丁动词词尾' },
  ],
  reduce: [
    { type: 'prefix', part: 're-', meaning: '回', etymology: 'Latin re' },
    { type: 'root', part: 'duc', meaning: '引导', etymology: 'Latin ducere' },
  ],
  introduce: [
    { type: 'prefix', part: 'intro-', meaning: '入内', etymology: 'Latin intro' },
    { type: 'root', part: 'duc', meaning: '引导', etymology: 'Latin ducere' },
  ],
  contradict: [
    { type: 'prefix', part: 'contra-', meaning: '反对', etymology: 'Latin contra' },
    { type: 'root', part: 'dict', meaning: '说', etymology: 'Latin dicere' },
  ],
  indicate: [
    { type: 'prefix', part: 'in-', meaning: '向内', etymology: 'Latin in' },
    { type: 'root', part: 'dic', meaning: '说、指', etymology: 'Latin dicere' },
    { type: 'suffix', part: '-ate', meaning: '动词', etymology: 'Latin -are' },
  ],
  dictionary: [
    { type: 'root', part: 'dict', meaning: '说', etymology: 'Latin dicere' },
    { type: 'suffix', part: '-ion', meaning: '名词', etymology: 'Latin -tio' },
    { type: 'suffix', part: '-ary', meaning: '场所', etymology: 'Latin -arium' },
  ],
  credible: [
    { type: 'root', part: 'cred', meaning: '相信', etymology: 'Latin credere; PIE *kred-' },
    { type: 'suffix', part: '-ible', meaning: '能够…的', etymology: 'Latin -ibilis' },
  ],
  incredible: [
    { type: 'prefix', part: 'in-', meaning: '不', etymology: 'Latin in' },
    { type: 'root', part: 'cred', meaning: '相信', etymology: 'Latin credere' },
    { type: 'suffix', part: '-ible', meaning: '能够…的', etymology: 'Latin -ibilis' },
  ],
  visible: [
    { type: 'root', part: 'vis', meaning: '看', etymology: 'Latin videre; PIE *weid-' },
    { type: 'suffix', part: '-ible', meaning: '能够…的', etymology: 'Latin -ibilis' },
  ],
  vision: [
    { type: 'root', part: 'vis', meaning: '看', etymology: 'Latin videre' },
    { type: 'suffix', part: '-ion', meaning: '名词', etymology: 'Latin -tio' },
  ],
  television: [
    { type: 'root', part: 'tele', meaning: '远', etymology: 'Greek tele; PIE *kwel-' },
    { type: 'root', part: 'vis', meaning: '看', etymology: 'Latin videre' },
    { type: 'suffix', part: '-ion', meaning: '名词', etymology: 'Latin -tio' },
  ],
  manual: [
    { type: 'root', part: 'manu', meaning: '手', etymology: 'Latin manus; PIE *man-' },
    { type: 'suffix', part: '-al', meaning: '与…有关', etymology: 'Latin -alis' },
  ],
  manuscript: [
    { type: 'root', part: 'manu', meaning: '手', etymology: 'Latin manus' },
    { type: 'root', part: 'script', meaning: '写', etymology: 'Latin scribere' },
  ],
  portable: [
    { type: 'root', part: 'port', meaning: '携带', etymology: 'Latin portare' },
    { type: 'suffix', part: '-able', meaning: '能够…的', etymology: 'Latin -abilis' },
  ],
  export: [
    { type: 'prefix', part: 'ex-', meaning: '出', etymology: 'Latin ex' },
    { type: 'root', part: 'port', meaning: '携带', etymology: 'Latin portare' },
  ],
  import: [
    { type: 'prefix', part: 'im-', meaning: '入', etymology: 'Latin in' },
    { type: 'root', part: 'port', meaning: '携带', etymology: 'Latin portare' },
  ],
  support: [
    { type: 'prefix', part: 'sup-', meaning: '在下', etymology: 'Latin sub' },
    { type: 'root', part: 'port', meaning: '携带', etymology: 'Latin portare' },
  ],
  sustainable: [
    { type: 'prefix', part: 'sus-', meaning: '从下', etymology: 'Latin sub' },
    { type: 'root', part: 'tain', meaning: '持有', etymology: 'Latin tenere; PIE *ten-' },
    { type: 'suffix', part: '-able', meaning: '能够…的', etymology: 'Latin -abilis' },
  ],
  maintain: [
    { type: 'prefix', part: 'main-', meaning: '在手', etymology: 'Latin manu in' },
    { type: 'root', part: 'tain', meaning: '持有', etymology: 'Latin tenere' },
  ],
  contain: [
    { type: 'prefix', part: 'con-', meaning: '共同', etymology: 'Latin cum' },
    { type: 'root', part: 'tain', meaning: '持有', etymology: 'Latin tenere' },
  ],
  retain: [
    { type: 'prefix', part: 're-', meaning: '回', etymology: 'Latin re' },
    { type: 'root', part: 'tain', meaning: '持有', etymology: 'Latin tenere' },
  ],
  obtain: [
    { type: 'prefix', part: 'ob-', meaning: '朝向', etymology: 'Latin ob' },
    { type: 'root', part: 'tain', meaning: '持有', etymology: 'Latin tenere' },
  ],
  protect: [
    { type: 'prefix', part: 'pro-', meaning: '向前', etymology: 'Latin pro' },
    { type: 'root', part: 'tect', meaning: '遮盖', etymology: 'Latin tegere; PIE *steg-' },
  ],
  detect: [
    { type: 'prefix', part: 'de-', meaning: '去除', etymology: 'Latin de' },
    { type: 'root', part: 'tect', meaning: '遮盖', etymology: 'Latin tegere; PIE *steg-' },
  ],
  integument: [
    { type: 'prefix', part: 'in-', meaning: '在内', etymology: 'Latin in' },
    { type: 'root', part: 'teg', meaning: '遮盖', etymology: 'Latin tegere; PIE *steg-' },
    { type: 'suffix', part: '-ment', meaning: '名词', etymology: 'Latin -mentum' },
  ],
  root: [
    {
      type: 'root',
      part: 'root',
      meaning: '根、根源',
      etymology: 'PIE *wrād-「根、枝」→ Old Norse rót → Old English rōt（无前后缀，单一词根词）',
    },
  ],
  empirical: [
    { type: 'prefix', part: 'em-', meaning: '在…之中', etymology: 'Greek en（em- 在 b/p/m 前）' },
    {
      type: 'root',
      part: 'pir',
      meaning: '试、经验',
      etymology: 'Greek peira「试验、经验」; PIE *per-「尝试」',
    },
    { type: 'suffix', part: '-ic', meaning: '…的（形容词）', etymology: 'Greek -ikos' },
    { type: 'suffix', part: '-al', meaning: '…的（形容词）', etymology: 'Latin -alis' },
  ],
  empiric: [
    { type: 'prefix', part: 'em-', meaning: '在…之中', etymology: 'Greek en' },
    {
      type: 'root',
      part: 'pir',
      meaning: '试、经验',
      etymology: 'Greek peira; PIE *per-',
    },
    { type: 'suffix', part: '-ic', meaning: '…的', etymology: 'Greek -ikos' },
  ],
  empirically: [
    { type: 'prefix', part: 'em-', meaning: '在…之中', etymology: 'Greek en' },
    { type: 'root', part: 'pir', meaning: '试、经验', etymology: 'Greek peira; PIE *per-' },
    { type: 'suffix', part: '-ic', meaning: '…的', etymology: 'Greek -ikos' },
    { type: 'suffix', part: '-al', meaning: '…的', etymology: 'Latin -alis' },
    { type: 'suffix', part: '-ly', meaning: '…地', etymology: 'Germanic -lice' },
  ],
  experiment: [
    { type: 'prefix', part: 'ex-', meaning: '出、完全', etymology: 'Latin ex' },
    {
      type: 'root',
      part: 'peri',
      meaning: '试、经历',
      etymology: 'Latin experiri「尝试」; PIE *per-「尝试」',
    },
    { type: 'suffix', part: '-ment', meaning: '名词结果', etymology: 'Latin -mentum' },
  ],
  experience: [
    { type: 'prefix', part: 'ex-', meaning: '出', etymology: 'Latin ex' },
    { type: 'root', part: 'peri', meaning: '试、经历', etymology: 'Latin experiri; PIE *per-' },
    { type: 'suffix', part: '-ence', meaning: '名词状态', etymology: 'Latin -entia' },
  ],
  property: [
    { type: 'prefix', part: 'pro-', meaning: '向前', etymology: 'Latin pro' },
    { type: 'root', part: 'pri', meaning: '自己的', etymology: 'Latin privus; PIE *per-' },
    { type: 'suffix', part: '-ty', meaning: '性质', etymology: 'Latin -tas' },
  ],
  seismic: [
    { type: 'root', part: 'seism', meaning: '震动', etymology: 'Greek seismos; PIE *tweye-' },
    { type: 'suffix', part: '-ic', meaning: '…的', etymology: 'Greek -ikos' },
  ],
}

Object.assign(ROOT_ETYMOLOGY, EXTENDED_ROOTS)

const PREFIX_FORMS = Object.keys(PREFIX_ETYMOLOGY).sort((a, b) => b.length - a.length)
const SUFFIX_FORMS = Object.keys(SUFFIX_ETYMOLOGY).sort((a, b) => b.length - a.length)
let ROOT_FORMS = Object.keys(ROOT_ETYMOLOGY).sort((a, b) => b.length - a.length)

const MIN_STEM = 2

/** 允许匹配的 2 字母前缀（避免 se- 误伤 seismic、set 等） */
const SHORT_PREFIX_OK = new Set([
  're',
  'de',
  'in',
  'im',
  'il',
  'ir',
  'un',
  'ex',
  'e',
  'en',
  'em',
  'be',
  'bi',
  'co',
  'ab',
  'ad',
  'ac',
  'af',
  'ag',
  'al',
  'ap',
  'ar',
  'as',
  'at',
  'ob',
  'oc',
  'of',
  'op',
  'di',
  'dif',
  'dis',
])

/**
 * @param {string} p
 * @param {string} next
 */
function prefixAllowed(p, next) {
  if (next.length < MIN_STEM) return false
  if (p === 'pro') {
    const hasRoot = ROOT_FORMS.some((r) => r.length >= 3 && next.startsWith(r))
    if (!hasRoot && next.length < 6) return false
  }
  if (p.length >= 3) return next.length >= MIN_STEM
  if (!SHORT_PREFIX_OK.has(p)) return false
  return next.length >= 3
}

/**
 * @param {string} rest
 * @param {EtyPart[]} parts
 */
function stripPrefixes(rest, parts) {
  let guard = 0
  while (guard++ < 8) {
    let hit = false
    for (const p of PREFIX_FORMS) {
      if (!rest.startsWith(p)) continue
      const next = rest.slice(p.length)
      if (!prefixAllowed(p, next)) continue
      const meta = PREFIX_ETYMOLOGY[p]
      parts.push({
        type: 'prefix',
        part: p.endsWith('-') ? p : `${p}-`,
        meaning: meta.meaning,
        etymology: meta.source,
      })
      rest = next
      hit = true
      break
    }
    if (!hit) break
  }
  return rest
}

/**
 * @param {string} s
 * @param {string} next
 */
function suffixAllowed(s, next) {
  if (next.length < MIN_STEM) return false
  if (s === 'ism' && next.length < 6) return false
  if (s === 'ist' && next.length < 5) return false
  if (s === 'ive' && next.length < 4) return false
  if (s === 'ous' && next.length < 4) return false
  if (s === 'ent' && next.length < 4) return false
  if (s === 'ant' && next.length < 4) return false
  if (s === 'ate' && next.length < 4) return false
  if (s === 'ic' && next.length < 4) return false
  if (s === 'al' && next.length < 4) return false
  if (s === 'ty' && next.length < 5) return false
  return true
}

/**
 * @param {string} rest
 * @param {EtyPart[]} suffixParts
 */
function stripSuffixes(rest, suffixParts) {
  let guard = 0
  while (guard++ < 8) {
    let hit = false
    for (const s of SUFFIX_FORMS) {
      if (!rest.endsWith(s)) continue
      const next = rest.slice(0, -s.length)
      if (!suffixAllowed(s, next)) continue
      const meta = SUFFIX_ETYMOLOGY[s]
      suffixParts.unshift({
        type: 'suffix',
        part: s.startsWith('-') ? s : `-${s}`,
        meaning: meta.meaning,
        etymology: meta.source,
      })
      rest = next
      hit = true
      break
    }
    if (!hit) break
  }
  return rest
}

/**
 * @param {string} rest
 * @returns {EtyPart[]}
 */
function greedyRoots(rest) {
  /** @type {EtyPart[]} */
  const roots = []
  let guard = 0
  while (rest.length >= MIN_STEM && guard++ < 6) {
    let best = ''
    for (const r of ROOT_FORMS) {
      if (r.length < 3) continue
      if (!rest.startsWith(r)) continue
      if (r.length > best.length) best = r
    }
    if (!best) break
    const meta = ROOT_ETYMOLOGY[best]
    roots.push({
      type: 'root',
      part: best,
      meaning: meta.meaning,
      etymology: [meta.source, meta.pie].filter(Boolean).join('; '),
    })
    rest = rest.slice(best.length)
    if (rest.length === 1 && /[aeiouy]/i.test(rest)) rest = ''
  }
  return roots
}

/**
 * @param {string} rest
 */
function matchSingleRoot(rest) {
  if (rest.length < 3) return null
  if (ROOT_ETYMOLOGY[rest]) {
    const meta = ROOT_ETYMOLOGY[rest]
    return {
      type: 'root',
      part: rest,
      meaning: meta.meaning,
      etymology: [meta.source, meta.pie].filter(Boolean).join('; '),
    }
  }
  return null
}

/**
 * @param {string} token
 * @returns {EtyPart[] | null}
 */
export function decomposeEtymology(token) {
  const w = token.toLowerCase().replace(/[^a-z]/g, '')
  if (!w || w.length < 2) return null

  if (WORD_LEXICON[w]) return WORD_LEXICON[w].map((p) => ({ ...p }))

  /** @type {EtyPart[]} */
  const prefixParts = []
  /** @type {EtyPart[]} */
  const suffixParts = []

  let rest = stripPrefixes(w, prefixParts)
  rest = stripSuffixes(rest, suffixParts)

  let rootParts = greedyRoots(rest)
  if (!rootParts.length) {
    const single = matchSingleRoot(rest)
    if (single) rootParts = [single]
  }

  if (rootParts.length) return [...prefixParts, ...rootParts, ...suffixParts]

  const compound = decomposeCompound(w)
  if (compound?.some((p) => p.type === 'root' || p.type === 'prefix')) return compound

  const germ = GERMANIC_LEXICON[w]
  if (germ) {
    return [
      {
        type: 'root',
        part: w,
        meaning: germ.meaning,
        etymology: [germ.source, germ.pie].filter(Boolean).join('; '),
      },
    ]
  }

  return null
}

/**
 * @param {EtyPart[]} parts
 * @returns {string}
 */
export function summarizePie(parts) {
  const pies = parts
    .map((p) => {
      const m = p.etymology.match(/PIE \*[^;)]+/)
      return m ? m[0] : null
    })
    .filter(Boolean)
  return [...new Set(pies)].join(' · ')
}

/** @type {Record<string, string>} */
const CANONICAL_ROOT_KEYS = (() => {
  /** @type {Record<string, string>} */
  const map = {}
  for (const [surface, meta] of Object.entries(ROOT_ETYMOLOGY)) {
    const pie = meta.pie?.match(/PIE (\*[^「\s-]+)/)?.[1]
    if (pie) {
      map[surface] = `pie:${pie}`
      continue
    }
    const lat = meta.source?.match(/Latin ([^;/]+)/)?.[1]?.trim().toLowerCase()
    if (lat) {
      map[surface] = `lat:${lat.replace(/\s.*/, '')}`
      continue
    }
    const gr = meta.source?.match(/Greek ([^;/]+)/)?.[1]?.trim().toLowerCase()
    if (gr) {
      map[surface] = `gr:${gr.replace(/\s.*/, '')}`
      continue
    }
    map[surface] = `surf:${surface}`
  }
  return map
})()

/**
 * 词源血统 ID（同 lat:tegere / pie:*steg- 才为同根，禁止字形包含匹配）。
 * @param {string} surfaceForm
 */
export function canonicalRootKey(surfaceForm) {
  const bare = surfaceForm.replace(/[^a-z]/g, '')
  if (!bare) return null
  return CANONICAL_ROOT_KEYS[bare] ?? null
}

/**
 * @param {EtyPart[]} parts
 * @returns {string[]}
 */
export function getCanonicalRootKeysFromParts(parts) {
  return [
    ...new Set(
      parts
        .filter((p) => p.type === 'root')
        .map((p) => canonicalRootKey(p.part))
        .filter((k) => typeof k === 'string'),
    ),
  ]
}

/**
 * @param {EtyPart[]} parts
 */
export function formatMorphBreakdown(parts) {
  if (!parts?.length) return ''
  return parts
    .map((p) => {
      const tag = p.type === 'prefix' ? '前缀' : p.type === 'suffix' ? '后缀' : '词根'
      return `${p.part}（${tag}：${p.meaning}）`
    })
    .join(' + ')
}

/**
 * @param {EtyPart[]} parts
 * @param {string} gloss
 */
export function buildLiteralEvolution(parts, gloss) {
  const pre = parts.filter((p) => p.type === 'prefix')
  const roots = parts.filter((p) => p.type === 'root')
  const suf = parts.filter((p) => p.type === 'suffix')
  const segs = []
  if (pre.length) segs.push(pre.map((p) => `${p.part}「${p.meaning}」`).join(''))
  if (roots.length) {
    segs.push(
      roots
        .map((p) => {
          const src = p.etymology?.split(';')[0]?.trim() || p.meaning
          return `${p.part}（${src}）`
        })
        .join('/'),
    )
  }
  if (suf.length) segs.push(suf.map((p) => `${p.part}「${p.meaning}」`).join(''))
  if (!segs.length) return gloss
  return `${segs.join(' + ')} → ${gloss}`
}

/**
 * @param {EtyPart[]} parts
 * @param {'prefix' | 'root' | 'suffix'} type
 */
export function formatMorphLine(parts, type) {
  const items = parts.filter((p) => p.type === type)
  if (!items.length) return '无'
  return items
    .map((p) => {
      const src = p.etymology ? ` ← ${p.etymology}` : ''
      return `${p.part}（${p.meaning}）${src}`
    })
    .join('；')
}
