"""
/api/ai-generate.py — POST: Generate article via Anthropic API
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
from pydantic import BaseModel
from _utils import verify_token

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class AIRequest(BaseModel):
    topic: str
    category: str = "Technology"
    tone: str = "professional"
    length: str = "medium"
    keywords: List[str] = []
    language: str = "English"


@app.post("/api/ai-generate")
async def ai_generate(data: AIRequest, authorization: Optional[str]=Header(None)):
    if not verify_token(authorization or ""):
        return JSONResponse({"success": False, "error": "Unauthorized"}, status_code=401)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return JSONResponse({
            "success": False,
            "error": "ANTHROPIC_API_KEY not set. Add it in Vercel → Settings → Environment Variables."
        }, status_code=500)

    word_count = {"short": 400, "medium": 800, "long": 1500}.get(data.length, 800)
    kw_str = f"Include these keywords naturally: {', '.join(data.keywords)}" if data.keywords else ""

    system_prompt = (
        f"You are a senior journalist for NEXUS digital media. "
        f"Write with a {data.tone} tone. Language: {data.language}. "
        f"Return ONLY valid JSON — no markdown, no preamble."
    )

    user_prompt = f"""Write a complete {word_count}-word article about: "{data.topic}"
Category: {data.category}
{kw_str}

Return ONLY this JSON object:
{{
  "title": "Compelling headline",
  "excerpt": "2-3 sentence summary (150 chars max)",
  "content": "Full HTML using <h2>,<h3>,<p>,<ul>,<li>,<strong>,<em>,<blockquote> tags. Min {word_count} words.",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "seo_title": "SEO title (60 chars max)",
  "seo_description": "Meta description (155 chars max)",
  "cover_image_query": "4-6 word Unsplash search query"
}}"""

    import urllib.request, urllib.error
    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}]
    }).encode()

    try:
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            rd = json.loads(resp.read().decode())

        text = rd["content"][0]["text"].strip()
        # Strip markdown fences if present
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip().rstrip("`").strip()

        article = json.loads(text)
        query = article.get("cover_image_query", data.topic).replace(" ", ",")
        article["cover_image"] = f"https://images.unsplash.com/featured/?{query}&w=1200&q=80"
        article["category"] = data.category

        return {"success": True, "article": article}

    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        return JSONResponse({"success": False, "error": f"Anthropic API error {e.code}: {body}"}, status_code=502)
    except json.JSONDecodeError as e:
        return JSONResponse({"success": False, "error": f"AI returned invalid JSON: {e}"}, status_code=500)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
