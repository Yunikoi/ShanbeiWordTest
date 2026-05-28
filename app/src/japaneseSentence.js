/** @param {string} str */
function hash32(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** @param {string} text */
export function hasJapaneseText(text) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text)
}

const JA_PAIRS = [
  (w, zh) => ({ ja: `最近、${w}について勉強しています。`, zh: `最近在学${zh}。` }),
  (w, zh) => ({ ja: `この${w}は試験でよく出ます。`, zh: `这个${zh}在考试里经常出现。` }),
  (w, zh) => ({ ja: `彼は${w}を上手に使いました。`, zh: `他把${zh}用得很熟练。` }),
  (w, zh) => ({ ja: `会話の中で${w}が出てきました。`, zh: `对话里出现了${zh}。` }),
  (w, zh) => ({ ja: `${w}の意味を覚えておきましょう。`, zh: `请记住${zh}的意思。` }),
  (w, zh) => ({ ja: `例文：${w}。`, zh: `例句：${zh}。` }),
]

/**
 * @param {string} word
 * @param {string|undefined} _pos
 * @param {string} zh
 * @param {number} senseIndex
 * @param {string|number} salt
 */
export function buildJapaneseExamplePair(word, _pos, zh, senseIndex, salt = 0) {
  const w = String(word ?? '').trim()
  const g = String(zh ?? '').trim() || '…'
  const i = (hash32(`${w}|${g}|${senseIndex}|${salt}`) + senseIndex) % JA_PAIRS.length
  const pair = JA_PAIRS[i](w, g)
  return { en: pair.ja, zh: pair.zh }
}
