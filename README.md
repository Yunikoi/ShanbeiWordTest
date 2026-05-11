# ShanbeiWordTest · 扇贝风格背单词

## 中文

基于 **React + Vite + Tailwind CSS** 的轻量背单词应用：支持自定义词库、待复习队列、本地进度持久化，以及短语拆词查询与朗读。

### 功能概览

- **词库**：每行 `单词：释义`，兼容中文冒号 `：` 与英文冒号 `:`；可在网页内导入 `.txt`（UTF-8），或在本仓库根目录维护 `words.txt` 后用 Node 脚本生成 JSON。
- **复习队列**：类似扇贝的 **Review Queue**——队首为当前词；点「需复习 / 不认识」会将当前词插回队列约 **三个位置之后**（队列短时自动靠后），并自动进入下一词；点「认识」则出队并计为 **今日已掌握**。
- **反馈动效**：「需复习 / 不认识」会先 **显示释义约 1 秒** 再左滑切场；所有反馈均有 **向左离场 + 从右入场** 的滑动动画。
- **其它**：`window.speechSynthesis` 朗读；短语（含空格）可调用 [Free Dictionary API](https://dictionaryapi.dev/) 拆词释义（仅供参考）。

### 仓库结构

```
ShanbeiWordTest/
├── words.txt          # 可选：源词表（文本）
├── parser.js          # Node：解析 words.txt → data.json，并同步 app/public/data.json（若存在）
├── data.json          # 根目录生成的词库 JSON（可选）
└── app/               # 前端（Vite + React）
    ├── public/data.json   # 内置默认词库（dev/build 时由 fetch 加载）
    └── src/               # 组件与 useWordStudy 逻辑
```

### 词库格式

每行一条，正则与解析脚本一致：`/^(.+)[：:](.+)$/`，两侧会 `trim`。

示例：

```text
all walks of life：各行各业；各界人士
hello:你好
```

### 快速开始（网页）

1. 安装依赖并启动开发服务：

   ```bash
   cd app
   npm install
   npm run dev
   ```

2. 浏览器打开终端提示的本地地址。
3. 使用顶部 **「导入词库 (.txt)」** 选择你的词表；导入内容会写入浏览器 **localStorage**，刷新后仍有效。需要恢复内置词库时点 **「使用内置词库」**。

生产构建与预览：

```bash
cd app
npm run build
npm run preview
```

### 快速开始（Node 解析）

在项目根目录：

```bash
node parser.js
```

会生成（或覆盖）`data.json`；若存在 `app/public/`，会 **同步写入** `app/public/data.json`，便于前端默认加载最新词表。

### 本地存储（浏览器）

| 键名 | 含义 |
|------|------|
| `shanbei-word-custom-vocab` | 用户导入的自定义词库 JSON 数组 |
| `shanbei-word-progress` | 各词条学习状态与 eFactor |
| `shanbei-word-daily` | 按日期记录的「今日已掌握」词条列表 |

清除站点数据或手动删除上述键可重置进度或自定义词库。

### 代码质量

```bash
cd app
npm run lint
```

---

## English

A lightweight **React + Vite + Tailwind CSS** vocabulary app with custom word lists, a **review queue**, local persistence, optional phrase lookup, and text-to-speech.

### Features

- **Word list format**: one entry per line, `word：gloss` or `word:gloss` (full-width `：` or ASCII `:`). Import a **UTF-8 `.txt`** in the browser, or maintain `words.txt` at the repo root and run the Node parser to emit JSON.
- **Review queue (Shanbei-style)**: the front of the queue is the current card. **Need review** / **Don’t know** removes the head and **re-inserts** that entry about **three positions later** (or toward the end if the queue is short), then advances automatically. **Known** **dequeues** the word and counts toward **mastered today**.
- **Feedback UX**: for **Need review** / **Don’t know**, the gloss is shown for **~1 second** before the card **slides out to the left**; the next card **slides in from the right**. All feedback actions use the same slide transition.
- **Extras**: `window.speechSynthesis` for pronunciation; multi-word entries can open **per-token** English glosses via the [Free Dictionary API](https://dictionaryapi.dev/) (third-party, for reference only).

### Repository layout

```
ShanbeiWordTest/
├── words.txt          # Optional source list (plain text)
├── parser.js          # Node: words.txt → data.json (+ sync to app/public/data.json if present)
├── data.json          # Generated JSON at repo root (optional)
└── app/               # Frontend (Vite + React)
    ├── public/data.json   # Default bundled list (fetched at runtime)
    └── src/
```

### Word list format

Each non-empty line must match: **capture** `(.+)[：:](.+)` with **trimmed** `word` and `translation`.

Example:

```text
all walks of life：各行各业；各界人士
hello:你好
```

### Quick start (web)

```bash
cd app
npm install
npm run dev
```

Open the URL printed by Vite. Use **Import vocabulary (.txt)** to load your file; it is stored in **localStorage** and survives refresh. Use **Use built-in list** to fall back to `public/data.json`.

Production build / preview:

```bash
cd app
npm run build
npm run preview
```

### Quick start (Node parser)

From the repository root:

```bash
node parser.js
```

Writes `data.json` and, when `app/public/` exists, also writes **`app/public/data.json`**.

### Local storage keys

| Key | Purpose |
|-----|---------|
| `shanbei-word-custom-vocab` | User-imported vocabulary JSON |
| `shanbei-word-progress` | Per-word status and eFactor |
| `shanbei-word-daily` | Per-day list of words marked **mastered today** |

Clear site data or delete these keys to reset.

### Lint

```bash
cd app
npm run lint
```

### Tech stack

- **React 19**, **Vite 8**, **Tailwind CSS 4** (`@tailwindcss/vite`)
- **ESLint** (React Hooks rules)

### License

This project is provided as-is for personal learning. Third-party dictionary data belongs to its respective providers.
