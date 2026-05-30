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
| **学习卡片** | 显示单词 → 释义页可 **查看例句 / 联想 / 词根分析**（本地生成）→ **认识 / 模糊 / 忘记**。每完成 **6** 个词弹出**阶段性回顾**（悬停看释义）再继续。词根分析为**通用引擎**（拉丁/希腊前缀·词根·后缀 → 现代合成 → 日耳曼本土词）；同根词仅按词源血统匹配。覆盖率：`node scripts/etymology-coverage.mjs <词书.md>`。 |
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

**Obsidian JLPT 日语笔记（如 `JLPT05.md`）**

- `#### **詞（よみ）** [N2]：中文释义`
- `#### 物事（ものごと）：事物、事情`（读音写在全角括号内）
- 可选 JLPT 级别：`[N3]` 或行末 `N2`
- 学习时：**日语朗读**、例句为日语模板；释义页可 **查看词根**（汉字拆解）与 **查看联想**

内置示例词书位于 `app/public/wordbooks/`（与 `manifest.json` 配套）。

### 本地存储键（浏览器）

| 键前缀 / 键名 | 含义 |
|---------------|------|
| `swt-books-meta` | 用户导入词书的元数据列表 |
| `swt-book-<id>` | 某本导入词书的词条 JSON |
| `swt-prog-<id>` | 该词书下各词的 SRS 进度（`nextDue`、`intervalNext` 等） |
| `swt-history-<id>` | 该词书每次完成学习的测试记录（时间、词列表、不会的词） |
| `swt-llm-*` | 大模型开关、provider、API Key、模型名（Key 仅存本机） |

清除站点数据或删除上述键可重置对应数据。

**导入词书不会随磁盘文件自动变化**：浏览器无法实时监听 `Yasi.md` 等本地路径。修改笔记后，请在词书页点 **「从本地文件更新词表」**，或在书架再次选择**同名** `.md` / `.txt` 重新导入（会覆盖该词书并保留仍存在的词条的学习进度）。

**删除词书**：仅 **已导入** 词书可删（书架卡片右上角「删除」，或词书页底部「删除这本词书」）；内置词书不可删。删除会清除本机词条与学习进度。

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

### 部署到线上（推荐）

应用是纯前端静态站，可部署到任意静态托管。**DeepSeek / Groq 需平台提供同源 API 代理**（仓库已配好）。

| 平台 | 难度 | DeepSeek 词根 | 说明 |
|------|------|---------------|------|
| **[Vercel](https://vercel.com)** | ⭐ 最简单 | ✅ | 连接 GitHub 仓库 `Yunikoi/ShanbeiWordTest`，根目录已有 `vercel.json`，自动构建 |
| **[Netlify](https://netlify.com)** | ⭐ | ✅ | 导入仓库，使用根目录 `netlify.toml` |
| **GitHub Pages** | ⭐⭐ | ❌ 无代理 | 仅静态页；推送 `main` 后 Actions 自动部署。DeepSeek/Groq 不可用，Gemini 仍可用 |

**Vercel 一键步骤：**

1. 打开 [vercel.com](https://vercel.com) → Import Git Repository → 选 `ShanbeiWordTest`
2. 保持默认（Build：`cd app && npm run build`，Output：`app/dist`）
3. Deploy → 获得 `https://xxx.vercel.app` 公网地址

**Netlify：** 同样导入 GitHub 仓库，Build command / Publish directory 由 `netlify.toml` 自动读取。

**GitHub Pages：**

1. 仓库 Settings → Pages → Source 选 **GitHub Actions**
2. 推送 `main` 分支，workflow 自动发布到 `https://yunikoi.github.io/ShanbeiWordTest/`

**线上与本地差异：**

- 学习进度、词根缓存、API Key 仍在**各浏览器 localStorage**，换设备/换浏览器数据不互通（未做账号后端）。
- 用户自备 DeepSeek Key，在网站设置里填写即可；Key 不会进 Git 仓库。
- Gemini 需在 Google AI Studio 把线上域名加入 API Key 的 HTTP 来源限制。

### 云同步（手机 / 电脑自动同步，推荐）

一次性配置 [Supabase](https://supabase.com) 免费项目（约 5 分钟）：

1. 新建项目 → **SQL Editor** 运行仓库内 [`supabase/schema.sql`](supabase/schema.sql)
2. **Settings → API** 复制 Project URL 与 `anon` public key
3. 本地：复制 `app/.env.example` 为 `app/.env.local` 并填入  
   Vercel：**Settings → Environment Variables** 添加同名变量后重新 Deploy

使用：书架 **「云同步」** → 设一个同步码（或随机生成）→ **启用**。在手机上打开同一 Vercel 地址，输入**相同同步码**即可自动同步，约每 10 秒上传/拉取。

### 手动备份（可选）

书架 **「手动备份」**：导出 JSON / 恢复备份（无 Supabase 时的备选）。

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
3. **Groq / DeepSeek**：线上经 `/api/groq`、`/api/deepseek` 同源代理（Vercel / Netlify 已配置）；本地 `npm run dev` 由 Vite 转发。

### 仓库结构（核心）

```
ShanbeiWordTest/
├── vercel.json                 # Vercel 构建 + DeepSeek/Groq 代理
├── netlify.toml                # Netlify 同上
├── .github/workflows/          # GitHub Pages 自动部署
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