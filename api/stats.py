import sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(__file__))
from _utils import verify_token, get_all_articles
from http.server import BaseHTTPRequestHandler

def _run(c):
    loop = asyncio.new_event_loop(); r = loop.run_until_complete(c); loop.close(); return r

class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")

    def _json(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self): self._json(200, {})

    def do_GET(self):
        if not verify_token(self.headers.get("Authorization", "")):
            return self._json(401, {"success": False, "error": "Unauthorized"})
        articles, _ = _run(get_all_articles(status="all", limit=1000))
        by_cat = {}
        for a in articles:
            by_cat[a.get("category","Other")] = by_cat.get(a.get("category","Other"), 0) + 1
        recent = sorted(articles, key=lambda a: a.get("created_at",""), reverse=True)[:5]
        recent = [{k: a[k] for k in ("id","title","category","status","created_at","views") if k in a} for a in recent]
        self._json(200, {"success": True, "stats": {
            "total": len(articles),
            "published": sum(1 for a in articles if a.get("status") == "published"),
            "drafts": sum(1 for a in articles if a.get("status") == "draft"),
            "total_views": sum(a.get("views", 0) for a in articles),
            "by_category": by_cat, "recent": recent,
        }})

    def log_message(self, *a): pass
