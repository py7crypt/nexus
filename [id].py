"""
/api/articles/[id].py
Vercel Python runtime — FastAPI ASGI app.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime, timezone
from _utils import verify_token, ArticleUpdate, get_all_articles, kv_get, kv_set, kv_del, kv_lrem

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/articles/{article_id}")
async def get_article(article_id: str):
    raw = await kv_get(f"article:{article_id}")
    if not raw:
        arts, _ = await get_all_articles(status="all", limit=1000)
        for a in arts:
            if a.get("slug") == article_id:
                raw = json.dumps(a); break
    if not raw:
        return JSONResponse({"success": False, "error": "Not found"}, status_code=404)
    article = json.loads(raw) if isinstance(raw, str) else raw
    article["views"] = article.get("views", 0) + 1
    await kv_set(f"article:{article['id']}", json.dumps(article))
    return {"success": True, "article": article}


@app.put("/api/articles/{article_id}")
async def update_article(article_id: str, data: ArticleUpdate, authorization: Optional[str]=Header(None)):
    if not verify_token(authorization or ""):
        return JSONResponse({"success": False, "error": "Unauthorized"}, status_code=401)
    raw = await kv_get(f"article:{article_id}")
    if not raw:
        return JSONResponse({"success": False, "error": "Not found"}, status_code=404)
    existing = json.loads(raw) if isinstance(raw, str) else raw
    updates = {k: v for k, v in data.dict().items() if v is not None}
    existing.update(updates)
    existing["updated_at"] = datetime.now(timezone.utc).isoformat()
    await kv_set(f"article:{article_id}", json.dumps(existing))
    return {"success": True, "article": existing}


@app.delete("/api/articles/{article_id}")
async def delete_article(article_id: str, authorization: Optional[str]=Header(None)):
    if not verify_token(authorization or ""):
        return JSONResponse({"success": False, "error": "Unauthorized"}, status_code=401)
    raw = await kv_get(f"article:{article_id}")
    if not raw:
        return JSONResponse({"success": False, "error": "Not found"}, status_code=404)
    await kv_del(f"article:{article_id}")
    await kv_lrem("article:ids", article_id)
    return {"success": True, "message": "Deleted"}
