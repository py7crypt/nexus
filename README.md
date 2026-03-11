#  NEXUS — React + Python (FastAPI) on Vercel

A complete fullstack magazine platform:
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router + React Query
- **Backend**: Python serverless functions (Vercel) + FastAPI for local dev
- **AI**: Anthropic Claude for automated article generation
- **Storage**: Vercel KV (Upstash Redis) or in-memory fallback

---

## 📁 Project Structure

```
nexus-fullstack/
├── frontend/               React + Vite app
│   ├── src/
│   │   ├── App.jsx          React Router setup
│   │   ├── api.js           All API fetch calls
│   │   ├── utils.js         Helpers & constants
│   │   ├── context/
│   │   │   └── AppContext.jsx  Theme + Auth state
│   │   ├── components/
│   │   │   ├── PublicLayout.jsx  Site nav + footer
│   │   │   ├── AdminLayout.jsx   Admin sidebar layout
│   │   │   └── shared.jsx        Cards, Toast, Spinner, SEO
│   │   └── pages/
│   │       ├── HomePage.jsx       Public magazine home
│   │       ├── ArticlePage.jsx    Single article
│   │       ├── CategoryPage.jsx   Category listing
│   │       └── admin/
│   │           ├── LoginPage.jsx
│   │           ├── Dashboard.jsx
│   │           ├── ArticlesList.jsx
│   │           ├── ArticleEditor.jsx  Quill rich editor
│   │           ├── AIGenerator.jsx    AI article creator
│   │           └── Settings.jsx
│   ├── vite.config.js       Proxies /api → :8000 in dev
│   └── tailwind.config.js
│
├── api/                    Python Vercel serverless functions
│   ├── _utils.py           Shared models, auth, KV storage
│   ├── articles.py         GET list / POST create
│   ├── articles/[id].py    GET / PUT / DELETE single
│   ├── ai-generate.py      POST → Anthropic API
│   ├── stats.py            GET dashboard stats
│   └── auth.py             POST login
│
├── backend/
│   ├── main.py             FastAPI local dev server
│   └── requirements.txt    Python deps
│
├── vercel.json             Vercel routing + function config
└── .env.example            Environment variables template
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

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env and fill in your values
```

### 3. Run both servers
```bash
# Terminal 1 — Python backend on :8000
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2 — React frontend on :5173 (proxies /api to :8000)
cd frontend && npm run dev
```

Open http://localhost:5173

---

## 🌐 Deploy to Vercel

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "NEXUS Fullstack"
git remote add origin https://github.com/YOUR_USER/nexus-fullstack.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework Preset: **Other**
4. Build Command: `cd frontend && npm install && npm run build`
5. Output Directory: `frontend/dist`
6. Click **Deploy**

### 3. Set Environment Variables
In Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_SECRET` | ✅ | Bearer token for admin API |
| `ADMIN_USERNAME` | ✅ | Login username |
| `ADMIN_PASSWORD` | ✅ | Login password |
| `ANTHROPIC_API_KEY` | For AI | Claude API key |
| `KV_REST_API_URL` | For persistence | Vercel KV URL |
| `KV_REST_API_TOKEN` | For persistence | Vercel KV token |

### 4. Add Persistent Storage (Recommended)
1. Vercel Dashboard → Your Project → **Storage** tab
2. **Create Database → KV** (powered by Upstash)
3. Vercel auto-adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`
4. Redeploy

Without KV, data uses in-memory storage (resets on cold start).

---

## 🔐 Admin Access

- URL: `https://your-site.vercel.app/admin`
- Default username: `admin`
- Default password: `nexus2025`
- Change via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars

### Admin Features
| Page | Features |
|---|---|
| **Dashboard** | Stats cards, recent articles, category breakdown |
| **Articles** | Search, filter, edit, delete all articles |
| **Editor** | Quill rich text, SEO score, cover image, tags, preview |
| **AI Generator** | Topic → full article, tone/length/keyword control, publish/edit |
| **Settings** | API config, env var reference, API docs |

---

## 🔌 API Reference

All write endpoints require `Authorization: Bearer YOUR_ADMIN_SECRET`

```
POST /api/auth                          → Login
GET  /api/articles                      → List published
GET  /api/articles?category=Technology  → Filter
GET  /api/articles?status=all           → All (admin)
GET  /api/articles/[id]                 → Get by ID or slug
POST /api/articles                      → Create (auth)
PUT  /api/articles/[id]                 → Update (auth)
DELETE /api/articles/[id]               → Delete (auth)
POST /api/ai-generate                   → Generate with AI (auth)
GET  /api/stats                         → Dashboard stats (auth)
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
  "seo_title": "SEO Title (60 chars)",
  "seo_description": "Meta description (155 chars)"
}
```

---

Built with ❤️ · React + Python + Vercel Serverless
