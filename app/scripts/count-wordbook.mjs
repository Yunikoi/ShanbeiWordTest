/**
 * 统计词书解析结果：node scripts/count-wordbook.mjs <文件路径>
 */
import fs from 'node:fs'
import { parseWordbookText } from '../src/parseWordbook.js'
// 完整 Yasi 笔记：node scripts/count-wordbook.mjs "d:/Study/Blog/content/posts/Yasi.md"

const path = process.argv[2]
if (!path) {
  console.error('用法: node scripts/count-wordbook.mjs <词书.txt|.md>')
  process.exit(1)
}

const text = fs.readFileSync(path, 'utf8')
const { entries, badLineNumbers, format } = parseWordbookText(text)
const h4 = (text.match(/^#{1,6}\s+\S+[：:]/gm) || []).length
const plainLines = (text.match(/^[^【#\s>][^：\n]*[：:]/gm) || []).length

console.log({
  file: path,
  format,
  entries: entries.length,
  badLines: badLineNumbers.length,
  headingColonLines: h4,
  plainColonLines: plainLines,
})
