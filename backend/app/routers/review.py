import json
import sqlite3
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import get_db
from ..services import srs

router = APIRouter(prefix="/review", tags=["review"])

# A card counts as mastered once FSRS stability passes this many days.
MASTERED_STABILITY_DAYS = 21.0


class RateRequest(BaseModel):
    card_id: int
    rating: str  # again | hard | good | easy


def _counts(db: sqlite3.Connection) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    due = db.execute("SELECT COUNT(*) AS n FROM cards WHERE due <= ?", (now,)).fetchone()["n"]
    total = db.execute("SELECT COUNT(*) AS n FROM cards").fetchone()["n"]
    mastered = 0
    for row in db.execute("SELECT fsrs_json FROM cards"):
        stability = json.loads(row["fsrs_json"]).get("stability") or 0
        if stability >= MASTERED_STABILITY_DAYS:
            mastered += 1
    return {"due": due, "learning": total - mastered, "mastered": mastered, "total": total}


@router.get("/due")
def due(db: sqlite3.Connection = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    rows = db.execute(
        "SELECT * FROM cards WHERE due <= ? ORDER BY due LIMIT 50", (now,)
    ).fetchall()
    cards = [
        {
            "id": r["id"],
            "front": r["front"],
            "back": r["back"],
            "rule": r["rule"],
            "example": r["example"],
            "source": r["source"],
            "intervals": srs.preview_intervals(r["fsrs_json"]),
        }
        for r in rows
    ]
    return {"cards": cards, "counts": _counts(db)}


@router.post("/rate")
def rate(req: RateRequest, db: sqlite3.Connection = Depends(get_db)) -> dict:
    if req.rating not in srs.RATINGS:
        raise HTTPException(422, f"Unknown rating '{req.rating}'")
    try:
        result = srs.rate_card(db, req.card_id, req.rating)
    except KeyError:
        raise HTTPException(404, "Unknown card")
    db.execute("INSERT INTO activity_log (kind, seconds) VALUES ('review', 10)")
    now = datetime.now(timezone.utc).isoformat()
    remaining = db.execute(
        "SELECT COUNT(*) AS n FROM cards WHERE due <= ?", (now,)
    ).fetchone()["n"]
    return {**result, "remaining": remaining}
