# NEXUS Fullstack — React + Python on Vercel

A complete fullstack digital magazine platform with multi-model AI article generation.

- **Frontend**: React 18 + Vite + Tailwind CSS + HashRouter + React Query
- **Backend**: Python serverless functions (Vercel) · zero pip dependencies
- **AI**: Multi-model — Claude, GPT-4o, DeepSeek, Gemini
- **Storage**: Vercel KV (Upstash Redis) or in-memory fallback
- **Routing**: HashRouter (`/#/route`) — works on Vercel with zero server config

---

## 📁 Project Structure

```
nexus-fullstack/
├── vercel.json                  Vercel routing config
├── .env.example                 Environment variables template
├── README.md
│
├── frontend/
│   ├── index.html
│   ├── package.json             includes quill ^2.0.2
│   ├── vite.config.js           proxies /api → :8000 in dev
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx             HashRouter entry point
│       ├── App.jsx              Route definitions
│       ├── api.js               All fetch calls to Python backend
│       ├── utils.js             Live categories from localStorage + helpers
│       ├── index.css            Tailwind + custom classes
│       ├── context/
│       │   └── AppContext.jsx   Auth + dark mode state
│       ├── components/
│       │   ├── PublicLayout.jsx  Nav (live categories) + ticker + footer
│       │   ├── AdminLayout.jsx   Sidebar with all admin links
│       │   └── shared.jsx        ArticleCard, HeroArticle, Spinner, Toast, SEOScore
│       └── pages/
│           ├── HomePage.jsx       Hero grid, trending, category sections, sidebar
│           ├── ArticlePage.jsx    Single article + related + share
│           ├── CategoryPage.jsx   Category listing with color header
│           └── admin/
│               ├── LoginPage.jsx
│               ├── Dashboard.jsx       Stats computed client-side from article list
│               ├── ArticlesList.jsx    Search / filter / delete table
│               ├── ArticleEditor.jsx   Quill rich editor + SEO score
│               ├── AIGenerator.jsx     Multi-model AI generation UI
│               ├── Categories.jsx      Add / edit / delete categories
│               └── Settings.jsx        Env vars grouped by provider + model table
│
├── api/                         Python Vercel serverless (BaseHTTPRequestHandler)
│   ├── requirements.txt         EMPTY — zero pip installs
│   ├── _utils.py                Shared: auth, KV storage (urllib), in-memory fallback
│   ├── articles.py              GET list / POST create
│   ├── articles/[id].py         GET / PUT / DELETE single (urlparse ID extraction)
│   ├── ai-generate.py           Multi-model: Anthropic, OpenAI, DeepSeek, Gemini
│   ├── stats.py                 GET dashboard stats
│   └── auth.py                  POST login
│
└── backend/
    ├── main.py                  FastAPI local dev server
    └── requirements.txt         fastapi, uvicorn, pydantic
```

---

## 🚀 Local Development

### 1. Install dependencies
```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && pip install -r requirements.txt
```

### 2. Environment setup
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run both servers
```bash
# Terminal 1 — Python backend on :8000
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2 — React frontend on :5173 (proxies /api → :8000)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🌐 Deploy to Vercel

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "NEXUS Fullstack"
git remote add origin https://github.com/YOUR_USER/nexus-fullstack.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Framework Preset: **Other**
4. Build Command: `cd frontend && npm install && npm run build`
5. Output Directory: `frontend/dist`
6. Click **Deploy**

### 3. Set Environment Variables
Go to **Vercel Dashboard → Project → Settings → Environment Variables** and add the variables for the features you want to use.

#### 🔐 Admin Auth (required)
| Variable | Purpose |
|---|---|
| `ADMIN_SECRET` | Bearer token used by the frontend to authenticate API calls |
| `ADMIN_USERNAME` | Admin login username (default: `admin`) |
| `ADMIN_PASSWORD` | Admin login password (default: `nexus2025`) |

#### 🟠 Anthropic — Claude models
| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) · enables Claude Sonnet, Opus, Haiku |

#### 🟢 OpenAI — GPT models
| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | From [platform.openai.com](https://platform.openai.com) · enables GPT-4o and GPT-4o Mini |

#### 🔵 DeepSeek — DeepSeek models
| Variable | Purpose |
|---|---|
| `DEEPSEEK_API_KEY` | From [platform.deepseek.com](https://platform.deepseek.com) · enables DeepSeek V3 and R1 Reasoner |

#### 🔴 Google — Gemini models
| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | From [aistudio.google.com](https://aistudio.google.com) · enables Gemini 2.0 Flash and 1.5 Pro |

#### 🗄️ Storage (recommended for persistence)
| Variable | Purpose |
|---|---|
| `KV_REST_API_URL` | Vercel KV (Upstash Redis) REST URL |
| `KV_REST_API_TOKEN` | Vercel KV auth token |

> You only need to set keys for the AI providers you want to use. The others can be left empty.

### 4. Add Persistent Storage
1. Vercel Dashboard → Your Project → **Storage** tab
2. **Create Database → KV** (Upstash)
3. Vercel auto-adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`
4. Redeploy

