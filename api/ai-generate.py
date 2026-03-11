import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from _utils import verify_token
from http.server import BaseHTTPRequestHandler
import urllib.request, urllib.error

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
        if not verify_token(self.headers.get("Authorization", "")):
            return self._json(401, {"success": False, "error": "Unauthorized"})
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return self._json(500, {"success": False, "error": "ANTHROPIC_API_KEY not set in Vercel environment variables."})
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n)) if n else {}
        topic    = body.get("topic", "").strip()
        if not topic: return self._json(400, {"success": False, "error": "topic is required"})
        category = body.get("category", "Technology")
        tone     = body.get("tone", "professional")
        length   = body.get("length", "medium")
        keywords = body.get("keywords", [])
        language = body.get("language", "English")
        words    = {"short": 400, "medium": 800, "long": 1500}.get(length, 800)
        kw       = f"Include these keywords: {', '.join(keywords)}" if keywords else ""

        prompt = f"""Write a {words}-word article about: "{topic}"
Category: {category} | Tone: {tone} | Language: {language}
{kw}

Return ONLY this JSON (no markdown, no extra text):
{{
  "title": "headline",
  "excerpt": "2-3 sentence summary",
  "content": "Full HTML using h2,h3,p,ul,li,strong,blockquote tags",
  "tags": ["tag1","tag2","tag3"],
  "seo_title": "60 char max",
  "seo_description": "155 char max",
  "cover_image_query": "4-6 word unsplash query"
}}"""

        payload = json.dumps({
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 4096,
            "system": f"Senior journalist for NEXUS. Tone: {tone}. Return only valid JSON.",
            "messages": [{"role": "user", "content": prompt}]
        }).encode()

        try:
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages",
                data=payload,
                headers={"Content-Type":"application/json","x-api-key":api_key,"anthropic-version":"2023-06-01"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                rd = json.loads(resp.read().decode())
            text = rd["content"][0]["text"].strip()
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"): text = text[4:]
            text = text.strip().rstrip("`").strip()
            article = json.loads(text)
            q = article.get("cover_image_query", topic).replace(" ", ",")
            article["cover_image"] = f"https://images.unsplash.com/featured/?{q}&w=1200&q=80"
            article["category"] = category
            self._json(200, {"success": True, "article": article})
        except urllib.error.HTTPError as e:
            self._json(502, {"success": False, "error": f"Anthropic error {e.code}: {e.read().decode()[:200]}"})
        except json.JSONDecodeError as e:
            self._json(500, {"success": False, "error": f"AI returned invalid JSON: {e}"})
        except Exception as e:
            self._json(500, {"success": False, "error": str(e)})

    def log_message(self, *a): pass
