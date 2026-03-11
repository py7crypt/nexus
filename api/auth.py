import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from _utils import verify_password, ADMIN_SECRET
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")

    def _json(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self): self._json(200, {})

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n)) if n else {}
        if verify_password(body.get("username",""), body.get("password","")):
            self._json(200, {"success": True, "token": ADMIN_SECRET,
                             "user": {"username": body.get("username"), "role": "admin"}})
        else:
            self._json(401, {"success": False, "error": "Invalid credentials"})

    def log_message(self, *a): pass
