import { parseRootSearchHtml, parseWordPageHtml } from '../src/quwordClient.js'

const searchHtml = await fetch('https://www.quword.com/root/search?wd=spot', {
  headers: { 'User-Agent': 'Mozilla/5.0' },
}).then((r) => r.text())
console.log('search sections:', parseRootSearchHtml(searchHtml)?.sections?.map((s) => s.heading))

const wordHtml = await fetch('https://www.quword.com/w/spot', {
  headers: { 'User-Agent': 'Mozilla/5.0' },
}).then((r) => r.text())
console.log('word etym:', parseWordPageHtml(wordHtml))
