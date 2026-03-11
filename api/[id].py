import sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from _utils import verify_token, get_all_articles, kv_get, kv_set, kv_del, kv_lrem, ARTICLE_FIELDS
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse

def _run(c):
    loop = asyncio.new_event_loop()
    r = loop.run_until_complete(c)
    loop.close()
    return r

def _get_id(path):
    return urlparse(path).path.rstrip("/").split("/")[-1]

def _load_article(article_id):
    # Try by UUID key first
    raw = _run(kv_get(f"article:{article_id}"))
    if raw:
        return json.loads(raw) if isinstance(raw, str) else raw
    # Fallback: scan all articles for matching id or slug
    arts, _ = _run(get_all_articles(status="all", limit=1000))
    for a in arts:
        if a.get("id") == article_id or a.get("slug") == article_id:
            return a
    return None

class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")

    def _json(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self._json(200, {})

    def do_GET(self):
        article_id = _get_id(self.path)
        a = _load_article(article_id)
        if not a:
            return self._json(404, {"success": False, "error": f"Article '{article_id}' not found"})
        a["views"] = a.get("views", 0) + 1
        _run(kv_set(f"article:{a['id']}", json.dumps(a)))
        self._json(200, {"success": True, "article": a})

    def do_PUT(self):
        if not verify_token(self.headers.get("Authorization", "")):
            return self._json(401, {"success": False, "error": "Unauthorized"})
        article_id = _get_id(self.path)
        a = _load_article(article_id)
        if not a:
            return self._json(404, {"success": False, "error": "Article not found"})
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n)) if n else {}
        # Update only known fields — ignore extras
        for k in ARTICLE_FIELDS:
            if k in body and body[k] is not None:
                a[k] = body[k]
        a["updated_at"] = datetime.now(timezone.utc).isoformat()
        _run(kv_set(f"article:{a['id']}", json.dumps(a)))
        self._json(200, {"success": True, "article": a})

    def do_DELETE(self):
        if not verify_token(self.headers.get("Authorization", "")):
            return self._json(401, {"success": False, "error": "Unauthorized"})
        article_id = _get_id(self.path)
        a = _load_article(article_id)
        if not a:
            return self._json(404, {"success": False, "error": "Article not found"})
        _run(kv_del(f"article:{a['id']}"))
        _run(kv_lrem("article:ids", a["id"]))
        self._json(200, {"success": True, "message": "Deleted"})

    def log_message(self, *a): pass
