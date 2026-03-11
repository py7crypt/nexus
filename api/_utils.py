"""
Shared utilities — models, auth, KV storage (sync urllib, zero pip deps)
"""
import os, json, uuid
from datetime import datetime, timezone
from typing import Optional, List, Any

# ─── AUTH ──────────────────────────────────────────────────────────────────

ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "nexus-admin-2025")
ADMIN_USER   = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASS   = os.environ.get("ADMIN_PASSWORD", "nexus2025")

def verify_token(authorization: str) -> bool:
    parts = (authorization or "").split(" ")
    return len(parts) == 2 and parts[0].lower() == "bearer" and parts[1] == ADMIN_SECRET

def verify_password(username: str, password: str) -> bool:
    return username == ADMIN_USER and password == ADMIN_PASS

# ─── IN-MEMORY STORE (fallback when no KV env vars) ────────────────────────
_mem: dict = {}
_lists: dict = {}

# ─── KV HELPERS (sync urllib — zero external deps) ─────────────────────────

def _kv_request(method: str, path: str, body=None) -> Any:
    import urllib.request
    url   = os.environ.get("KV_REST_API_URL", "")
    token = os.environ.get("KV_REST_API_TOKEN", "")
    if not url or not token:
        return None
    req = urllib.request.Request(
        f"{url}{path}",
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode()).get("result")
    except Exception:
        return None

def _has_kv() -> bool:
    return bool(os.environ.get("KV_REST_API_URL") and os.environ.get("KV_REST_API_TOKEN"))

# Async wrappers kept for compatibility with existing callers
async def kv_get(key: str) -> Optional[Any]:
    if _has_kv():
        return _kv_request("GET", f"/get/{key}")
    return _mem.get(key)

async def kv_set(key: str, value: Any) -> None:
    v = json.dumps(value) if not isinstance(value, str) else value
    if _has_kv():
        _kv_request("POST", f"/set/{key}", {"value": v})
    else:
        _mem[key] = v

async def kv_del(key: str) -> None:
    if _has_kv():
        _kv_request("POST", f"/del/{key}")
    else:
        _mem.pop(key, None)

async def kv_lpush(key: str, value: str) -> None:
    if _has_kv():
        _kv_request("POST", f"/lpush/{key}", {"value": value})
    else:
        _lists.setdefault(key, []).insert(0, value)

async def kv_lrange(key: str, start: int = 0, end: int = -1) -> List[str]:
    if _has_kv():
        result = _kv_request("GET", f"/lrange/{key}/{start}/{end if end != -1 else 9999}")
        return result or []
    lst = _lists.get(key, [])
    return lst[start:] if end == -1 else lst[start:end + 1]

async def kv_lrem(key: str, value: str) -> None:
    if _has_kv():
        _kv_request("POST", f"/lrem/{key}/0/{value}")
    else:
        if key in _lists:
            _lists[key] = [v for v in _lists[key] if v != value]

# ─── ARTICLE HELPERS ───────────────────────────────────────────────────────

# Fields accepted when creating/updating articles
ARTICLE_FIELDS = {
    "title", "content", "excerpt", "category", "author",
    "tags", "status", "cover_image", "seo_title", "seo_description", "slug"
}

def make_slug(title: str, article_id: str) -> str:
    base = "".join(c if c.isalnum() or c in " -" else "" for c in title.lower())
    base = "-".join(base.split())[:80]
    return f"{base}-{article_id[:6]}"

async def get_all_articles(
    category: Optional[str] = None,
    status: Optional[str] = "published",
    limit: int = 20,
    offset: int = 0,
) -> tuple:
    ids = await kv_lrange("article:ids", 0, -1)
    articles = []
    for aid in ids:
        raw = await kv_get(f"article:{aid}")
        if raw:
            a = json.loads(raw) if isinstance(raw, str) else raw
            articles.append(a)

    if status and status != "all":
        articles = [a for a in articles if a.get("status") == status]
    if category:
        articles = [a for a in articles if a.get("category", "").lower() == category.lower()]

    articles.sort(key=lambda a: a.get("created_at", ""), reverse=True)
    total = len(articles)
    return articles[offset: offset + limit], total

async def create_article(data: dict) -> dict:
    article_id = str(uuid.uuid4())
    now        = datetime.now(timezone.utc).isoformat()
    title      = data.get("title", "")
    content    = data.get("content", "")
    article = {
        "id":              article_id,
        "slug":            data.get("slug") or make_slug(title, article_id),
        "title":           title,
        "content":         content,
        "excerpt":         data.get("excerpt") or content.replace("<", " <").replace(">", "> ")[:200],
        "category":        data.get("category", ""),
        "author":          data.get("author") or "NEXUS Editorial",
        "tags":            data.get("tags") or [],
        "status":          data.get("status") or "published",
        "cover_image":     data.get("cover_image") or "",
        "seo_title":       data.get("seo_title") or title,
        "seo_description": data.get("seo_description") or "",
        "views":           0,
        "created_at":      now,
        "updated_at":      now,
    }
    await kv_set(f"article:{article_id}", json.dumps(article))
    await kv_lpush("article:ids", article_id)
    return article
