import sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(__file__))
from _utils import verify_token, kv_get, kv_set
from http.server import BaseHTTPRequestHandler

KV_KEY = "nexus:social"

DEFAULTS = { "twitter": "", "facebook": "", "instagram": "", "linkedin": "", "youtube": "", "tiktok": "" }

def _run(c):
    loop = asyncio.new_event_loop()
    r = loop.run_until_complete(c)
    loop.close()
    return r

async def _get():
    raw = await kv_get(KV_KEY)
    if raw:
        try:
            data = json.loads(raw) if isinstance(raw, str) else raw
            return {**DEFAULTS, **data}
        except Exception:
            pass
    return DEFAULTS.copy()

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
        # Public — no auth needed
        self._json(200, {"success": True, "social": _run(_get())})

    def do_POST(self):
        if not verify_token(self.headers.get("Authorization", "")):
            return self._json(401, {"success": False, "error": "Unauthorized"})
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n)) if n else {}
        incoming = body.get("social", {})
        cleaned = {k: str(incoming.get(k, "")).strip() for k in DEFAULTS}
        _run(kv_set(KV_KEY, json.dumps(cleaned)))
        self._json(200, {"success": True, "social": cleaned})

    def log_message(self, *a): pass