Without KV, articles use in-memory storage and reset on every cold start.

---

## 🔐 Admin Panel

URL: `https://your-project.vercel.app/#/admin`

Default credentials (change via env vars):
- Username: `admin`
- Password: `nexus2025`

### Admin Pages

| Page | Route | Features |
|---|---|---|
| **Dashboard** | `/#/admin` | Stats computed live from article list · recent articles · category breakdown chart |
| **Articles** | `/#/admin/articles` | Search, filter by category/status, edit, delete |
| **Editor** | `/#/admin/articles/new` | Quill rich text editor · SEO score · cover image · tags · draft/publish |
| **AI Generator** | `/#/admin/ai` | Multi-model generation · provider tabs · tone/length/keyword/language controls |
| **Categories** | `/#/admin/categories` | Add, edit, delete categories · live color + icon picker · instant sync to nav and homepage |
| **Settings** | `/#/admin/settings` | Env vars grouped by provider · model reference table · API docs |

---

## 🤖 AI Models

The AI generator supports 9 models across 4 providers. Each provider uses its own API key.

| Provider | Model | Model ID | Env Key |
|---|---|---|---|
| 🟠 Anthropic | Claude Sonnet 4.5 | `claude-sonnet-4-5` | `ANTHROPIC_API_KEY` |
| 🟠 Anthropic | Claude Opus 4.5 | `claude-opus-4-5` | `ANTHROPIC_API_KEY` |
| 🟠 Anthropic | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | `ANTHROPIC_API_KEY` |
| 🟢 OpenAI | GPT-4o | `gpt-4o` | `OPENAI_API_KEY` |
| 🟢 OpenAI | GPT-4o Mini | `gpt-4o-mini` | `OPENAI_API_KEY` |
| 🔵 DeepSeek | DeepSeek V3 | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| 🔵 DeepSeek | DeepSeek R1 (Reasoner) | `deepseek-reasoner` | `DEEPSEEK_API_KEY` |
| 🔴 Google | Gemini 2.0 Flash | `gemini-2.0-flash` | `GEMINI_API_KEY` |
| 🔴 Google | Gemini 1.5 Pro | `gemini-1.5-pro` | `GEMINI_API_KEY` |

---

## 📂 Category Management

Categories are managed from **Admin → Categories** and stored in the browser's `localStorage`.

- Add categories with a custom name, emoji icon, and color
- Changes reflect instantly in the site nav, homepage sections, and article editor dropdowns
- 7 default categories pre-loaded: Technology, Science, Business, Health, Lifestyle, Travel, Entertainment
- Reset to defaults at any time

> Categories are browser-local. For multi-device sync, connect a database via the KV storage setup.

---

## 🔌 API Reference

All write endpoints require the header: `Authorization: Bearer YOUR_ADMIN_SECRET`

```
POST   /api/auth                           Login → returns token
GET    /api/articles                       List published articles
GET    /api/articles?status=all            List all articles (admin)
GET    /api/articles?category=Technology   Filter by category
GET    /api/articles/[id]                  Get by ID or slug (increments views)
POST   /api/articles                       Create article (auth)
PUT    /api/articles/[id]                  Update article (auth)
DELETE /api/articles/[id]                  Delete article (auth)
GET    /api/ai-generate                    List available AI models
POST   /api/ai-generate                    Generate article with AI (auth)
GET    /api/stats                          Dashboard statistics (auth)
```

### POST /api/ai-generate body
```json
{
  "topic": "How quantum computing will disrupt cybersecurity",
  "model": "claude-sonnet-4-5",
  "category": "Technology",
  "tone": "professional",
  "length": "medium",
  "keywords": ["quantum", "encryption"],
  "language": "English"
}
```

### POST /api/articles body
```json
{
  "title": "Article Title",
  "content": "<p>HTML content</p>",
  "excerpt": "Short summary",
  "category": "Technology",
  "author": "Jane Doe",
  "tags": ["ai", "tech"],
  "status": "published",
  "cover_image": "https://...",
  "seo_title": "SEO Title (60 chars max)",
  "seo_description": "Meta description (155 chars max)"
}
```

---

## 🛠️ Technical Notes

- **Routing**: Uses `HashRouter` so all page navigations work on Vercel without server rewrites. URLs are in the format `yoursite.com/#/article/123`.
- **Python functions**: Use `BaseHTTPRequestHandler` (stdlib only) — no pip installs, compatible with any Python version Vercel provides.
- **KV storage**: Uses synchronous `urllib` REST calls to Upstash — no async complexity in serverless context.
- **Dashboard stats**: Computed client-side from the articles list rather than a separate stats endpoint, so counts are always accurate even after cold starts.
- **Categories**: Stored in `localStorage` and read live via `getCategories()` — no page reload needed after adding/removing a category.

---

Built with ❤️ · React + Python + Vercel Serverless
