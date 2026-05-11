const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "words.txt");
const OUTPUT = path.join(__dirname, "data.json");

const text = fs.readFileSync(INPUT, "utf8");
const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

const items = [];
for (const line of lines) {
  const m = line.match(/(.+)[：:](.+)/);
  if (!m) {
    console.warn(`跳过无法解析的行: ${JSON.stringify(line)}`);
    continue;
  }
  const word = m[1].trim();
  const translation = m[2].trim();
  if (!word || !translation) {
    console.warn(`跳过空字段行: ${JSON.stringify(line)}`);
    continue;
  }
  items.push({ word, translation });
}

const json = JSON.stringify(items, null, 2);
fs.writeFileSync(OUTPUT, json, "utf8");
console.log(`已写入 ${items.length} 条到 ${OUTPUT}`);

const OUTPUT_APP = path.join(__dirname, "app", "public", "data.json");
if (fs.existsSync(path.dirname(OUTPUT_APP))) {
  fs.writeFileSync(OUTPUT_APP, json, "utf8");
  console.log(`已同步到 ${OUTPUT_APP}`);
}
