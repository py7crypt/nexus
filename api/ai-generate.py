import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from _utils import verify_token
from http.server import BaseHTTPRequestHandler
import urllib.request, urllib.error

# ── Model registry ────────────────────────────────────────────────────────────
# Each entry: (env_var_for_api_key, api_url, request_builder_fn, response_parser_fn)

MODELS = {
    # ── Anthropic ────────────────────────────────────────────────────────────
    "claude-sonnet-4-5": {
        "label":    "Claude Sonnet 4.5",
        "provider": "Anthropic",
        "env_key":  "ANTHROPIC_API_KEY",
    },
    "claude-opus-4-5": {
        "label":    "Claude Opus 4.5",
        "provider": "Anthropic",
        "env_key":  "ANTHROPIC_API_KEY",
    },
    "claude-haiku-4-5-20251001": {
        "label":    "Claude Haiku 4.5",
        "provider": "Anthropic",
        "env_key":  "ANTHROPIC_API_KEY",
    },
    # ── OpenAI ───────────────────────────────────────────────────────────────
    "gpt-4o": {
        "label":    "GPT-4o",
        "provider": "OpenAI",
        "env_key":  "OPENAI_API_KEY",
    },
    "gpt-4o-mini": {
        "label":    "GPT-4o Mini",
        "provider": "OpenAI",
        "env_key":  "OPENAI_API_KEY",
    },
    # ── DeepSeek ─────────────────────────────────────────────────────────────
    "deepseek-chat": {
        "label":    "DeepSeek V3",
        "provider": "DeepSeek",
        "env_key":  "DEEPSEEK_API_KEY",
    },
    "deepseek-reasoner": {
        "label":    "DeepSeek R1 (Reasoner)",
        "provider": "DeepSeek",
        "env_key":  "DEEPSEEK_API_KEY",
    },
    # ── Google Gemini ─────────────────────────────────────────────────────────
    "gemini-2.0-flash": {
        "label":    "Gemini 2.0 Flash",
        "provider": "Google",
        "env_key":  "GEMINI_API_KEY",
    },
    "gemini-1.5-pro": {
        "label":    "Gemini 1.5 Pro",
        "provider": "Google",
        "env_key":  "GEMINI_API_KEY",
    },
}


def _build_request(model_id, model_cfg, api_key, system_prompt, user_prompt):
    """Return (url, headers, payload_bytes) for each provider."""
    provider = model_cfg["provider"]

    if provider == "Anthropic":
        payload = json.dumps({
            "model": model_id,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}]
        }).encode()
        return (
            "https://api.anthropic.com/v1/messages",
            {"Content-Type": "application/json", "x-api-key": api_key, "anthropic-version": "2023-06-01"},
            payload
        )

    if provider == "OpenAI":
        payload = json.dumps({
            "model": model_id,
            "max_tokens": 4096,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ]
        }).encode()
        return (
            "https://api.openai.com/v1/chat/completions",
            {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            payload
        )

    if provider == "DeepSeek":
        payload = json.dumps({
            "model": model_id,
            "max_tokens": 4096,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ]
        }).encode()
        return (
            "https://api.deepseek.com/v1/chat/completions",
            {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            payload
        )

    if provider == "Google":
        # Gemini REST API — system instruction + user content
        payload = json.dumps({
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": user_prompt}]}],
            "generationConfig": {"maxOutputTokens": 4096, "temperature": 0.7}
        }).encode()
        return (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}",
            {"Content-Type": "application/json"},
            payload
        )

    raise ValueError(f"Unknown provider: {provider}")


def _parse_response(provider, rd):
    """Extract text from each provider's response shape."""
    if provider == "Anthropic":
        return rd["content"][0]["text"]
    if provider in ("OpenAI", "DeepSeek"):
        return rd["choices"][0]["message"]["content"]
    if provider == "Google":
        return rd["candidates"][0]["content"]["parts"][0]["text"]
    raise ValueError(f"Unknown provider: {provider}")


def _clean_json(text):
    text = text.strip()
    if "```" in text:
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else parts[0]
        if text.startswith("json"):
            text = text[4:]
    return text.strip().rstrip("`").strip()


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

    def do_GET(self):
        # Return model list so frontend can display them
        models_list = [
            {"id": k, "label": v["label"], "provider": v["provider"], "env_key": v["env_key"]}
            for k, v in MODELS.items()
        ]
        self._json(200, {"success": True, "models": models_list})

    def do_POST(self):
        if not verify_token(self.headers.get("Authorization", "")):
            return self._json(401, {"success": False, "error": "Unauthorized"})

        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n)) if n else {}

        topic    = body.get("topic", "").strip()
        if not topic:
            return self._json(400, {"success": False, "error": "topic is required"})

        model_id = body.get("model", "claude-sonnet-4-5")
        if model_id not in MODELS:
            return self._json(400, {"success": False, "error": f"Unknown model: {model_id}"})

        model_cfg = MODELS[model_id]
        provider  = model_cfg["provider"]
        env_key   = model_cfg["env_key"]
        api_key   = os.environ.get(env_key)

        if not api_key:
            return self._json(500, {
                "success": False,
                "error": f"{env_key} is not set. Add it in Vercel → Settings → Environment Variables."
            })

        category = body.get("category", "Technology")
        tone     = body.get("tone", "professional")
        length   = body.get("length", "medium")
        keywords = body.get("keywords", [])
        language = body.get("language", "English")
        words    = {"short": 400, "medium": 800, "long": 1500}.get(length, 800)
        kw       = f"Include these keywords: {', '.join(keywords)}" if keywords else ""

        system_prompt = (
            f"You are a senior journalist for NEXUS digital media. "
            f"Tone: {tone}. Language: {language}. "
            f"Return ONLY valid JSON — no markdown fences, no preamble, no extra text."
        )
        user_prompt = f"""Write a {words}-word article about: "{topic}"
Category: {category} | Tone: {tone} | Language: {language}
{kw}

Return ONLY this JSON object:
{{
  "title": "compelling headline",
  "excerpt": "2-3 sentence summary (150 chars max)",
  "content": "Full HTML using <h2>,<h3>,<p>,<ul>,<li>,<strong>,<em>,<blockquote> tags. Min {words} words.",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "seo_title": "SEO title 60 chars max",
  "seo_description": "meta description 155 chars max",
  "cover_image_query": "4-6 word Unsplash search query"
}}"""

        try:
            url, headers, payload = _build_request(model_id, model_cfg, api_key, system_prompt, user_prompt)
            req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=90) as resp:
                rd = json.loads(resp.read().decode())

            text    = _parse_response(provider, rd)
            clean   = _clean_json(text)
            article = json.loads(clean)

            q = article.get("cover_image_query", topic).replace(" ", ",")
            article["cover_image"] = f"https://images.unsplash.com/featured/?{q}&w=1200&q=80"
            article["category"] = category
            article["model_used"] = model_cfg["label"]

            self._json(200, {"success": True, "article": article})

        except urllib.error.HTTPError as e:
            err = e.read().decode()[:300]
            self._json(502, {"success": False, "error": f"{provider} API error {e.code}: {err}"})
        except json.JSONDecodeError as e:
            self._json(500, {"success": False, "error": f"AI returned invalid JSON: {e}"})
        except Exception as e:
            self._json(500, {"success": False, "error": str(e)})

    def log_message(self, *a): pass
