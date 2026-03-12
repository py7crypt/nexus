"""
GET /api/news                 -> articles from all enabled sources
GET /api/news?q=TOPIC         -> keyword search across all enabled sources
GET /api/news?category=X      -> category filter
GET /api/news?source_id=ID    -> single source
GET /api/news?fetch=URL       -> scrape full article (links, images, videos, author)
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
    from bs4 import BeautifulSoup, NavigableString
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

KV_SETTINGS_KEY = "nexus:scrape-settings"

DEFAULTS = {
    "sites": [
        {"id": "bbc-news",      "name": "BBC News",          "rss_url": "https://feeds.bbci.co.uk/news/rss.xml",                                          "enabled": True,  "category": ""},
        {"id": "reuters",       "name": "Reuters",           "rss_url": "https://feeds.reuters.com/reuters/topNews",                                       "enabled": True,  "category": ""},
        {"id": "ap-news",       "name": "AP News",           "rss_url": "https://feeds.apnews.com/apnews/topnews",                                         "enabled": True,  "category": ""},
        {"id": "aljazeera",     "name": "Al Jazeera",        "rss_url": "https://www.aljazeera.com/xml/rss/all.xml",                                       "enabled": True,  "category": ""},
        {"id": "the-guardian",  "name": "The Guardian",      "rss_url": "https://www.theguardian.com/world/rss",                                           "enabled": True,  "category": ""},
        {"id": "techcrunch",    "name": "TechCrunch",        "rss_url": "https://techcrunch.com/feed/",                                                    "enabled": True,  "category": "Technology"},
        {"id": "the-verge",     "name": "The Verge",         "rss_url": "https://www.theverge.com/rss/index.xml",                                          "enabled": True,  "category": "Technology"},
        {"id": "wired",         "name": "Wired",             "rss_url": "https://www.wired.com/feed/rss",                                                  "enabled": False, "category": "Technology"},
        {"id": "ars-technica",  "name": "Ars Technica",      "rss_url": "https://feeds.arstechnica.com/arstechnica/index",                                 "enabled": False, "category": "Technology"},
        {"id": "nasa",          "name": "NASA",              "rss_url": "https://www.nasa.gov/rss/dyn/breaking_news.rss",                                  "enabled": False, "category": "Science"},
        {"id": "sci-american",  "name": "Scientific American","rss_url": "https://www.scientificamerican.com/platform/morgue/rss/sciam-news-feed.xml",     "enabled": False, "category": "Science"},
        {"id": "nature",        "name": "Nature",            "rss_url": "https://www.nature.com/nature.rss",                                               "enabled": False, "category": "Science"},
        {"id": "bbc-business",  "name": "BBC Business",      "rss_url": "https://feeds.bbci.co.uk/news/business/rss.xml",                                  "enabled": False, "category": "Business"},
        {"id": "bbc-sport",     "name": "BBC Sport",         "rss_url": "https://feeds.bbci.co.uk/sport/rss.xml",                                          "enabled": False, "category": "Sports"},
        {"id": "espn",          "name": "ESPN",              "rss_url": "https://www.espn.com/espn/rss/news",                                              "enabled": False, "category": "Sports"},
        {"id": "variety",       "name": "Variety",           "rss_url": "https://variety.com/feed/",                                                       "enabled": False, "category": "Entertainment"},
        {"id": "bbc-health",    "name": "BBC Health",        "rss_url": "https://feeds.bbci.co.uk/news/health/rss.xml",                                    "enabled": False, "category": "Health"},
        {"id": "who",           "name": "WHO News",          "rss_url": "https://www.who.int/rss-feeds/news-english.xml",                                  "enabled": False, "category": "Health"},
    ],
    "max_per_source":      15,
    "default_category":    "",
    "content_min_chars":   60,
    "auto_excerpt_length": 200,
}

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

CAT_KEYWORDS = {
    "Technology":    ["tech","ai","software","hardware","apple","google","microsoft","meta","nvidia","robot","startup","app","cyber","internet","chip","smartphone","gadget","openai","algorithm","data","cloud","5g","electric vehicle","ev","tesla","coding","developer","iphone","android","samsung","tiktok","instagram","facebook"],
    "Science":       ["science","research","study","nasa","space","climate","physics","biology","genome","vaccine","asteroid","planet","fossil","experiment","discovery","quantum","ocean","atmosphere","species","evolution","astronomy","chemistry"],
    "Business":      ["economy","market","stock","finance","trade","gdp","inflation","bank","invest","merger","acquisition","revenue","profit","ipo","startup","fund","dollar","euro","recession","interest rate","federal reserve","wall street","nasdaq"],
    "Health":        ["health","medical","disease","cancer","covid","drug","hospital","surgery","mental","nutrition","fitness","obesity","diabetes","fda","who","pandemic","therapy","vaccine","treatment","clinical","pharmaceutical","wellbeing"],
    "Politics":      ["election","government","president","congress","senate","parliament","law","policy","democrat","republican","minister","vote","political","diplomacy","sanction","war","trump","biden","nato","united nations","white house","kremlin","eu","european"],
    "Sports":        ["football","soccer","basketball","tennis","golf","nba","nfl","fifa","olympics","championship","league","match","tournament","player","coach","stadium","score","formula 1","f1","cricket","rugby","swimming","athletics","boxing","mma"],
    "Entertainment": ["movie","film","music","celebrity","award","oscar","grammy","netflix","hollywood","actor","singer","album","concert","tv","show","series","streaming","box office","spotify","disney","hbo","marvel","gaming","video game"],
    "Travel":        ["travel","tourism","hotel","flight","airline","destination","resort","visa","passport","vacation","trip","cruise","airport","tourist","airbnb"],
    "Culture":       ["culture","art","museum","book","literature","fashion","food","cuisine","history","religion","tradition","society","education","language","design","architecture"],
}

def _run(c):
    loop = asyncio.new_event_loop()
    r = loop.run_until_complete(c)
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

def _get(url, timeout=12):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        final_url = r.url
        content   = r.read(800_000).decode("utf-8", errors="replace")
    return content, final_url

def _infer_category(text):
    text_lower = text.lower()
    scores = {cat: sum(1 for kw in kws if kw in text_lower) for cat, kws in CAT_KEYWORDS.items()}
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
    return (cut[:last_space] + "...") if last_space > 0 else cut

def _matches_query(article, q):
    if not q:
        return True
    q_lower = q.lower()
    text = (article.get("title","") + " " + article.get("excerpt","")).lower()
    return all(word in text for word in q_lower.split())

# ── RSS parser ─────────────────────────────────────────────────────────────────

def _parse_rss(xml_text, source_name="", default_category="", max_items=15):
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    ns = {
        "atom":    "http://www.w3.org/2005/Atom",
        "dc":      "http://purl.org/dc/elements/1.1/",
        "media":   "http://search.yahoo.com/mrss/",
        "content": "http://purl.org/rss/1.0/modules/content/",
    }
    items    = root.findall(".//item") or root.findall(".//atom:entry", ns)
    articles = []

    for item in items[:max_items]:
        title  = unescape(item.findtext("title","") or item.findtext("atom:title","",ns))
        link   = item.findtext("link","") or ""
        desc   = item.findtext("description","") or item.findtext("atom:summary","",ns) or ""
        desc   = unescape(re.sub(r"<[^>]+>", "", desc))
        pub    = item.findtext("pubDate","") or item.findtext("atom:published","",ns) or ""
        author = (item.findtext("dc:creator","",ns) or
                  item.findtext("author","") or
                  item.findtext("atom:author/atom:name","",ns) or "")
        src_el = item.find("source")
        source = src_el.text.strip() if src_el is not None and src_el.text else source_name

        if not link:
            link_el = item.find("atom:link", ns)
            if link_el is not None:
                link = link_el.get("href","")

        # Thumbnail
        thumb = ""
        for mt in ["media:thumbnail", "media:content"]:
            el = item.find(mt, ns)
            if el is not None:
                thumb = el.get("url","")
                if thumb: break
        if not thumb:
            enc = item.find("enclosure")
            if enc is not None and "image" in (enc.get("type","") or ""):
                thumb = enc.get("url","")

        rss_cats = [unescape(el.text or "").strip() for el in item.findall("category") if el.text]
        title    = _clean_title(title, source)
        if not title or not link:
            continue

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

def _fetch_rss(url, source_name="", default_category="", max_items=15):
    html, _ = _get(url)
    return _parse_rss(html, source_name=source_name,
                      default_category=default_category, max_items=max_items)

# ── Full article scraper ───────────────────────────────────────────────────────

def _abs_url(url, base):
    """Make a relative URL absolute."""
    if url and not url.startswith("http"):
        return urljoin(base, url)
    return url

SKIP_IMG_PATTERNS = {"pixel","tracking","1x1","spacer","logo","icon","avatar","placeholder","blank",".svg","data:"}

def _scrape_article(url, min_chars=60):
    html, final_url = _get(url, timeout=15)
    url      = final_url
    base_url = "{0.scheme}://{0.netloc}".format(urlparse(url))

    # ── stdlib fallback (no BeautifulSoup) ────────────────────────────────────
    if not HAS_BS4:
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
        body    = "\n".join("<p>" + p + "</p>" for p in paras[:20])
        body   += '\n<hr/>\n<p><small>Source: <a href="' + url + '" target="_blank">' + (site or url) + '</a></small></p>'
        return {"title": _clean_title(title, site), "excerpt": _smart_excerpt(excerpt, 250),
                "cover_image": image, "site_name": site, "author": "",
                "content_html": body, "source_url": url,
                "category": _infer_category(title + " " + excerpt),
                "tags": [], "parser": "stdlib-regex"}

    soup = BeautifulSoup(html, "html.parser")

    # ── OG / Twitter meta ──────────────────────────────────────────────────────
    def og(prop):
        tag = (soup.find("meta", property="og:" + prop) or
               soup.find("meta", attrs={"name": "og:" + prop}) or
               soup.find("meta", attrs={"name": "twitter:" + prop}))
        return (tag.get("content") or "").strip() if tag else ""

    title   = og("title") or (soup.find("h1").get_text(strip=True) if soup.find("h1") else "")
    excerpt = og("description")
    image   = og("image")
    site    = og("site_name")

    # ── Author — 3 strategies ──────────────────────────────────────────────────
    author = ""
    # 1. JSON-LD structured data (most reliable — BBC, Guardian, Reuters all use this)
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data  = json.loads(script.string or "")
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") in ("NewsArticle","Article","BlogPosting","ReportageNewsArticle"):
                    a = item.get("author") or item.get("creator") or {}
                    if isinstance(a, list): a = a[0]
                    author = a.get("name","") if isinstance(a, dict) else str(a)
                    if author: break
            if author: break
        except Exception:
            pass
    # 2. Byline CSS patterns
    if not author:
        for attrs in [
            {"class": re.compile(r"\bauthor\b|\bbyline\b|\bwriter\b|\bcontributor\b", re.I)},
            {"rel":       "author"},
            {"itemprop":  "author"},
        ]:
            el = soup.find(attrs=attrs)
            if el:
                t = re.sub(r"^[Bb]y[\s:]+", "", el.get_text(strip=True))
                if t and 2 < len(t) < 80:
                    author = t.strip()
                    break
    # 3. <meta name="author">
    if not author:
        m = soup.find("meta", attrs={"name": "author"})
        if m: author = (m.get("content") or "").strip()

    # ── Find best article container ────────────────────────────────────────────
    container = None
    for cand in [
        soup.find("article"),
        soup.find(attrs={"itemprop": "articleBody"}),
        soup.find(class_=re.compile(r"\barticle[-_]?body\b|\bcontent[-_]?body\b|\bstory[-_]?body\b|\bpost[-_]?content\b", re.I)),
        soup.find(class_=re.compile(r"\barticle\b|\bstory\b|\bpost\b|\bcontent\b", re.I)),
        soup.body,
    ]:
        if cand:
            container = cand
            break

    # Remove noise
    if container:
        for tag in container.find_all(["script","style","nav","header","footer","aside","form","button","noscript"]):
            tag.decompose()
        for tag in container.find_all(class_=re.compile(
            r"ad-|promo|related|recommend|newsletter|subscribe|social-share|comment|sidebar|breadcrumb|cookie|popup|share-bar|tag-list", re.I)):
            tag.decompose()

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _good_img(img_tag):
        """Return absolute src if image is worth keeping, else ''."""
        src = (img_tag.get("src") or img_tag.get("data-src") or
               img_tag.get("data-lazy-src") or img_tag.get("data-original") or
               img_tag.get("data-lazy") or "")
        src = _abs_url(src, base_url)
        if not src or not src.startswith("http"):
            return ""
        if any(p in src.lower() for p in SKIP_IMG_PATTERNS):
            return ""
        # Skip tiny images (common for tracking)
        w = img_tag.get("width","")
        h = img_tag.get("height","")
        try:
            if int(w) < 50 or int(h) < 50:
                return ""
        except Exception:
            pass
        return src

    def _render_img(img_tag, caption=""):
        src = _good_img(img_tag)
        if not src:
            return ""
        alt = (img_tag.get("alt","") or "").replace('"', '&quot;')
        img_html = '<img src="{}" alt="{}" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:.75rem 0"/>'.format(src, alt)
        if caption:
            return '<figure style="margin:1.5rem 0">{}<figcaption style="font-size:.85em;color:#64748b;margin-top:.35rem;font-style:italic">{}</figcaption></figure>'.format(img_html, caption)
        return img_html

    def _inner_html(node):
        """
        Serialize inner content of a node preserving:
        <a> links, <strong>/<b>, <em>/<i>, <img>
        Everything else becomes plain text.
        """
        parts = []
        for child in node.children:
            if isinstance(child, NavigableString):
                parts.append(str(child))
            elif child.name == "a":
                href = _abs_url(child.get("href",""), base_url)
                text = child.get_text()
                if href and text.strip():
                    parts.append('<a href="{}" target="_blank" rel="noopener">{}</a>'.format(href, text))
                else:
                    parts.append(child.get_text())
            elif child.name in ("strong","b"):
                inner = child.get_text()
                parts.append("<strong>{}</strong>".format(inner))
            elif child.name in ("em","i"):
                inner = child.get_text()
                parts.append("<em>{}</em>".format(inner))
            elif child.name == "span":
                parts.append(_inner_html(child))
            elif child.name == "br":
                parts.append("<br/>")
            elif child.name == "img":
                ih = _render_img(child)
                if ih: parts.append(ih)
            else:
                parts.append(child.get_text())
        return "".join(parts).strip()

    # ── DOM walk — build rich content ─────────────────────────────────────────
    content_parts = []

    def _walk(node):
        if not hasattr(node, "name") or not node.name:
            return
        tag = node.name

        if tag == "p":
            # Preserve links and inline formatting inside paragraphs
            inner = _inner_html(node)
            plain = node.get_text(strip=True)
            if len(plain) >= min_chars:
                content_parts.append("<p>{}</p>".format(inner))

        elif tag in ("h2","h3","h4","h5"):
            text = node.get_text(strip=True)
            if text and len(text) < 200:
                ht = "h2" if tag in ("h2","h3") else "h3"
                content_parts.append("<{}>{}</{}>".format(ht, text, ht))

        elif tag == "blockquote":
            inner = _inner_html(node)
            if inner:
                content_parts.append("<blockquote>{}</blockquote>".format(inner))

        elif tag == "figure":
            img = node.find("img")
            if img:
                cap_el  = node.find("figcaption")
                caption = cap_el.get_text(strip=True) if cap_el else ""
                ih      = _render_img(img, caption)
                if ih: content_parts.append(ih)

        elif tag == "img":
            ih = _render_img(node)
            if ih: content_parts.append(ih)

        elif tag == "iframe":
            src = node.get("src","")
            if src and any(x in src for x in ["youtube.com/embed","youtu.be","vimeo.com/video","player."]):
                content_parts.append(
                    '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1.5rem 0">'
                    '<iframe src="{}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" '
                    'allowfullscreen loading="lazy"></iframe></div>'.format(src))

        elif tag == "video":
            src_el = node.find("source")
            src    = src_el.get("src","") if src_el else node.get("src","")
            if src:
                src = _abs_url(src, base_url)
                content_parts.append(
                    '<video controls style="max-width:100%;margin:1rem 0"><source src="{}"></video>'.format(src))

        elif tag in ("ul","ol"):
            items = []
            for li in node.find_all("li", recursive=False):
                inner = _inner_html(li)
                plain = li.get_text(strip=True)
                if plain:
                    items.append("<li>{}</li>".format(inner or plain))
            if items:
                content_parts.append("<{tag}>{items}</{tag}>".format(tag=tag, items="".join(items)))

        elif tag in ("div","section","main"):
            for child in node.children:
                _walk(child)

    if container:
        for child in container.children:
            _walk(child)

    # Fallback — plain paragraphs if nothing extracted
    if not content_parts and container:
        for p in container.find_all("p"):
            t = p.get_text(strip=True)
            if len(t) >= min_chars:
                content_parts.append("<p>{}</p>".format(t))

    # Source attribution at very bottom
    domain       = urlparse(url).netloc
    author_html  = ' &middot; by <strong>{}</strong>'.format(author) if author else ""
    content_html = "\n".join(content_parts)
    content_html += (
        '\n<hr style="margin:2rem 0;border:none;border-top:1px solid #e2e8f0"/>'
        '\n<p style="font-size:.85em;color:#64748b">Originally published at '
        '<a href="{url}" target="_blank" rel="noopener">{site}</a>{author}</p>'.format(
            url=url, site=site or domain, author=author_html)
    )

    # Cover image fallback — grab first real image from content
    if not image:
        m = re.search(r'<img[^>]+src="(https?://[^"]+)"', content_html)
        if m: image = m.group(1)

    smart_exc = _smart_excerpt(excerpt, 250)
    cat  = _infer_category((title or "") + " " + smart_exc)
    tags = list({kw for _, kws in CAT_KEYWORDS.items() for kw in kws if kw in (title or "").lower()})[:5]
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

# ── HTTP handler ───────────────────────────────────────────────────────────────

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
            max_each  = cfg.get("max_per_source", 15)
            min_chars = cfg.get("content_min_chars", 60)
            sites     = cfg.get("sites", [])

            # Scrape full article
            if fetch_url:
                meta = _scrape_article(urllib.parse.unquote(fetch_url), min_chars=min_chars)
                return self._json(200, {"success": True, "meta": meta})

            # Single source
            if source_id:
                site = next((s for s in sites if s["id"] == source_id), None)
                if not site:
                    return self._json(404, {"success": False, "error": "Source not found"})
                arts = _fetch_rss(site["rss_url"], source_name=site["name"],
                                  default_category=site.get("category",""), max_items=max_each)
                return self._json(200, {"success": True, "articles": arts,
                                        "count": len(arts), "source": site["name"]})

            # All enabled sources + optional keyword/category filter
            all_articles, errors = [], []
            for site in sites:
                if not site.get("enabled", False):
                    continue
                try:
                    arts = _fetch_rss(site["rss_url"],
                                      source_name=site["name"],
                                      default_category=site.get("category", cfg.get("default_category","")),
                                      max_items=max_each)
                    all_articles.extend(arts)
                except Exception as e:
                    errors.append({"source": site["name"], "error": str(e)})

            if query:
                all_articles = [a for a in all_articles if _matches_query(a, query)]
            if category and category.lower() not in ("all",""):
                all_articles = [a for a in all_articles if a.get("category","").lower() == category.lower()]

            # Sort by date newest first
            def _date_key(a):
                try:
                    from email.utils import parsedate_to_datetime
                    return parsedate_to_datetime(a["pub_date"]).timestamp()
                except Exception:
                    return 0
            all_articles.sort(key=_date_key, reverse=True)

            # Deduplicate by title
            seen, unique = set(), []
            for a in all_articles:
                key = a["title"].lower()[:60]
                if key not in seen:
                    seen.add(key)
                    unique.append(a)

            self._json(200, {"success": True, "articles": unique,
                             "count": len(unique), "errors": errors})

        except Exception as e:
            self._json(500, {"success": False, "error": str(e)})

    def log_message(self, *a): pass