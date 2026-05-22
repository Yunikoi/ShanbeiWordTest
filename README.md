# ShanbeiWordTest / 雅思梯度记忆 · 词书复习

[English](#english) · [中文](#中文)

---

<a id="中文"></a>

## 中文

纯前端 **React 19 + Vite 8 + Tailwind CSS 4** 的雅思向背单词应用：**书架、多格式词书导入、间隔重复（SRS）、阅读向例句与中译、可选大模型在线生成**。所有学习进度保存在浏览器 **localStorage**，无需后端。

### 功能概览

| 模块 | 说明 |
|------|------|
| **书架** | 读取 `app/public/wordbooks/manifest.json` 中配置的内置 `.txt` 词书；支持导入本地 `.txt` 或文件夹（合并多个 txt）；导入词书写入本地并出现在书架列表。 |
| **今日复习量** | 选中词书后选择 10–100（步长 5）个词，从**当前到期**的词条中按 `nextDue` 优先级抽取。 |
| **学习卡片** | 显示单词 →「显示释义/例句」→ 各义项中文 + 英文例句 + 中文译文（模板或模型生成）→ **认识 / 模糊 / 忘记**。 |
| **间隔重复** | 简化 SM 思路：`认识` 则间隔按 1→2→4… 天倍增排期；`模糊` 保持间隔、`nextDue` 仍为今日；`忘记` 重置间隔与 `nextDue`。进度按**词书 ID** 分库存储。 |
| **例句** | 默认：**本地模板**（阅读语体英文 + 配对中文译文，不含把中文义项硬塞进英文句）。可选：**Google Gemini** 或 **Groq**（开发环境经 Vite 代理）用自备 API Key 对**今日队列中的词**逐条生成例句+译文。 |

### 词书文本格式

**纯 `.txt`（UTF-8）**

- `词条：释义1；释义2`（全角 `：` 或半角 `:`）
- `词条 | 词性.释义`；若释义里还有 `|`，仅当 **`|` 在首个 `：`/`:` 之前** 时才视为「单词 \| 释义」行首格式。
- `词条：义A；义B | 义C`：**冒号后**的 `|` 表示义项大组，组内用 `；` 拆分。
- `词条,释义1；释义2`
- 以 `#` 开头的行、`【章节标题】` 整行视为注释/标题并跳过。

**Obsidian 笔记（如 `Yasi.md`，`.md` 导入）**

- `#### 词条：释义` / `#### 词条 中文`（无冒号）
- 引用块：`> - take up：…`、`> subtle adj. 微妙的`、`> **account for**` 下接 `- 释义` 或下一行中文
- 词根/同义行：`> evolution n. 进化`；行内 `**embark on/upon sth** 开始从事`
- `## 0504` 日期标题、例句示范行会自动跳过

内置示例词书位于 `app/public/wordbooks/`（与 `manifest.json` 配套）。

### 本地存储键（浏览器）

| 键前缀 / 键名 | 含义 |
|---------------|------|
| `swt-books-meta` | 用户导入词书的元数据列表 |
| `swt-book-<id>` | 某本导入词书的词条 JSON |
| `swt-prog-<id>` | 该词书下各词的 SRS 进度（`nextDue`、`intervalNext` 等） |
| `swt-llm-*` | 大模型开关、provider、API Key、模型名（Key 仅存本机） |

清除站点数据或删除上述键可重置对应数据。

### 快速开始

```bash
cd app
npm install
npm run dev
```

浏览器打开终端输出的本地地址（默认端口以 Vite 为准）。

```bash
npm run build    # 生产构建
npm run preview  # 本地预览构建结果
npm run lint     # ESLint
```

### Windows 快捷方式（一键开浏览器）

仓库根目录提供批处理，可**右键 → 发送到 → 桌面快捷方式**，或固定到任务栏：

| 文件 | 说明 |
|------|------|
| `start-dev.bat` | 进入 `app`、若无 `node_modules` 则 `npm install`，再 `npm run dev -- --open --host`（默认端口由 Vite 分配，常见为 5173）。 |
| `start-dev-port6294.bat` | 同上，但固定 **`--port 6294`** 并打开 `http://localhost:6294`。 |

关闭开发服务：关掉弹出的黑色命令行窗口即可。

### 大模型（可选）

1. 书架页展开 **「大模型生成例句+译文（可选）」**，勾选启用并填写 **API Key**（仅 `localStorage`）。
2. **Gemini**：浏览器直连 Google API，建议在 [Google AI Studio](https://aistudio.google.com/apikey) 创建密钥并限制 HTTP 来源。
3. **Groq**：`npm run dev` 时通过 `vite.config.js` 里 **`/api/groq` → Groq OpenAI 兼容接口** 转发，减轻浏览器 CORS 问题；静态部署到公网需自行配置同源代理。

### 仓库结构（核心）

```
ShanbeiWordTest/
├── start-dev.bat               # Windows：一键启动 + 浏览器
├── start-dev-port6294.bat      # Windows：固定 6294 端口
├── app/
│   ├── public/wordbooks/     # manifest.json + 示例 .txt 词书
│   ├── src/
│   │   ├── App.jsx
│   │   ├── useBookshelfStudy.js
│   │   ├── parseWordbook.js
│   │   ├── ieltsSentence.js  # 本地例句+译文模板
│   │   ├── llmExamples.js    # 可选在线生成
│   │   ├── llmSettings.js
│   │   └── bookStorage.js
│   └── vite.config.js        # 开发代理（Groq）
├── parser.js                 # （可选）根目录旧流程：生成 data.json
└── README.md
```

### 许可证与免责

项目按「学习交流」提供；第三方词典或模型服务受其各自条款约束。例句模板与模型输出仅供参考，请以权威辞书与考场要求为准。

---

<a id="english"></a>

## English

A **pure front-end** vocabulary / SRS web app (**React 19 + Vite 8 + Tailwind CSS 4**) for IELTS-style study: **bookshelf**, **multi-format `.txt` wordbooks**, **spaced repetition**, **reading-like example sentences with Chinese translations**, and an **optional LLM** (Gemini or Groq) to regenerate examples for the **daily review queue**. Progress is stored in the browser **localStorage**; no backend is required.

### Feature summary

| Area | Description |
|------|-------------|
| **Bookshelf** | Loads built-in books listed in `app/public/wordbooks/manifest.json`. Users can import `.txt` files or a folder of `.txt` files; imported books are persisted locally and listed on the shelf. |
| **Daily batch** | After picking a book, choose **10–100** words (step **5**). Words are taken from the **due** set ordered by scheduling (`nextDue`). |
| **Study UI** | Word card → **Show gloss & examples** → per-sense Chinese gloss + English example + Chinese translation of that sentence → **Known / Vague / Forgot**. |
| **SRS** | Simplified spacing: **Known** increases the interval (1→2→4… days); **Vague** keeps interval but keeps the card due **today**; **Forgot** resets interval and due date. Progress is stored **per book id**. |
| **Examples** | **Default:** bundled **templates** (academic English + paired Chinese translation). **Optional:** **Google Gemini** (browser) or **Groq** (dev server uses the Vite **`/api/groq` proxy**) with your own API key, applied to **words in the current session queue** when you start a session. |

### Wordbook `.txt` format (UTF-8)

- `lemma：gloss1；gloss2` (full-width `：` or ASCII `:`)
- `lemma | pos.gloss` — a leading `|` line is only parsed as **lemma | rest** if **`|` appears before the first `：`/`:`** on that line.
- `lemma：A；B | C` — after the colon, `|` splits **major sense groups**; `；` / `;` splits senses inside a group.
- `lemma,gloss1；gloss2`
- Lines starting with `#` or a whole line like `【Section】` are skipped.

Sample books live under `app/public/wordbooks/` together with `manifest.json`.

### LocalStorage keys

| Key / prefix | Purpose |
|--------------|---------|
| `swt-books-meta` | Metadata for user-imported books |
| `swt-book-<id>` | Serialized entries for an imported book |
| `swt-prog-<id>` | SRS progress map for that book |
| `swt-llm-*` | LLM toggle, provider, API key, model names (local only) |

Clear site data or delete these keys to reset the corresponding state.

### Quick start

```bash
cd app
npm install
npm run dev
```

Open the URL printed in the terminal (default port follows Vite).

```bash
npm run build
npm run preview
npm run lint
```

### Windows shortcuts (one double-click)

At the repo root:

| File | What it does |
|------|----------------|
| `start-dev.bat` | `cd app`, runs `npm install` if `node_modules` is missing, then `npm run dev -- --open --host` (default port is chosen by Vite, often **5173**). |
| `start-dev-port6294.bat` | Same, but forces **`--port 6294`** and opens `http://localhost:6294`. |

Right-click the `.bat` → **Send to** → **Desktop (create shortcut)**. Stop the dev server by closing the console window.

### Optional LLM

1. On the shelf page, open **“LLM example + translation (optional)”**, enable it, and paste an **API key** (stored only in `localStorage`).
2. **Gemini:** calls Google’s HTTP API from the browser; create a key in [Google AI Studio](https://aistudio.google.com/apikey) and restrict HTTP referrers if possible.
3. **Groq:** in **`npm run dev`**, requests go through **`/api/groq`** (see `vite.config.js`) to reduce CORS issues. For static hosting you still need your own same-origin proxy for Groq.

### Repository layout (core)

```
ShanbeiWordTest/
├── start-dev.bat
├── start-dev-port6294.bat
├── app/
│   ├── public/wordbooks/
│   ├── src/            # React app (bookshelf, SRS, parsers, LLM client)
│   └── vite.config.js  # dev proxy for Groq
├── parser.js           # optional legacy Node script → data.json
└── README.md
```

### License & disclaimer

Provided as-is for learning. Third-party APIs (dictionary, Gemini, Groq) remain under their own terms. Template and model outputs are **not** a substitute for authoritative dictionaries or exam instructions.
IOI