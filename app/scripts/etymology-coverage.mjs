/**
 * 统计词书词源拆解覆盖率
 * node scripts/etymology-coverage.mjs "d:/Study/Blog/content/posts/Yasi.md"
 */
import fs from 'node:fs'
import { parseWordbookText } from '../src/parseWordbook.js'
import { decomposeEtymology } from '../src/etymologyData.js'

const path = process.argv[2]
if (!path) {
  console.error('用法: node scripts/etymology-coverage.mjs <词书路径>')
  process.exit(1)
}

const { entries } = parseWordbookText(fs.readFileSync(path, 'utf8'))
let ok = 0
let miss = 0
/** @type {string[]} */
const missing = []

for (const e of entries) {
  const w = e.word.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '')
  if (w.length < 3) continue
  const p = decomposeEtymology(w)
  if (p?.some((x) => x.type === 'root' || x.type === 'prefix')) {
    ok++
  } else {
    miss++
    if (missing.length < 40) missing.push(w)
  }
}

console.log({
  file: path,
  entries: entries.length,
  analyzed: ok + miss,
  ok,
  miss,
  rate: `${((100 * ok) / (ok + miss)).toFixed(1)}%`,
  sampleMissing: missing,
})
