import json
import sqlite3
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from ..config import settings
from ..db import get_db
from .drills import MASTERY_WINDOW, _seed_categories
from .review import MASTERED_STABILITY_DAYS

router = APIRouter(prefix="/stats", tags=["stats"])

# The 8 locative/grammatical cases we drill, out of the canonical 15.
TOTAL_CASES = 15
CASE_CATEGORIES = {
    "nominative", "genitive", "partitive", "essive", "translative",
    "inessive", "elative", "illative", "adessive", "ablative", "allative",
    "abessive", "comitative", "instructive",
}
MASTERY_THRESHOLD = 0.8


def _day(ts: str) -> date:
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone().date()


def _daily_series(days: list[date], window: int = 7) -> list[int]:
    today = date.today()
    counts = {today - timedelta(days=i): 0 for i in range(window)}
    for d in days:
        if d in counts:
            counts[d] += 1
    return [counts[today - timedelta(days=i)] for i in range(window - 1, -1, -1)]


def _streak(days: set[date]) -> int:
    today = date.today()
    start = today if today in days else today - timedelta(days=1)
    if start not in days:
        return 0
    streak = 0
    d = start
    while d in days:
        streak += 1
        d -= timedelta(days=1)
    return streak


@router.get("/dashboard")
def dashboard(db: sqlite3.Connection = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc)
    today = date.today()

    activity = db.execute("SELECT kind, seconds, created_at FROM activity_log").fetchall()
    activity_days = {_day(r["created_at"]) for r in activity}
    today_seconds = sum(r["seconds"] for r in activity if _day(r["created_at"]) == today)
    total_minutes = round(sum(r["seconds"] for r in activity) / 60)
    week_minutes = round(
        sum(r["seconds"] for r in activity if _day(r["created_at"]) >= today - timedelta(days=6)) / 60
    )
    minutes_spark = _daily_series([_day(r["created_at"]) for r in activity for _ in range(max(1, r["seconds"] // 60))])

    cards = db.execute("SELECT source, front, back, example, fsrs_json, due, created_at FROM cards").fetchall()
    word_cards = [c for c in cards if c["source"] == "reading"]
    words_learned = len(word_cards)
    words_week = len([c for c in word_cards if _day(c["created_at"]) >= today - timedelta(days=6)])
    words_spark = _daily_series([_day(c["created_at"]) for c in cards])

    due_count = len([c for c in cards if c["due"] <= now.isoformat()])
    mastered = len(
        [c for c in cards if (json.loads(c["fsrs_json"]).get("stability") or 0) >= MASTERED_STABILITY_DAYS]
    )

    # Case mastery from recent drill attempts, same window as the drills grid.
    attempts = db.execute(
        """
        SELECT d.category, a.correct, a.attempted_at FROM drill_attempts a
        JOIN drill_items d ON d.id = a.item_id ORDER BY a.id DESC
        """
    ).fetchall()
    by_cat: dict[str, list[int]] = {}
    for a in attempts:
        if a["category"] in CASE_CATEGORIES:
            bucket = by_cat.setdefault(a["category"], [])
            if len(bucket) < MASTERY_WINDOW:
                bucket.append(a["correct"])
    cases_mastered = sum(
        1 for vals in by_cat.values() if vals and sum(vals) / len(vals) >= MASTERY_THRESHOLD
    )
    cases_week = 0  # refined once there is per-day mastery history
    correct_attempts_spark = _daily_series(
        [_day(a["attempted_at"]) for a in attempts if a["correct"]]
    )

    conv = db.execute(
        "SELECT topic FROM conversations ORDER BY id DESC LIMIT 1"
    ).fetchone()
    article = db.execute("SELECT title FROM articles ORDER BY id DESC LIMIT 1").fetchone()

    # Suggest the weakest drill category that has items.
    seed_cats = {c["key"]: c for c in _seed_categories()}
    weakest, weakest_score = None, 2.0
    for key in seed_cats:
        vals = [a["correct"] for a in attempts if a["category"] == key][:MASTERY_WINDOW]
        score = (sum(vals) / len(vals)) if vals else 0.0
        if score < weakest_score:
            weakest, weakest_score = key, score
    drill_suggestion = seed_cats.get(weakest, {"label": "Partitive"})["label"] if weakest else "Partitive"

    wotd_row = db.execute(
        "SELECT front, back, example FROM cards WHERE source = 'reading' ORDER BY id DESC LIMIT 1"
    ).fetchone()
    word_of_day = (
        {"fi": wotd_row["front"], "en": wotd_row["back"], "example": wotd_row["example"]}
        if wotd_row
        else {
            "fi": "sattumalta",
            "en": "by chance, coincidentally",
            "example": "Tapasin hänet aivan sattumalta. — I met her completely by chance.",
        }
    )

    return {
        "name": settings.user_name,
        "level": settings.level,
        "streak": _streak(activity_days),
        "today_minutes": round(today_seconds / 60),
        "goal_minutes": settings.daily_goal_minutes,
        "stats": {
            "words_learned": {"value": words_learned, "week": words_week, "spark": words_spark},
            "cases_mastered": {
                "value": cases_mastered,
                "total": TOTAL_CASES,
                "week": cases_week,
                "spark": correct_attempts_spark,
            },
            "minutes_practiced": {"value": total_minutes, "week": week_minutes, "spark": minutes_spark},
        },
        "review": {"due": due_count, "learning": len(cards) - mastered, "mastered": mastered, "total": len(cards)},
        "resume": {
            "conversation": conv["topic"] if conv else None,
            "drill": drill_suggestion,
            "article": article["title"] if article else None,
        },
        "word_of_day": word_of_day,
    }
