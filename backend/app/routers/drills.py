import json
import random
import sqlite3

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import get_db
from ..services import morphology, srs

router = APIRouter(prefix="/drills", tags=["drills"])

# Mastery = recency-weighted accuracy over the last attempts per category.
MASTERY_WINDOW = 20
SESSION_SIZE = 12


class CheckRequest(BaseModel):
    item_id: int
    answer: str


@router.get("/categories")
def categories(db: sqlite3.Connection = Depends(get_db)) -> list[dict]:
    rows = db.execute(
        """
        SELECT i.category,
               COUNT(DISTINCT i.id) AS items,
               (SELECT COUNT(*) FROM drill_attempts a
                 JOIN drill_items d ON d.id = a.item_id
                WHERE d.category = i.category AND a.correct = 1
                  AND a.id IN (SELECT a2.id FROM drill_attempts a2
                                 JOIN drill_items d2 ON d2.id = a2.item_id
                                WHERE d2.category = i.category
                                ORDER BY a2.id DESC LIMIT ?)) AS recent_correct,
               (SELECT COUNT(*) FROM drill_attempts a
                 JOIN drill_items d ON d.id = a.item_id
                WHERE d.category = i.category
                  AND a.id IN (SELECT a2.id FROM drill_attempts a2
                                 JOIN drill_items d2 ON d2.id = a2.item_id
                                WHERE d2.category = i.category
                                ORDER BY a2.id DESC LIMIT ?)) AS recent_total
        FROM drill_items i
        GROUP BY i.category
        """,
        (MASTERY_WINDOW, MASTERY_WINDOW),
    ).fetchall()
    stats = {r["category"]: r for r in rows}

    seed_meta = _seed_categories()
    out = []
    for meta in seed_meta:
        r = stats.get(meta["key"])
        mastery = 0.0
        if r and r["recent_total"]:
            mastery = r["recent_correct"] / r["recent_total"]
        out.append({**meta, "mastery": round(mastery, 2), "items": r["items"] if r else 0})
    return out


def _seed_categories() -> list[dict]:
    from pathlib import Path

    seed = json.loads(
        (Path(__file__).resolve().parent.parent / "seed" / "drill_seed.json").read_text()
    )
    return seed["categories"]


@router.get("/session")
def session(category: str, db: sqlite3.Connection = Depends(get_db)) -> dict:
    rows = db.execute(
        "SELECT id, category, base, gloss, target, target_fi, hint FROM drill_items WHERE category = ?",
        (category,),
    ).fetchall()
    if not rows:
        raise HTTPException(404, f"No drill items for category '{category}'. Run scripts/seed_drills.py.")
    items = [dict(r) for r in rows]
    random.shuffle(items)
    # Repeat items if the bank is smaller than a session.
    while len(items) < SESSION_SIZE:
        items.append(random.choice(items).copy())
    return {"category": category, "items": items[:SESSION_SIZE]}


@router.post("/check")
def check(req: CheckRequest, db: sqlite3.Connection = Depends(get_db)) -> dict:
    row = db.execute("SELECT * FROM drill_items WHERE id = ?", (req.item_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Unknown drill item")

    features = json.loads(row["features"])
    correct = morphology.matches(req.answer, row["base"], features)

    db.execute(
        "INSERT INTO drill_attempts (item_id, given, correct) VALUES (?, ?, ?)",
        (req.item_id, req.answer.strip(), int(correct)),
    )
    db.execute("INSERT INTO activity_log (kind, seconds) VALUES ('drill', 15)")

    card_created = False
    if not correct:
        # The mistake becomes a spaced-repetition card (error-driven SRS).
        card_created = (
            srs.create_card(
                db,
                front=f"{row['base']} → {row['target']}",
                back=row["answer"],
                rule=row["rule"],
                example=row["example"],
                source="drill",
            )
            is not None
        )

    return {
        "correct": correct,
        "answer": row["answer"],
        "rule": row["rule"],
        "example": row["example"],
        "card_created": card_created,
    }
