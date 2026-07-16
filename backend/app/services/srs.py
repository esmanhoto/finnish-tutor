"""FSRS-backed spaced repetition. Card scheduling state is owned entirely by
py-fsrs; we persist its serialized form and denormalize `due` for querying.
"""

import json
import sqlite3
from datetime import datetime, timezone

from fsrs import Card, Rating, Scheduler

_scheduler = Scheduler()

RATINGS = {
    "again": Rating.Again,
    "hard": Rating.Hard,
    "good": Rating.Good,
    "easy": Rating.Easy,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_card(
    conn: sqlite3.Connection,
    front: str,
    back: str,
    rule: str | None,
    example: str | None,
    source: str,
) -> int | None:
    """Create a new due-now card; returns None if an identical card exists."""
    card = Card()
    cur = conn.execute(
        """
        INSERT INTO cards (front, back, rule, example, source, fsrs_json, due)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (front, back) DO NOTHING
        """,
        (
            front,
            back,
            rule,
            example,
            source,
            json.dumps(card.to_dict()),
            _now().isoformat(),
        ),
    )
    return cur.lastrowid if cur.rowcount else None


def _humanize(seconds: float) -> str:
    if seconds < 60:
        return "<1 min"
    if seconds < 3600:
        return f"{round(seconds / 60)} min"
    if seconds < 86400 * 1.5:
        return f"{round(seconds / 3600)} h"
    if seconds < 86400 * 30:
        return f"{round(seconds / 86400)} d"
    return f"{round(seconds / (86400 * 30.44))} mo"


def preview_intervals(fsrs_json: str) -> dict[str, str]:
    """What each rating would schedule, for the Again/Hard/Good/Easy buttons."""
    now = _now()
    out = {}
    for name, rating in RATINGS.items():
        card = Card.from_dict(json.loads(fsrs_json))
        card, _ = _scheduler.review_card(card, rating, review_datetime=now)
        out[name] = _humanize((card.due - now).total_seconds())
    return out


def rate_card(conn: sqlite3.Connection, card_id: int, rating_name: str) -> dict:
    row = conn.execute("SELECT fsrs_json FROM cards WHERE id = ?", (card_id,)).fetchone()
    if row is None:
        raise KeyError(card_id)
    rating = RATINGS[rating_name]
    card = Card.from_dict(json.loads(row["fsrs_json"]))
    card, _ = _scheduler.review_card(card, rating, review_datetime=_now())
    conn.execute(
        "UPDATE cards SET fsrs_json = ?, due = ? WHERE id = ?",
        (json.dumps(card.to_dict()), card.due.isoformat(), card_id),
    )
    conn.execute(
        "INSERT INTO review_log (card_id, rating) VALUES (?, ?)",
        (card_id, int(rating)),
    )
    return {"card_id": card_id, "due": card.due.isoformat()}
