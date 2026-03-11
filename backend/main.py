"""
backend/main.py — FastAPI dev server (local development only)
In production, Vercel runs each /api/*.py file as a serverless function.
Run locally: uvicorn backend.main:app --reload --port 8000
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import asyncio, json

from api._utils import (
    verify_token, verify_password, ADMIN_SECRET,
    ArticleCreate, ArticleUpdate, AIGenerateRequest,
    get_all_articles, create_article,
    kv_get, kv_set, kv_del, kv_lrem
)

app = FastAPI(title="NEXUS CMS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/auth")
async def login(data: dict):
    username = data.get("username", "")
    password = data.get("password", "")
    if not verify_password(username, password):
        raise HTTPException(401, "Invalid credentials")
    return {"success": True, "token": ADMIN_SECRET, "user": {"username": username, "role": "admin"}}


# ── Articles ──────────────────────────────────────────────────────────────────

@app.get("/api/articles")
async def list_articles(
    category: Optional[str] = None,
    status: str = "published",
    limit: int = 20,
    offset: int = 0,
):
    articles, total = await get_all_articles(category=category, status=status, limit=limit, offset=offset)
    return {"success": True, "total": total, "articles": articles}


@app.post("/api/articles")
async def new_article(data: ArticleCreate, authorization: Optional[str] = Header(None)):
    if not verify_token(authorization or ""):
        raise HTTPException(401, "Unauthorized")
    article = await create_article(data)
    return JSONResponse(status_code=201, content={"success": True, "article": article})


@app.get("/api/articles/{article_id}")
async def get_article(article_id: str):
    raw = await kv_get(f"article:{article_id}")
    if not raw:
        # Try by slug
        arts, _ = await get_all_articles(status="all", limit=1000)
        for a in arts:
            if a.get("slug") == article_id:
                raw = json.dumps(a)
                break
    if not raw:
        raise HTTPException(404, "Article not found")

    article = json.loads(raw) if isinstance(raw, str) else raw
    article["views"] = article.get("views", 0) + 1
    await kv_set(f"article:{article['id']}", json.dumps(article))
    return {"success": True, "article": article}


@app.put("/api/articles/{article_id}")
async def update_article_ep(article_id: str, data: ArticleUpdate, authorization: Optional[str] = Header(None)):
    if not verify_token(authorization or ""):
        raise HTTPException(401, "Unauthorized")
    raw = await kv_get(f"article:{article_id}")
    if not raw:
        raise HTTPException(404, "Article not found")

    from datetime import datetime, timezone
    existing = json.loads(raw) if isinstance(raw, str) else raw
    updates = {k: v for k, v in data.dict().items() if v is not None}
    existing.update(updates)
    existing["updated_at"] = datetime.now(timezone.utc).isoformat()
    await kv_set(f"article:{article_id}", json.dumps(existing))
    return {"success": True, "article": existing}


@app.delete("/api/articles/{article_id}")
async def delete_article_ep(article_id: str, authorization: Optional[str] = Header(None)):
    if not verify_token(authorization or ""):
        raise HTTPException(401, "Unauthorized")
    raw = await kv_get(f"article:{article_id}")
    if not raw:
        raise HTTPException(404, "Article not found")
    await kv_del(f"article:{article_id}")
    await kv_lrem("article:ids", article_id)
    return {"success": True, "message": "Article deleted"}


# ── AI Generate ───────────────────────────────────────────────────────────────

@app.post("/api/ai-generate")
async def ai_generate(data: AIGenerateRequest, authorization: Optional[str] = Header(None)):
    if not verify_token(authorization or ""):
        raise HTTPException(401, "Unauthorized")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY not configured")

    word_count = {"short": 400, "medium": 800, "long": 1500}.get(data.length, 800)
    kw_str = f"Keywords: {', '.join(data.keywords)}" if data.keywords else ""

    system = f"You are a senior journalist for NEXUS media. Tone: {data.tone}. Return only valid JSON."
    user = f"""Write a {word_count}-word article about: "{data.topic}"
Category: {data.category} | Language: {data.language}
{kw_str}

Return ONLY JSON:
{{
  "title": "...",
  "excerpt": "...",
  "content": "Full HTML article",
  "tags": ["..."],
  "seo_title": "...",
  "seo_description": "...",
  "cover_image_query": "unsplash search query"
}}"""

    import urllib.request, urllib.error
    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "system": system,
        "messages": [{"role": "user", "content": user}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        rd = json.loads(resp.read().decode())

    text = rd["content"][0]["text"].strip().strip("```json").strip("```").strip()
    article = json.loads(text)
    query = article.get("cover_image_query", data.topic).replace(" ", ",")
    article["cover_image"] = f"https://images.unsplash.com/featured/?{query}&w=1200&q=80"
    article["category"] = data.category
    return {"success": True, "article": article}


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
async def stats(authorization: Optional[str] = Header(None)):
    if not verify_token(authorization or ""):
        raise HTTPException(401, "Unauthorized")

    articles, _ = await get_all_articles(status="all", limit=1000)
    by_cat = {}
    for a in articles:
        by_cat[a["category"]] = by_cat.get(a["category"], 0) + 1

    recent = sorted(articles, key=lambda a: a.get("created_at",""), reverse=True)[:5]
    recent = [{k: a[k] for k in ("id","title","category","status","created_at","views") if k in a} for a in recent]

    return {
        "success": True,
        "stats": {
            "total": len(articles),
            "published": sum(1 for a in articles if a.get("status")=="published"),
            "drafts": sum(1 for a in articles if a.get("status")=="draft"),
            "total_views": sum(a.get("views",0) for a in articles),
            "by_category": by_cat,
            "recent": recent,
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
