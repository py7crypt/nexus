"""
/api/stats.py — GET dashboard statistics
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
from _utils import verify_token, get_all_articles

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/stats")
async def get_stats(authorization: Optional[str]=Header(None)):
    if not verify_token(authorization or ""):
        return JSONResponse({"success": False, "error": "Unauthorized"}, status_code=401)

    articles, _ = await get_all_articles(status="all", limit=1000)
    by_cat = {}
    for a in articles:
        cat = a.get("category", "Other")
        by_cat[cat] = by_cat.get(cat, 0) + 1

    recent = sorted(articles, key=lambda a: a.get("created_at",""), reverse=True)[:5]
    recent = [{k: a[k] for k in ("id","title","category","status","created_at","views") if k in a} for a in recent]

    return {
        "success": True,
        "stats": {
            "total": len(articles),
            "published": sum(1 for a in articles if a.get("status") == "published"),
            "drafts": sum(1 for a in articles if a.get("status") == "draft"),
            "total_views": sum(a.get("views", 0) for a in articles),
            "by_category": by_cat,
            "recent": recent,
        }
    }
