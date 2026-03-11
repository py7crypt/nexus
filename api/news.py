"""
GET /api/news                 → articles from all enabled sources
GET /api/news?q=TOPIC         → search Google News
GET /api/news?category=X      → category-filtered search
GET /api/news?source_id=ID    → articles from one specific source only
GET /api/news?fetch=URL       → scrape full article (author, images, videos, structured HTML)

Auth: Bearer required.
"""
import sys, os, json, re, urllib.request, urllib.parse
import xml.etree.ElementTree as ET
from html import unescape
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, urljoin
import asyncio

sys.path.insert(0, os.path.dirname(__file__))
from _utils import verify_token, kv_get

try:
    from bs4 import BeautifulSoup, NavigableString, Tag
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

KV_SETTINGS_KEY = "nexus:scrape-settings"

DEFAULTS = {
    "sites": [
        {"id": "google-news", "name": "Google News", "rss_url": "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", "enabled": True,  "category": ""},
        {"id": "bbc-news",    "name": "BBC News",     "rss_url": "http://feeds.bbci.co.uk/news/rss.xml",                  "enabled": True,  "category": ""},
    ],
    "max_per_source":      10,
    "default_category":    "",
    "content_min_chars":   60,
    "auto_excerpt_length": 200,
}

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

CAT_KEYWORDS = {
    "Technology":    ["tech","ai","software","hardware","apple","google","microsoft","meta","nvidia",
                      "robot","startup","app","cyber","internet","chip","smartphone","gadget","openai",
                      "algorithm","data","cloud","5g","electric vehicle","ev","tesla","coding","developer"],
    "Science":       ["science","research","study","nasa","space","climate","physics","biology",
                      "genome","vaccine","asteroid","planet","fossil","experiment","discovery","quantum"],
    "Business":      ["economy","market","stock","finance","trade","gdp","inflation","bank","invest",
                      "merger","acquisition","revenue","profit","ipo","startup","fund","dollar","euro"],
    "Health":        ["health","medical","disease","cancer","covid","drug","hospital","surgery","mental",
                      "nutrition","fitness","obesity","diabetes","fda","who","pandemic","therapy"],
    "Politics":      ["election","government","president","congress","senate","parliament","law","policy",
                      "democrat","republican","minister","vote","political","diplomacy","sanction","war"],
    "Sports":        ["football","soccer","basketball","tennis","golf","nba","nfl","fifa","olympics",
                      "championship","league","match","tournament","player","coach","stadium","score"],
    "Entertainment": ["movie","film","music","celebrity","award","oscar","grammy","netflix","hollywood",
                      "actor","singer","album","concert","tv","show","series","streaming","box office"],
    "Travel":        ["travel","tourism","hotel","flight","airline","destination","resort","visa",
                      "passport","vacation","trip","cruise","airport","tourist"],
    "Culture":       ["culture","art","museum","book","literature","fashion","food","cuisine","history",
                      "religion","tradition","society","education","language","design"],
}

ALL_CATEGORIES = list(CAT_KEYWORDS.keys())

def _run(c):
    loop = asyncio.new_event_loop()
    r    = loop.run_until_complete(c)
    loop.close()
    return r

def _load_settings():
    try:
        raw = _run(kv_get(KV_SETTINGS_KEY))
        if raw:
            cfg = json.loads(raw)
            for k, v in DEFAULTS.items():
                cfg.setdefault(k, v)
            return cfg
    except Exception:
        pass
    return dict(DEFAULTS)

def _get(url, timeout=10):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        final_url = r.url
        content   = r.read(800_000).decode("utf-8", errors="replace")
    return content, final_url

# ── Helpers ───────────────────────────────────────────────────────────────────

