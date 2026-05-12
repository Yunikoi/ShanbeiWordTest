/**
 * 雅思阅读向例句 + 中文译文（模板成对）。
 * salt：每次打开词书 / 开始本轮复习传入，与义项一起参与选模板，避免总抽到同一句。
 * 中文义项 zh 仅参与哈希，不写入英文句。
 */

/** @param {string} str */
export function hash32(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const TAIL_EN = [
  'conflicting signals',
  'latent risks',
  'policy responses',
  'interpretive frameworks',
  'empirical indicators',
  'structural constraints',
  'competing narratives',
  'stated priorities',
]

const TAIL_ZH = [
  '所呈现的多重相互冲突的信号',
  '潜在风险',
  '政策层面的应对',
  '解释性框架',
  '经验性指标',
  '结构性约束',
  '彼此竞争的叙事',
  '已申明的优先事项',
]

const VP_TAIL_EN = [
  'the main tensions',
  'local circumstances',
  'the root causes',
  'the risks involved',
  'the wider implications',
  'the published record',
  'the baseline assumptions',
]

const VP_TAIL_ZH = [
  '主要张力',
  '当地情境',
  '深层原因',
  '所涉风险',
  '更广泛的影响',
  '已公开发表的记录',
  '基线假设',
]

const HEAD_EN = ['the options', 'the factors', 'the issues', 'the points', 'the cases', 'the claims']
const HEAD_ZH = ['相关选项', '相关因素', '相关问题', '相关论点', '相关情形', '相关主张']

/** @typedef {{ en: (w: string) => string, zh: (w: string) => string }} PairFn */

/** @type {PairFn[]} */
const VERB_PAIRS = [
  {
    en: (w) =>
      `Industrial firms were reluctant to ${w} long-standing procedures while output targets were being tightened.`,
    zh: (w) =>
      `在产出指标不断收紧之际，工业企业仍迟迟不愿${w}沿用已久的规程。`,
  },
  {
    en: (w) =>
      `Once the new dates were published, several teams had to ${w} earlier reconstructions of the settlement sequence.`,
    zh: (w) =>
      `新的年代测定公布后，多个团队不得不${w}先前对聚落序列的重建。`,
  },
  {
    en: (w) =>
      `The committee was accused of trying to ${w} criticism rather than address the methodological objections head-on.`,
    zh: (w) =>
      `外界指责该委员会试图${w}批评之声，却未正面回应方法层面的反对意见。`,
  },
  {
    en: (w) =>
      `Regulators eventually required utilities to ${w} legacy infrastructure before subsidies could be renewed.`,
    zh: (w) =>
      `监管机构最终要求公用事业部门在补贴续期之前${w}老旧基础设施。`,
  },
  {
    en: (w) =>
      `Historians still disagree about whether the ministry deliberately sought to ${w} dissent within the profession.`,
    zh: (w) =>
      `史学界仍存分歧：该部是否刻意在学界内部${w}异见。`,
  },
  {
    en: (w) =>
      `The final section shows how local elites could ${w} central directives without openly defying them.`,
    zh: (w) =>
      `末节揭示地方精英如何在不明面违抗的情况下${w}中央指令。`,
  },
  {
    en: (w) =>
      `Peer reviewers asked the authors to ${w} contradictory findings that had been relegated to an appendix.`,
    zh: (w) =>
      `同行评审要求作者${w}那些被置于附录中的相互矛盾的发现。`,
  },
  {
    en: (w) =>
      `The embassy cables reveal how diplomats tried to ${w} sensitive wording ahead of the joint communique.`,
    zh: (w) =>
      `使馆电文显示外交官如何在联合公报出炉前试图${w}敏感措辞。`,
  },
]

/** @type {PairFn[]} */
const NOUN_PAIRS = [
  {
    en: (w) =>
      `Across the excerpt, ${w} functions as a hinge between economic restructuring and everyday household strategies.`,
    zh: (w) =>
      `节选全文之中，${w}在经济重组与家庭日常策略之间起着枢纽作用。`,
  },
  {
    en: (w) =>
      `What counts as ${w} shifts between the opening definition and the narrower usage adopted in later paragraphs.`,
    zh: (w) =>
      `何者可被视为${w}，在开篇界定与后文收窄的用法之间发生了转移。`,
  },
  {
    en: (w) =>
      `The author returns to ${w} where the argument turns from description to an explicitly causal account.`,
    zh: (w) =>
      `作者在论述由描述转向明确因果解释之处，再次回到${w}。`,
  },
  {
    en: (w) =>
      `Subsequent scholarship has treated ${w} as contingent on institutional setting rather than on individual intent alone.`,
    zh: (w) =>
      `后续研究将${w}更多视为取决于制度情境，而非仅凭个人意图。`,
  },
  {
    en: (w) =>
      `The third subsection redefines ${w} in more technical terms than the introduction initially suggests.`,
    zh: (w) =>
      `第三小节以比引言更为技术化的措辞重新定义了${w}。`,
  },
  {
    en: (w) =>
      `Footnotes qualify how ${w} should be read once archival gaps in the record are acknowledged.`,
    zh: (w) =>
      `脚注对档案缺环得到承认之后应如何理解${w}作了限定说明。`,
  },
]

/** @type {PairFn[]} */
const ADJ_PAIRS = [
  {
    en: (w) =>
      `Reported outcomes remained ${w} across regions, which complicates any straightforward comparison of effect sizes.`,
    zh: (w) =>
      `各地报告的结果仍${w}，使效应量的简单对照变得困难。`,
  },
  {
    en: (w) =>
      `The tone becomes markedly ${w} once archival evidence replaces anecdotal testimony drawn from interviews.`,
    zh: (w) =>
      `一旦档案材料取代访谈中轶事式证词，行文语气便显著变得${w}。`,
  },
  {
    en: (w) =>
      `Measured responses were ${w} enough to cast doubt on the original hypothesis, though not decisive on their own.`,
    zh: (w) =>
      `测得反应已足够${w}，足以令原假设生疑，但尚不足以一锤定音。`,
  },
  {
    en: (w) =>
      `The surviving records paint a ${w} picture of administrative capacity during the final years of the programme.`,
    zh: (w) =>
      `现存记录勾勒出该项目最后几年行政能力的一幅${w}图景。`,
  },
  {
    en: (w) =>
      `Variance in coding rules left the aggregate index looking ${w} relative to country-level benchmarks.`,
    zh: (w) =>
      `编码规则不一，使综合指数相对各国基准显得${w}。`,
  },
]

/** @type {PairFn[]} */
const GENERIC_PAIRS = [
  {
    en: (w) =>
      `In the second paragraph, ${w} narrows the claim by anchoring it to a single, well-documented case.`,
    zh: (w) =>
      `第二段中，作者借${w}将论点收束到一个证据充分的个案之上。`,
  },
  {
    en: (w) =>
      `Readers encounter ${w} again where the text moves from narrative background to explicit causal reasoning.`,
    zh: (w) =>
      `当行文由叙事背景转入明确因果推理时，读者会再次遇到${w}。`,
  },
  {
    en: (w) =>
      `The passage deploys ${w} at a point where the author’s stance toward the primary evidence hardens noticeably.`,
    zh: (w) =>
      `作者在对待核心证据的态度明显强硬之处，安排了${w}。`,
  },
  {
    en: (w) =>
      `Later commentators seized on ${w} as evidence that the editorial line had shifted between editions.`,
    zh: (w) =>
      `后世评论者抓住${w}，作为刊行各版之间编辑立场游移的证据。`,
  },
  {
    en: (w) =>
      `The footnote clarifies how ${w} should be read against the grain of the main argument on the previous page.`,
    zh: (w) =>
      `脚注说明应如何逆读上一页主论点来理解${w}。`,
  },
  {
    en: (w) =>
      `A careful reader will notice ${w} resurfacing whenever the author hedges on questions of agency.`,
    zh: (w) =>
      `细读者会发现：每当作者对能动性相关问题留有余地时，${w}便会再度浮现。`,
  },
]

/**
 * @param {string} w
 * @param {number} ti
 */
function npSurvey(w, ti) {
  const t = TAIL_EN[ti % TAIL_EN.length]
  const z = TAIL_ZH[ti % TAIL_ZH.length]
  return {
    en: `The survey was designed to capture ${w} ${t}, though sampling bias could not be ruled out entirely.`,
    zh: `该调查旨在记录${w}与「${z}」之间的典型搭配关系，尽管抽样偏差仍无法完全排除。`,
  }
}

function npMeta(w, ti) {
  const t = TAIL_EN[(ti + 1) % TAIL_EN.length]
  const z = TAIL_ZH[(ti + 1) % TAIL_ZH.length]
  return {
    en: `Later studies drew on ${w} ${t} drawn from both published records and restricted administrative files.`,
    zh: `后续研究综合利用公开与受限行政档案，以刻画${w}与「${z}」之间的对应关系。`,
  }
}

function npDataset(w, ti) {
  const t = TAIL_EN[(ti + 2) % TAIL_EN.length]
  const z = TAIL_ZH[(ti + 2) % TAIL_ZH.length]
  return {
    en: `The dataset spans ${w} ${t}, enabling a finer-grained comparison than earlier meta-analyses allowed.`,
    zh: `该数据集覆盖${w}与「${z}」相关的信息，使比较粒度细于以往荟萃分析。`,
  }
}

function npReview(w, ti) {
  const t = TAIL_EN[(ti + 3) % TAIL_EN.length]
  const z = TAIL_ZH[(ti + 3) % TAIL_ZH.length]
  return {
    en: `The systematic review weighted ${w} ${t} using transparent inclusion criteria.`,
    zh: `系统综述在透明纳入标准下，对${w}与「${z}」相关的条目进行了加权处理。`,
  }
}

function npCommittee(w, ti) {
  const t = TAIL_EN[(ti + 4) % TAIL_EN.length]
  const z = TAIL_ZH[(ti + 4) % TAIL_ZH.length]
  return {
    en: `The committee report foregrounded ${w} ${t} before recommending phased implementation.`,
    zh: `委员会报告在建议分阶段实施前，先突出${w}与「${z}」之间的结构联系。`,
  }
}

function npCensus(w, ti) {
  const t = TAIL_EN[(ti + 5) % TAIL_EN.length]
  const z = TAIL_ZH[(ti + 5) % TAIL_ZH.length]
  return {
    en: `Census microdata were used to reconstruct ${w} ${t} at the municipal level.`,
    zh: `人口普查微观数据被用于在市镇层面重建${w}与「${z}」相关的分布。`,
  }
}

function npLongitudinal(w, ti) {
  const t = TAIL_EN[(ti + 6) % TAIL_EN.length]
  const z = TAIL_ZH[(ti + 6) % TAIL_ZH.length]
  return {
    en: `A longitudinal design tracked ${w} ${t} across three electoral cycles.`,
    zh: `纵向设计在三轮选举周期内追踪${w}与「${z}」相关的变化。`,
  }
}

function npAppendix(w, ti) {
  const t = TAIL_EN[(ti + 7) % TAIL_EN.length]
  const z = TAIL_ZH[(ti + 7) % TAIL_ZH.length]
  return {
    en: `Appendix tables list ${w} ${t} alongside confidence intervals for each estimate.`,
    zh: `附录表列出${w}与「${z}」相关的估计，并给出各置信区间。`,
  }
}

/** @type {((w: string, ti: number) => { en: string, zh: string })[]} */
const NP_BUILDERS = [npSurvey, npMeta, npDataset, npReview, npCommittee, npCensus, npLongitudinal, npAppendix]

function vpPair(w, seed, k) {
  const i = (seed + k) % VP_TAIL_EN.length
  const te = VP_TAIL_EN[i]
  const tz = VP_TAIL_ZH[i]
  return { tailEn: te, tailZh: tz }
}

/** @type {{ en: (w: string, seed: number, k: number) => string, zh: (w: string, seed: number, k: number) => string }[]} */
const VP_LINES = [
  {
    en: (w, seed, k) => {
      const { tailEn } = vpPair(w, seed, k)
      return `The oversight body was faulted for failing to ${w} ${tailEn} before endorsing the revised funding formula.`
    },
    zh: (w, seed, k) => {
      const { tailZh } = vpPair(w, seed, k)
      return `监督机构因在批准修订拨款公式前未能${w}诸如「${tailZh}」等方面的情况而遭到批评。`
    },
  },
  {
    en: (w, seed, k) => {
      const { tailEn } = vpPair(w, seed, k + 1)
      return `Once disclosure rules tightened, agencies could no longer afford to ${w} ${tailEn} only in passing.`
    },
    zh: (w, seed, k) => {
      const { tailZh } = vpPair(w, seed, k + 1)
      return `披露规则收紧后，各机构已无法在「${tailZh}」等问题上继续对${w}敷衍带过。`
    },
  },
  {
    en: (w, seed, k) => {
      const { tailEn } = vpPair(w, seed, k + 2)
      return `The inquiry concluded that regulators had repeatedly neglected to ${w} ${tailEn} when setting benchmarks.`
    },
    zh: (w, seed, k) => {
      const { tailZh } = vpPair(w, seed, k + 2)
      return `调查结论认为，监管方在设定基准时一再疏于${w}与「${tailZh}」相关的关键信息。`
    },
  },
  {
    en: (w, seed, k) => {
      const { tailEn } = vpPair(w, seed, k + 3)
      return `The tribunal found that ministers had failed to ${w} ${tailEn} before issuing the guidance note.`
    },
    zh: (w, seed, k) => {
      const { tailZh } = vpPair(w, seed, k + 3)
      return `法庭认定部长们在发布指引说明前未能${w}与「${tailZh}」相关的情形。`
    },
  },
]

function postmodPair(w, seed, k) {
  const hi = (seed + k) % HEAD_EN.length
  const he = HEAD_EN[hi]
  const hz = HEAD_ZH[hi]
  return { he, hz }
}

const POSTMOD_LINES = [
  {
    en: (w, seed, k) => {
      const { he } = postmodPair(w, seed, k)
      return `Witness testimony diverged sharply over ${he} ${w}, with little agreement on how decisive each strand should be.`
    },
    zh: (w, seed, k) => {
      const { hz } = postmodPair(w, seed, k)
      return `证人就${hz}「${w}」这一整体表述分歧激烈，对各条证词应占多大分量鲜有共识。`
    },
  },
  {
    en: (w, seed, k) => {
      const { he } = postmodPair(w, seed, k + 2)
      return `The appellate judgment turned on how narrowly ${he} ${w} ought to be construed under the statute.`
    },
    zh: (w, seed, k) => {
      const { hz } = postmodPair(w, seed, k + 2)
      return `上诉判决取决于在法条之下应如何狭义地解释${hz}「${w}」这一表述。`
    },
  },
  {
    en: (w, seed, k) => {
      const { he } = postmodPair(w, seed, k + 4)
      return `The dissent focused on whether ${he} ${w} had been prejudged in the preliminary hearing.`
    },
    zh: (w, seed, k) => {
      const { hz } = postmodPair(w, seed, k + 4)
      return `反对意见聚焦于${hz}「${w}」是否在预审中已遭先入为主的判定。`
    },
  },
]

/** @type {PairFn[]} */
const PHRASE_SAFE_PAIRS = [
  {
    en: (w) =>
      `Later sections recycle ${w} where the register tightens and the exposition becomes more explicitly comparative.`,
    zh: (w) =>
      `后文在语体收紧、论述更趋比较性之处，再次运用${w}。`,
  },
  {
    en: (w) =>
      `The syntax surrounding ${w} stabilises only after the author introduces the contrasting regional datasets.`,
    zh: (w) =>
      `在作者引入对比性的地区数据集之后，围绕${w}的句法结构才趋于稳定。`,
  },
  {
    en: (w) =>
      `Close reading shows that ${w} carries most of its argumentative weight in the final third of the chapter.`,
    zh: (w) =>
      `细读可见，${w}的论证分量主要落在本章最后三分之一。`,
  },
  {
    en: (w) =>
      `The translator’s note flags ${w} as a recurrent collocation whose scope shifts subtly across sections.`,
    zh: (w) =>
      `译者注指出${w}为反复出现的搭配，其指涉范围在各节之间有细微滑动。`,
  },
]

function isPhraseToken(token) {
  return /\s/.test(token)
}

function isArticleLedPhrase(token) {
  return /^(a|an|the)\s+/i.test(token)
}

function isPostmodPhrase(token) {
  return /\b(in question|at stake|under discussion|on offer)\s*$/i.test(token)
}

function looksLikeVerbPhrase(token) {
  return /^(take|make|get|put|bring|carry|sort|account|provide|give|look|go|work|figure|watch|come|break|hold|set|pay|point|speak|lead|keep|deal|rely|depend|focus|engage|opt)\b/i.test(
    token,
  )
}

/**
 * @param {string} word
 * @param {string|undefined} pos
 * @param {string} zh
 * @param {number} senseIndex
 * @param {string|number} salt
 * @returns {{ en: string, zh: string }}
 */
export function buildExamplePair(word, pos, zh, senseIndex, salt = 0) {
  const token = String(word ?? '').trim()
  const zhSafe = String(zh ?? '').trim()
  const base = hash32(`${token}|${zhSafe}|${senseIndex}|${salt}`)
  const mix = (base + senseIndex * 0x9e3779b9) >>> 0

  if (isPhraseToken(token)) {
    if (isArticleLedPhrase(token)) {
      const bi = mix % NP_BUILDERS.length
      const ti = (mix >>> 5) % TAIL_EN.length
      return NP_BUILDERS[bi](token, ti)
    }
    if (isPostmodPhrase(token)) {
      const li = mix % POSTMOD_LINES.length
      return {
        en: POSTMOD_LINES[li].en(token, mix, senseIndex),
        zh: POSTMOD_LINES[li].zh(token, mix, senseIndex),
      }
    }
    if (looksLikeVerbPhrase(token)) {
      const vi = mix % VP_LINES.length
      return {
        en: VP_LINES[vi].en(token, mix, senseIndex),
        zh: VP_LINES[vi].zh(token, mix, senseIndex),
      }
    }
    const si = mix % PHRASE_SAFE_PAIRS.length
    return { en: PHRASE_SAFE_PAIRS[si].en(token), zh: PHRASE_SAFE_PAIRS[si].zh(token) }
  }

  const p = (pos ?? '').toLowerCase()
  if (p.startsWith('v')) {
    const i = mix % VERB_PAIRS.length
    return { en: VERB_PAIRS[i].en(token), zh: VERB_PAIRS[i].zh(token) }
  }
  if (p.startsWith('n')) {
    const i = mix % NOUN_PAIRS.length
    return { en: NOUN_PAIRS[i].en(token), zh: NOUN_PAIRS[i].zh(token) }
  }
  if (p.startsWith('adj') || p.startsWith('a.')) {
    const i = mix % ADJ_PAIRS.length
    return { en: ADJ_PAIRS[i].en(token), zh: ADJ_PAIRS[i].zh(token) }
  }
  const i = mix % GENERIC_PAIRS.length
  return { en: GENERIC_PAIRS[i].en(token), zh: GENERIC_PAIRS[i].zh(token) }
}

/** @deprecated 仅取英文时用 */
export function buildIeltsExample(word, pos, zh, senseIndex, salt = 0) {
  return buildExamplePair(word, pos, zh, senseIndex, salt).en
}

/**
 * @param {{ word: string, senses: { pos?: string, zh: string }[] }} entry
 * @param {string|number} [salt]
 */
export function attachExamples(entry, salt = 0) {
  const saltVal = salt
  return {
    word: entry.word,
    senses: entry.senses.map((s, i) => {
      const { en, zh } = buildExamplePair(entry.word, s.pos, s.zh, i, saltVal)
      return { ...s, example: en, exampleZh: zh }
    }),
  }
}
