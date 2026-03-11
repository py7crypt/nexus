"""
/api/articles.py
Vercel Python runtime — uses FastAPI (ASGI), detected via top-level `app`.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
from _utils import verify_token, ArticleCreate, get_all_articles, create_article

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/articles")
async def list_articles(category: Optional[str]=None, status: str="published", limit: int=20, offset: int=0):
    articles, total = await get_all_articles(category=category, status=status, limit=limit, offset=offset)
    return {"success": True, "total": total, "articles": articles}


@app.post("/api/articles")
async def new_article(data: ArticleCreate, authorization: Optional[str]=Header(None)):
    if not verify_token(authorization or ""):
        return JSONResponse({"success": False, "error": "Unauthorized"}, status_code=401)
    if not data.title or not data.content or not data.category:
        return JSONResponse({"success": False, "error": "title, content, category required"}, status_code=400)
    article = await create_article(data)
    return JSONResponse({"success": True, "article": article}, status_code=201)
