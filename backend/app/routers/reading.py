import json
import sqlite3
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import get_db
from ..services import dictionary, llm, reading, srs, yle

router = APIRouter(prefix="/reading", tags=["reading"])

SAMPLE_PATH = Path(__file__).resolve().parent.parent / "seed" / "sample_article.json"

GLOSS_SCHEMA = {
    "type": "object",
    "properties": {
        "en": {"type": "string"},
        "pos": {"type": "string"},
    },
    "required": ["en", "pos"],
}


class ImportRequest(BaseModel):
    title: str
    text: str
    url: str | None = None
    source: str | None = None


class AddToReviewRequest(BaseModel):
    fi: str
    en: str
    context: str | None = None


def _article_row(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"],
        "title": r["title"],
        "source": r["source"],
        "url": r["url"],
        "published": r["published"],
        **json.loads(r["derived"]),
    }


@router.get("/current")
def current(db: sqlite3.Connection = Depends(get_db)) -> dict | None:
    row = db.execute("SELECT * FROM articles ORDER BY id DESC LIMIT 1").fetchone()
    return _article_row(row) if row else None


def _import_article(req: ImportRequest, db: sqlite3.Connection) -> dict:
    if not req.text.strip() or not req.title.strip():
        raise HTTPException(422, "Title and text are required")
    derived = reading.derive(req.title.strip(), req.text.strip(), db)
    cur = db.execute(
        "INSERT INTO articles (url, source, title, derived) VALUES (?, ?, ?, ?)",
        (req.url, req.source or "Pasted text", req.title.strip(), json.dumps(derived)),
    )
    db.execute("INSERT INTO activity_log (kind, seconds) VALUES ('reading', 180)")
    row = db.execute("SELECT * FROM articles WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _article_row(row)


@router.post("/import")
def import_article(req: ImportRequest, db: sqlite3.Connection = Depends(get_db)) -> dict:
    return _import_article(req, db)


@router.post("/sample")
def import_sample(db: sqlite3.Connection = Depends(get_db)) -> dict:
    sample = json.loads(SAMPLE_PATH.read_text())
    return _import_article(
        ImportRequest(
            title=sample["title"],
            text=sample["text"],
            url=sample["url"],
            source=sample["source"],
        ),
        db,
    )


@router.get("/yle/headlines")
def yle_headlines() -> dict:
    """Today's Yle Teletext news headlines, each with its page number."""
    if not yle.configured():
        raise HTTPException(503, "No Yle API key configured")
    return {"headlines": yle.headlines()}


@router.post("/yle/{page}")
def import_yle(page: int, db: sqlite3.Connection = Depends(get_db)) -> dict:
    """Fetch a Yle Teletext news page and import it as a reading article."""
    if not yle.configured():
        raise HTTPException(503, "No Yle API key configured")
    art = yle.article(page)
    if art is None:
        raise HTTPException(502, "Could not fetch that Yle Teletext page")
    return _import_article(
        ImportRequest(
            title=art["title"],
            text=art["text"],
            url=f"https://yle.fi/tekstitv/txt/{page}.html",
            source="Yle Teksti-TV",
        ),
        db,
    )


@router.get("/lookup")
def lookup(word: str, db: sqlite3.Connection = Depends(get_db)) -> dict:
    lemma = reading.lemmatize(word) or word.strip().lower()
    hit = dictionary.lookup(lemma, db)
    if hit:
        return {"base": lemma, "en": hit["gloss"], "note": hit["pos"] or None, "llm": False}
    # Fallback: ask the local LLM once, then cache as an override.
    try:
        result = llm.structured(
            [
                {
                    "role": "user",
                    "content": (
                        f"Give a short English translation for the Finnish word "
                        f"'{lemma}' (as seen in the form '{word}'). "
                        "pos = part of speech (noun/verb/adj/adv/other)."
                    ),
                }
            ],
            GLOSS_SCHEMA,
        )
    except Exception:
        raise HTTPException(503, "Word not in dictionary and the local LLM is unavailable")
    dictionary.save_override(db, lemma, result["en"], result.get("pos"))
    return {"base": lemma, "en": result["en"], "note": result.get("pos"), "llm": True}


@router.post("/add-to-review")
def add_to_review(req: AddToReviewRequest, db: sqlite3.Connection = Depends(get_db)) -> dict:
    card_id = srs.create_card(
        db,
        front=req.fi,
        back=req.en,
        rule=None,
        example=req.context,
        source="reading",
    )
    return {"created": card_id is not None}