def _infer_category(text):
    text_lower = text.lower()
    scores = {cat: sum(1 for kw in kws if kw in text_lower)
              for cat, kws in CAT_KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else ""

def _clean_title(title, source=""):
    for sep in [" | ", " - ", " :: ", " — ", " – "]:
        if source and title.endswith(sep + source):
            title = title[:-(len(sep) + len(source))]
            break
    for suffix in [" - Here's what you need to know", " - report", " - sources", " - study"]:
        if title.lower().endswith(suffix.lower()):
            title = title[:-len(suffix)]
    if title == title.upper() and len(title) > 10:
        title = title.title()
    return title.strip()

def _smart_excerpt(text, max_len=250):
    text = (text or "").strip()
    if not text or len(text) <= max_len:
        return text
    cut = text[:max_len]
    last = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    if last > max_len * 0.6:
        return cut[:last + 1].strip()
    last_space = cut.rfind(" ")
    return (cut[:last_space] + "…") if last_space > 0 else cut

# ── RSS parser ────────────────────────────────────────────────────────────────

def _parse_rss(xml_text, source_name="", default_category="", max_items=10):
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []
    articles = []
    ns    = {"atom": "http://www.w3.org/2005/Atom",
             "dc":   "http://purl.org/dc/elements/1.1/",
             "media":"http://search.yahoo.com/mrss/"}
    items = root.findall(".//item") or root.findall(".//atom:entry", ns)
    for item in items[:max_items]:
        title  = unescape(item.findtext("title","") or item.findtext("atom:title","",ns))
        link   = item.findtext("link","") or item.findtext("atom:link","",ns)
        desc   = unescape(re.sub(r"<[^>]+>","", item.findtext("description","") or item.findtext("atom:summary","",ns)))
        pub    = item.findtext("pubDate","") or item.findtext("atom:published","",ns)
        # dc:creator for author
        author = item.findtext("dc:creator","",ns) or item.findtext("author","") or ""
        src_el = item.find("source")
        source = src_el.text.strip() if src_el is not None else source_name
        # media:thumbnail for image
        thumb_el = item.find("media:thumbnail", ns) or item.find("media:content", ns)
        thumb = thumb_el.get("url","") if thumb_el is not None else ""

        if not link:
            link_el = item.find("atom:link", ns)
            if link_el is not None:
                link = link_el.get("href","")

        rss_cats = [unescape(el.text or "").strip() for el in item.findall("category") if el.text]
        title    = _clean_title(title, source)

        if default_category:
            category = default_category
        elif rss_cats:
            inferred = _infer_category(" ".join(rss_cats))
            category = inferred or rss_cats[0].title()
        else:
            category = _infer_category(title + " " + desc)

        tags = list({t.lower().replace(" ","-") for t in rss_cats[:4] if t})
        if source and source.lower().replace(" ","-") not in tags:
            tags.append(source.lower().replace(" ","-"))

        if title and link:
            articles.append({
                "title":    title,
                "url":      link.strip(),
                "excerpt":  _smart_excerpt(desc, 250),
                "source":   source,
                "author":   author.strip(),
                "thumb":    thumb,
                "pub_date": pub,
                "category": category,
                "tags":     tags,
            })
    return articles

def _fetch_rss(url, source_name="", default_category="", max_items=10):
    html, _ = _get(url)
    return _parse_rss(html, source_name=source_name,
                      default_category=default_category, max_items=max_items)

# ── Article scraper ───────────────────────────────────────────────────────────

def _abs(url, base):
    """Make relative URL absolute."""
    if url and not url.startswith("http"):
        return urljoin(base, url)
    return url

def _scrape_article(url, min_chars=60):
    html, final_url = _get(url, timeout=12)
    url = final_url
    base_url = "{0.scheme}://{0.netloc}".format(urlparse(url))

    if not HAS_BS4:
        # stdlib fallback — plain paragraph extraction
        def _meta(prop):
            m = re.search(rf'<meta[^>]+property=["\']og:{re.escape(prop)}["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
            if not m:
                m = re.search(rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:{re.escape(prop)}["\']', html, re.I)
            return unescape(m.group(1).strip()) if m else ""
        title   = _meta("title")
        excerpt = _meta("description")
        image   = _meta("image")
        site    = _meta("site_name")
        paras   = [unescape(p) for p in re.findall(r"<p[^>]*>([^<]{%d,})</p>" % min_chars, html, re.I)]
        body    = "\n".join(f"<p>{p}</p>" for p in paras[:20])
        body   += f'\n<hr/>\n<p><small>Source: <a href="{url}" target="_blank">{site or url}</a></small></p>'
        return {"title": _clean_title(title,site), "excerpt": _smart_excerpt(excerpt,250),
                "cover_image": image, "site_name": site, "author": "",
                "content_html": body, "source_url": url,
                "category": _infer_category(title+" "+excerpt),
                "tags": [], "parser": "stdlib-regex"}

    soup = BeautifulSoup(html, "html.parser")

    # ── Meta extraction ───────────────────────────────────────────────────────
    def og(prop):
        tag = (soup.find("meta", property=f"og:{prop}") or
               soup.find("meta", attrs={"name": f"og:{prop}"}) or
               soup.find("meta", attrs={"name": f"twitter:{prop}"}))
        return (tag.get("content") or "").strip() if tag else ""

    title   = og("title")  or (soup.find("h1").get_text(strip=True) if soup.find("h1") else "")
    excerpt = og("description")
    image   = og("image")
    site    = og("site_name")

    # ── Author — try multiple patterns ───────────────────────────────────────
    author = ""
    # 1. JSON-LD structured data
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") in ("NewsArticle","Article","BlogPosting"):
                    a = item.get("author") or item.get("creator") or {}
                    if isinstance(a, list): a = a[0]
                    author = a.get("name","") if isinstance(a, dict) else str(a)
                    if author: break
            if author: break
        except Exception:
            pass
    # 2. Common byline patterns
    if not author:
        byline_sel = [
            {"attrs": {"class": re.compile(r"author|byline|writer", re.I)}},
            {"attrs": {"rel":   "author"}},
            {"attrs": {"itemprop": "author"}},
            {"name":  "address"},
        ]
        for sel in byline_sel:
            el = soup.find(**sel) if "name" not in sel else soup.find(sel["name"])
            if el:
                t = el.get_text(strip=True)
                if t and len(t) < 80:
                    # Strip "By " prefix
                    author = re.sub(r"^[Bb]y\s+", "", t).strip()
                    break
    # 3. meta author tag
    if not author:
        m = soup.find("meta", attrs={"name": "author"})
        if m: author = (m.get("content") or "").strip()

    # ── Find best article container ───────────────────────────────────────────
    container = None
    # Try in priority order
    candidates = [
        soup.find("article"),
        soup.find(attrs={"itemprop": "articleBody"}),
        soup.find(class_=re.compile(r"\barticle[-_]?body\b|\bcontent[-_]?body\b|\bstory[-_]?body\b|\bpost[-_]?content\b|\barticle[-_]?content\b", re.I)),
        soup.find(class_=re.compile(r"\barticle\b|\bstory\b|\bpost\b|\bcontent\b", re.I)),
    ]
    for c in candidates:
        if c:
            container = c
            break
    if not container:
        container = soup.body

    # ── Walk container and build rich HTML ────────────────────────────────────
    # Remove noise elements
    NOISE = ["script","style","nav","header","footer","aside","form",
             "button","noscript","iframe[src*='ads']","[class*='ad-']",
             "[class*='promo']","[class*='related']","[class*='recommend']",
             "[class*='newsletter']","[class*='subscribe']","[class*='social-share']",
             "[class*='comments']","[class*='sidebar']","figcaption"]
    if container:
        for tag in container.find_all(["script","style","nav","header","footer",
                                        "aside","form","button","noscript"]):
            tag.decompose()
        for tag in container.find_all(class_=re.compile(
            r"ad-|promo|related|recommend|newsletter|subscribe|social-share|comment|sidebar|breadcrumb", re.I)):
            tag.decompose()

    content_parts = []

    def _process_node(node):
        if isinstance(node, NavigableString):
            return
        tag = node.name
        if not tag:
            return

        # Paragraphs
        if tag == "p":
            text = node.get_text(strip=True)
            if len(text) >= min_chars:
                content_parts.append(f"<p>{text}</p>")

        # Headings — keep h2 and h3
        elif tag in ("h2","h3","h4"):
            text = node.get_text(strip=True)
            if text and len(text) < 200:
                out_tag = "h2" if tag in ("h2","h3") else "h3"
                content_parts.append(f"<{out_tag}>{text}</{out_tag}>")

        # Block quotes
        elif tag == "blockquote":
            text = node.get_text(strip=True)
            if text:
                content_parts.append(f"<blockquote>{text}</blockquote>")

        # Images inside figure or standalone
        elif tag in ("figure","img"):
            img = node if tag == "img" else node.find("img")
            if img:
                src = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or ""
                src = _abs(src, base_url)
                alt = img.get("alt","")
                cap_el = node.find("figcaption") if tag == "figure" else None
                cap = cap_el.get_text(strip=True) if cap_el else ""
                if src and not any(x in src for x in ["pixel","tracking","1x1","spacer","logo","icon","avatar"]):
                    if cap:
                        content_parts.append(f'<figure><img src="{src}" alt="{alt}" style="max-width:100%;border-radius:8px"/><figcaption>{cap}</figcaption></figure>')
                    else:
                        content_parts.append(f'<img src="{src}" alt="{alt}" style="max-width:100%;border-radius:8px;margin:1rem 0"/>')

        # Videos — iframe embeds (YouTube, Vimeo etc.)
        elif tag == "iframe":
            src = node.get("src","")
            if any(x in src for x in ["youtube.com/embed","youtu.be","vimeo.com","player."]):
                content_parts.append(
                    f'<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1rem 0">'
                    f'<iframe src="{src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" '
                    f'allowfullscreen loading="lazy"></iframe></div>'
                )

        # Video element
        elif tag == "video":
            src_el = node.find("source")
            src    = src_el.get("src","") if src_el else node.get("src","")
            if src:
                src = _abs(src, base_url)
                content_parts.append(f'<video controls style="max-width:100%;margin:1rem 0"><source src="{src}"></video>')

        # Lists
        elif tag in ("ul","ol"):
            items = []
            for li in node.find_all("li", recursive=False):
                t = li.get_text(strip=True)
                if t: items.append(f"<li>{t}</li>")
            if items:
                list_html = "\n".join(items)
                content_parts.append(f"<{tag}>{list_html}</{tag}>")

        # Recurse into divs and sections
        elif tag in ("div","section","main"):
            for child in node.children:
                _process_node(child)

    if container:
        for child in container.children:
            _process_node(child)

    # Fallback: plain paragraphs if nothing extracted
    if not content_parts and container:
        for p in container.find_all("p"):
            t = p.get_text(strip=True)
            if len(t) >= min_chars:
                content_parts.append(f"<p>{t}</p>")

    # Build final HTML with source attribution at bottom
    content_html = "\n".join(content_parts)
    content_html += (
        f'\n<hr style="margin:2rem 0;border:none;border-top:1px solid #e2e8f0"/>'
        f'\n<p><small>📰 Originally published at '
        f'<a href="{url}" target="_blank" rel="noopener">{site or urlparse(url).netloc}</a>'
        f'{(" · by " + author) if author else ""}</small></p>'
    )

    # If cover image not found in og:image, use first image from content
    if not image:
        m = re.search(r'<img[^>]+src="([^"]+)"', content_html)
        if m: image = m.group(1)

    smart_exc  = _smart_excerpt(excerpt or " ".join(
        p.get_text(strip=True) for p in (container.find_all("p") if container else [])
    )[:500], 250)
    cat        = _infer_category((title or "") + " " + smart_exc)
    tags       = list({kw for _, kws in CAT_KEYWORDS.items() for kw in kws if kw in (title or "").lower()})[:5]
    if site: tags.append(site.lower().replace(" ","-"))

    return {
        "title":        _clean_title(title or "", site or ""),
        "excerpt":      smart_exc,
        "cover_image":  image,
        "site_name":    site,
        "author":       author,
        "content_html": content_html,
        "source_url":   url,
        "category":     cat,
        "tags":         tags[:6],
        "parser":       "beautifulsoup4",
    }

# ── Handler ───────────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
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

        qs        = parse_qs(urlparse(self.path).query)
        query     = qs.get("q",         [None])[0]
        category  = qs.get("category",  [None])[0]
        fetch_url = qs.get("fetch",     [None])[0]
        source_id = qs.get("source_id", [None])[0]

        try:
            cfg       = _load_settings()
            max_each  = cfg.get("max_per_source", 10)
            min_chars = cfg.get("content_min_chars", 60)

            # ── Mode: scrape full article ───────────────────────────────────
            if fetch_url:
                meta = _scrape_article(urllib.parse.unquote(fetch_url), min_chars=min_chars)
                return self._json(200, {"success": True, "meta": meta})

            # ── Mode: search (q or category) ────────────────────────────────
            if query or (category and category.lower() not in ("all","")):
                q   = query or category
                enc = urllib.parse.quote(q)
                url = f"https://news.google.com/rss/search?q={enc}&hl=en-US&gl=US&ceid=US:en"
                articles = _fetch_rss(url, source_name="Google News",
                                      default_category=category if not query else "",
                                      max_items=max_each * 2)
                return self._json(200, {"success": True, "articles": articles,
                                        "count": len(articles)})

            # ── Mode: single source ─────────────────────────────────────────
            sites = cfg.get("sites", [])
            if source_id:
                site = next((s for s in sites if s["id"] == source_id), None)
                if not site:
                    return self._json(404, {"success": False, "error": "Source not found"})
                arts = _fetch_rss(site["rss_url"], source_name=site["name"],
                                  default_category=site.get("category",""),
                                  max_items=max_each)
                return self._json(200, {"success": True, "articles": arts,
                                        "count": len(arts), "source": site["name"]})

            # ── Mode: all enabled sources ───────────────────────────────────
            all_articles, errors = [], []
            for site in sites:
                if not site.get("enabled", False):
                    continue
                try:
                    arts = _fetch_rss(site["rss_url"],
                                      source_name=site["name"],
                                      default_category=site.get("category",
                                          cfg.get("default_category","")),
                                      max_items=max_each)
                    all_articles.extend(arts)
                except Exception as e:
                    errors.append({"source": site["name"], "error": str(e)})

            def _date_key(a):
                try:
                    from email.utils import parsedate_to_datetime
                    return parsedate_to_datetime(a["pub_date"]).timestamp()
                except Exception:
                    return 0
            all_articles.sort(key=_date_key, reverse=True)

            self._json(200, {"success": True, "articles": all_articles,
                             "count": len(all_articles), "errors": errors})

        except Exception as e:
            self._json(500, {"success": False, "error": str(e)})

    def log_message(self, *a): pass
