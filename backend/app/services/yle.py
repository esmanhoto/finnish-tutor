"""Yle Teletext (Teksti-TV) reading source.

Yle deprecated its news/programs API years ago; the only public endpoint an
API key still reaches is Teletext. Page 100 is the news index (headlines +
their page numbers); each news page holds one short, plain-Finnish story that
slots straight into the reading pipeline. Everything degrades to None/[] when
no key is configured or the network is unavailable, so the app still works.

Docs: https://developer.yle.fi/en/api  ·  rate limits 10/s, 300/hr, 7200/day.
"""

import re

import httpx

from ..config import settings

BASE_URL = "https://external.api.yle.fi/v1/teletext/pages"
NEWS_INDEX = 100

# A headline row on the index: a 3-digit page number, then the title.
_HEADLINE_RE = re.compile(r"^(\d{3})\s+(.+)$")


def configured() -> bool:
    return bool(settings.yle_app_id and settings.yle_app_key)


def _fetch_page(page: int) -> dict | None:
    if not configured():
        return None
    params = {"app_id": settings.yle_app_id, "app_key": settings.yle_app_key}
    try:
        resp = httpx.get(f"{BASE_URL}/{page}.json", params=params, timeout=10.0)
        resp.raise_for_status()
        return resp.json()
    except (httpx.HTTPError, ValueError):
        return None


def _page_lines(payload: dict) -> list[str]:
    """All non-empty text lines across every subpage of a teletext page."""
    page = payload.get("teletext", {}).get("page", {})
    subpages = page.get("subpage", [])
    if isinstance(subpages, dict):
        subpages = [subpages]
    lines: list[str] = []
    for sp in subpages:
        contents = sp.get("content", [])
        if isinstance(contents, dict):
            contents = [contents]
        for block in contents:
            if block.get("type") != "text":
                continue
            block_lines = block.get("line", [])
            if isinstance(block_lines, dict):
                block_lines = [block_lines]
            for ln in block_lines:
                text = (ln.get("Text") or "").strip()
                if text:
                    lines.append(text)
    return lines


def headlines() -> list[dict]:
    """Today's top stories from the news index: [{'page', 'title'}, ...]."""
    payload = _fetch_page(NEWS_INDEX)
    if payload is None:
        return []
    seen: dict[int, str] = {}
    for line in _page_lines(payload):
        m = _HEADLINE_RE.match(line)
        if not m:
            continue
        page, title = int(m.group(1)), m.group(2).strip()
        # Real stories live on 101–199 and have a mixed-case title. Skip the
        # section-navigation rows (ALL CAPS, or carrying extra page numbers).
        if not (101 <= page <= 199):
            continue
        if re.search(r"\d", title) or title == title.upper():
            continue
        seen.setdefault(page, title)
    return [{"page": p, "title": t} for p, t in seen.items()]


def article(page: int) -> dict | None:
    """Fetch one news page and split it into {'title', 'text'}."""
    payload = _fetch_page(page)
    if payload is None:
        return None
    lines = _page_lines(payload)
    if not lines:
        return None
    # Line 0 is the category/network/weekday banner (e.g. "KOTIMAA  YLE  …");
    # line 1 is the headline; the rest is the body, word-wrapped by teletext.
    body_start = 1
    title = lines[0]
    if "YLE" in lines[0] and len(lines) > 1:
        title = lines[1]
        body_start = 2
    body = " ".join(lines[body_start:])
    body = re.sub(r"\s{2,}", " ", body).strip()
    if not body:
        return None
    return {"title": title, "text": body}
