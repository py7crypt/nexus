"""
Debug endpoint - test Upstash connection and show env var status.
Visit /api/debug after deploying to diagnose issues.
Remove this file after debugging.
"""
import sys, os, json, asyncio
sys.path.insert(0, os.path.dirname(__file__))
from http.server import BaseHTTPRequestHandler
from _utils import _has_kv, _upstash, kv_set, kv_get

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
        kv_url   = os.environ.get("KV_REST_API_URL", "")
        kv_token = os.environ.get("KV_REST_API_TOKEN", "")
        admin_secret = os.environ.get("ADMIN_SECRET", "")

        result = {
            "env": {
                "KV_REST_API_URL":   kv_url[:40] + "..." if len(kv_url) > 40 else (kv_url or "NOT SET"),
                "KV_REST_API_TOKEN": "SET ✓" if kv_token else "NOT SET ✗",
                "ADMIN_SECRET":      "SET ✓" if admin_secret else "NOT SET ✗ (using default)",
            },
            "kv_configured": _has_kv(),
        }

        if _has_kv():
            # Test write
            write_result = _upstash("SET", "nexus:debug:test", "hello-from-nexus")
            result["kv_write_test"] = write_result

            # Test read back
            read_result = _upstash("GET", "nexus:debug:test")
            result["kv_read_test"] = read_result

            result["kv_working"] = (read_result == "hello-from-nexus")
        else:
            result["kv_working"] = False
            result["kv_note"] = "Using in-memory fallback - data resets on cold start"

        self._json(200, result)

    def log_message(self, *a): pass
