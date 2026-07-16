"""Build the local Fi→En dictionary from the kaikki.org Wiktionary extract.

One-time setup (data is CC BY-SA, credited in NOTICE, and never committed):

    uv run python scripts/build_dictionary.py            # downloads + builds
    uv run python scripts/build_dictionary.py --skip-download   # reuse raw file

Produces data/dictionary/dictionary.sqlite with one row per (lemma, pos):
short English gloss list, ready for instant lookups.
"""

import argparse
import json
import re
import sqlite3
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import DATA_DIR, settings  # noqa: E402

RAW_URL = "https://kaikki.org/dictionary/Finnish/kaikki.org-dictionary-Finnish.jsonl"
RAW_PATH = DATA_DIR / "raw" / "kaikki-finnish.jsonl"

MAX_GLOSSES_PER_SENSE = 1
MAX_SENSES = 3

_INFLECTION_GLOSS = re.compile(
    r"^(inflection of|(\w+[ /-])*(singular|plural|form|participle|infinitive) of )",
    re.IGNORECASE,
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS entries (
    lemma TEXT NOT NULL,
    pos TEXT NOT NULL,
    gloss TEXT NOT NULL,
    PRIMARY KEY (lemma, pos)
);
CREATE INDEX IF NOT EXISTS idx_entries_lemma ON entries (lemma);
"""


def download() -> None:
    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {RAW_URL} (several GB, resumable)…")
    subprocess.run(
        ["curl", "-sS", "-C", "-", "-o", str(RAW_PATH), RAW_URL],
        check=True,
    )


def build() -> None:
    out_path = settings.dictionary_db_path
    out_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(out_path)
    conn.executescript(SCHEMA)

    total = kept = 0
    batch: list[tuple[str, str, str]] = []
    with RAW_PATH.open(encoding="utf-8") as f:
        for line in f:
            total += 1
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            word = entry.get("word")
            pos = entry.get("pos") or ""
            senses = entry.get("senses") or []
            if not word or not senses:
                continue
            glosses: list[str] = []
            for sense in senses[: MAX_SENSES * 2]:
                for g in (sense.get("glosses") or [])[:MAX_GLOSSES_PER_SENSE]:
                    # Skip pure cross-reference glosses ("inflection of X",
                    # "ablative singular of Y", …) — they'd shadow real senses.
                    if _INFLECTION_GLOSS.match(g):
                        continue
                    if g not in glosses:
                        glosses.append(g)
                if len(glosses) >= MAX_SENSES:
                    break
            if not glosses:
                continue
            batch.append((word, pos, "; ".join(glosses)))
            kept += 1
            if len(batch) >= 50_000:
                conn.executemany(
                    "INSERT OR IGNORE INTO entries (lemma, pos, gloss) VALUES (?, ?, ?)",
                    batch,
                )
                conn.commit()
                batch.clear()
                print(f"  …{total:,} lines read, {kept:,} entries kept")
    if batch:
        conn.executemany(
            "INSERT OR IGNORE INTO entries (lemma, pos, gloss) VALUES (?, ?, ?)", batch
        )
    conn.commit()
    n = conn.execute("SELECT COUNT(*) FROM entries").fetchone()[0]
    conn.close()
    print(f"Done: {n:,} (lemma, pos) entries → {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-download", action="store_true")
    args = parser.parse_args()
    if not args.skip_download and not RAW_PATH.exists():
        download()
    if not RAW_PATH.exists():
        raise SystemExit(f"Raw file missing: {RAW_PATH}")
    build()


if __name__ == "__main__":
    main()
