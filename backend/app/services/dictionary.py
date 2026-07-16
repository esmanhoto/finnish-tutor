"""Fi→En lookups: bundled Wiktionary dictionary first, user-local LLM
overrides second. The dictionary database is built by
scripts/build_dictionary.py and may be absent — every function degrades
gracefully to None so the app works before the one-time build.
"""

import sqlite3
from functools import lru_cache

from ..config import settings

# Prefer content-word senses when a lemma has several parts of speech.
POS_PRIORITY = ["noun", "verb", "adj", "adv", "name", "num", "pron"]


@lru_cache(maxsize=1)
def _dict_conn() -> sqlite3.Connection | None:
    if not settings.dictionary_db_path.exists():
        return None
    conn = sqlite3.connect(f"file:{settings.dictionary_db_path}?mode=ro", uri=True,
                           check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def available() -> bool:
    return _dict_conn() is not None


def lookup(lemma: str, app_db: sqlite3.Connection | None = None) -> dict | None:
    """Return {'gloss': ..., 'pos': ...} or None."""
    lemma = lemma.strip().lower()
    if not lemma:
        return None

    conn = _dict_conn()
    if conn is not None:
        rows = conn.execute(
            "SELECT pos, gloss FROM entries WHERE lemma = ?", (lemma,)
        ).fetchall()
        if rows:
            best = min(
                rows,
                key=lambda r: POS_PRIORITY.index(r["pos"])
                if r["pos"] in POS_PRIORITY
                else len(POS_PRIORITY),
            )
            return {"gloss": best["gloss"], "pos": best["pos"]}

    if app_db is not None:
        row = app_db.execute(
            "SELECT gloss, pos FROM dict_overrides WHERE lemma = ?", (lemma,)
        ).fetchone()
        if row:
            return {"gloss": row["gloss"], "pos": row["pos"]}
    return None


def save_override(app_db: sqlite3.Connection, lemma: str, gloss: str, pos: str | None) -> None:
    app_db.execute(
        "INSERT OR REPLACE INTO dict_overrides (lemma, gloss, pos) VALUES (?, ?, ?)",
        (lemma.strip().lower(), gloss, pos),
    )
