"""
Debug endpoint — tests KV, auth, and article lookup.
GET /api/debug          → env + KV health check
GET /api/debug?id=UUID  → look up a specific article key
"""
import sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(__file__))
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from _utils import _has_kv, _upstash, kv_get, kv_lrange, ADMIN_SECRET, verify_token

def _run(c):
    loop = asyncio.new_event_loop()
    r = loop.run_until_complete(c)
    loop.close()
    return r

class handler(BaseHTTPRequestHandler):
    def _json(self, code, body):
        data = json.dumps(body, indent=2).encode()
        self.send_response(code)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        article_id = qs.get("id", [None])[0]

        kv_url   = os.environ.get("KV_REST_API_URL", "")
        kv_token = os.environ.get("KV_REST_API_TOKEN", "")

        result = {
            "env": {
                "KV_REST_API_URL":   (kv_url[:40] + "...") if len(kv_url) > 40 else (kv_url or "NOT SET"),
                "KV_REST_API_TOKEN": "SET ✓" if kv_token else "NOT SET ✗",
                "ADMIN_SECRET":      "SET ✓" if os.environ.get("ADMIN_SECRET") else "NOT SET ✗",
            },
            "admin_secret_value": ADMIN_SECRET,
            "auth_header":  self.headers.get("Authorization", "none"),
            "auth_valid":   verify_token(self.headers.get("Authorization", "")),
            "kv_configured": _has_kv(),
        }

        if _has_kv():
            # Basic write/read test
            result["kv_write"] = _upstash("SET", "nexus:debug:test", "ok")
            result["kv_read"]  = _upstash("GET", "nexus:debug:test")
            result["kv_working"] = result["kv_read"] == "ok"

            # List all article IDs
            ids = _run(kv_lrange("article:ids", 0, -1))
            result["article_ids_in_kv"] = ids
            result["article_count"] = len(ids)

            if article_id:
                # Try fetching the specific article
                key = f"article:{article_id}"
                raw = _upstash("GET", key)
                result["lookup_key"]   = key
                result["lookup_raw"]   = raw[:200] if isinstance(raw, str) else raw
                result["lookup_found"] = raw is not None
                if raw:
                    try:
                        parsed = json.loads(raw)
                        result["lookup_title"] = parsed.get("title")
                        result["lookup_id"]    = parsed.get("id")
                    except Exception as e:
                        result["lookup_parse_error"] = str(e)
        else:
            result["kv_working"] = False

        self._json(200, result)

    def log_message(self, *a): pass
