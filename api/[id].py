import sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from _utils import verify_token, get_all_articles, kv_get, kv_set, kv_del, kv_lrem
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

def _run(c):
    loop = asyncio.new_event_loop(); r = loop.run_until_complete(c); loop.close(); return r

def _get_id(path):
    return path.split("?")[0].rstrip("/").split("/")[-1]

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

    def _load(self, article_id):
        raw = _run(kv_get(f"article:{article_id}"))
        if not raw:
            arts, _ = _run(get_all_articles(status="all", limit=1000))
            for a in arts:
                if a.get("slug") == article_id: return a
            return None
        return json.loads(raw) if isinstance(raw, str) else raw

    def do_OPTIONS(self): self._json(200, {})

    def do_GET(self):
        a = self._load(_get_id(self.path))
        if not a: return self._json(404, {"success": False, "error": "Not found"})
        a["views"] = a.get("views", 0) + 1
        _run(kv_set(f"article:{a['id']}", json.dumps(a)))
        self._json(200, {"success": True, "article": a})

    def do_PUT(self):
        if not verify_token(self.headers.get("Authorization", "")):
            return self._json(401, {"success": False, "error": "Unauthorized"})
        a = self._load(_get_id(self.path))
        if not a: return self._json(404, {"success": False, "error": "Not found"})
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n)) if n else {}
        allowed = ["title","content","excerpt","category","author","tags","status","cover_image","seo_title","seo_description"]
        for k in allowed:
            if k in body and body[k] is not None: a[k] = body[k]
        a["updated_at"] = datetime.now(timezone.utc).isoformat()
        _run(kv_set(f"article:{a['id']}", json.dumps(a)))
        self._json(200, {"success": True, "article": a})

    def do_DELETE(self):
        if not verify_token(self.headers.get("Authorization", "")):
            return self._json(401, {"success": False, "error": "Unauthorized"})
        article_id = _get_id(self.path)
        a = self._load(article_id)
        if not a: return self._json(404, {"success": False, "error": "Not found"})
        _run(kv_del(f"article:{a['id']}"))
        _run(kv_lrem("article:ids", a['id']))
        self._json(200, {"success": True, "message": "Deleted"})

    def log_message(self, *a): pass
