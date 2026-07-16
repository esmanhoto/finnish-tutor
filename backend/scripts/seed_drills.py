"""Seed the drill bank. Every item's answer is verified with Voikko before
insertion — anything the analyzer rejects is reported and skipped, so the
database only ever contains analyzer-approved answers.

Usage: uv run python scripts/seed_drills.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import _connect, init_db  # noqa: E402
from app.config import settings  # noqa: E402
from app.services.morphology import verify_item  # noqa: E402

SEED_PATH = Path(__file__).resolve().parent.parent / "app" / "seed" / "drill_seed.json"


def main() -> int:
    init_db()
    seed = json.loads(SEED_PATH.read_text())
    conn = _connect(settings.db_path)
    inserted = skipped = rejected = 0
    try:
        for item in seed["items"]:
            if not verify_item(item["base"], item["answer"], item["expect"]):
                print(
                    f"REJECTED by Voikko: {item['category']} {item['base']} -> "
                    f"{item['answer']} {item['expect']}"
                )
                rejected += 1
                continue
            cur = conn.execute(
                """
                INSERT INTO drill_items
                    (category, base, gloss, target, target_fi, answer, hint,
                     rule, example, features)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (category, base, target) DO NOTHING
                """,
                (
                    item["category"],
                    item["base"],
                    item["gloss"],
                    item["target"],
                    item["target_fi"],
                    item["answer"],
                    item.get("hint"),
                    item["rule"],
                    item["example"],
                    json.dumps(item["expect"]),
                ),
            )
            if cur.rowcount:
                inserted += 1
            else:
                skipped += 1
        conn.commit()
    finally:
        conn.close()
    print(f"inserted={inserted} already-present={skipped} rejected={rejected}")
    return 1 if rejected else 0


if __name__ == "__main__":
    raise SystemExit(main())
