import sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(__file__))
from _utils import verify_token, ArticleCreate, get_all_articles, create_article
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

def _run(c):
    loop = asyncio.new_event_loop(); r = loop.run_until_complete(c); loop.close(); return r

class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
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
        qs = parse_qs(urlparse(self.path).query)
        articles, total = _run(get_all_articles(
            category=qs.get("category",[None])[0],
            status=qs.get("status",["published"])[0],
            limit=int(qs.get("limit",[20])[0]),
            offset=int(qs.get("offset",[0])[0]),
        ))
        self._json(200, {"success": True, "total": total, "articles": articles})

    def do_POST(self):
        if not verify_token(self.headers.get("Authorization", "")):
            return self._json(401, {"success": False, "error": "Unauthorized"})
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n)) if n else {}
        if not body.get("title") or not body.get("content") or not body.get("category"):
            return self._json(400, {"success": False, "error": "title, content, category required"})
        article = _run(create_article(ArticleCreate(**body)))
        self._json(201, {"success": True, "article": article})

    def log_message(self, *a): pass
