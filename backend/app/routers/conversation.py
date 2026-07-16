import json
import sqlite3

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import get_db
from ..services import srs, tutor

router = APIRouter(prefix="/conversation", tags=["conversation"])


class StartRequest(BaseModel):
    topic: str


class MessageRequest(BaseModel):
    conversation_id: int
    fi: str


def _message_row(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"],
        "role": r["role"],
        "fi": r["fi"],
        "en": r["en"],
        "correction": json.loads(r["correction"]) if r["correction"] else None,
    }


def _conversation(db: sqlite3.Connection, conv_id: int) -> dict:
    conv = db.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,)).fetchone()
    if conv is None:
        raise HTTPException(404, "Unknown conversation")
    messages = db.execute(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id", (conv_id,)
    ).fetchall()
    return {
        "id": conv["id"],
        "topic": conv["topic"],
        "messages": [_message_row(m) for m in messages],
    }


@router.get("/current")
def current(db: sqlite3.Connection = Depends(get_db)) -> dict | None:
    row = db.execute("SELECT id FROM conversations ORDER BY id DESC LIMIT 1").fetchone()
    return _conversation(db, row["id"]) if row else None


@router.post("")
def start(req: StartRequest, db: sqlite3.Connection = Depends(get_db)) -> dict:
    reply = tutor.opener(req.topic)
    cur = db.execute("INSERT INTO conversations (topic) VALUES (?)", (req.topic,))
    conv_id = cur.lastrowid
    db.execute(
        "INSERT INTO messages (conversation_id, role, fi, en) VALUES (?, 'tutor', ?, ?)",
        (conv_id, reply["reply_fi"], reply["reply_en"]),
    )
    return _conversation(db, conv_id)


@router.post("/message")
def send(req: MessageRequest, db: sqlite3.Connection = Depends(get_db)) -> dict:
    conv = db.execute(
        "SELECT * FROM conversations WHERE id = ?", (req.conversation_id,)
    ).fetchone()
    if conv is None:
        raise HTTPException(404, "Unknown conversation")
    if not req.fi.strip():
        raise HTTPException(422, "Empty message")

    history = [
        dict(r)
        for r in db.execute(
            "SELECT role, fi FROM messages WHERE conversation_id = ? ORDER BY id",
            (req.conversation_id,),
        )
    ]
    reply = tutor.respond(conv["topic"], history, req.fi.strip())
    correction = reply.get("correction")

    db.execute(
        "INSERT INTO messages (conversation_id, role, fi, correction) VALUES (?, 'user', ?, ?)",
        (req.conversation_id, req.fi.strip(), json.dumps(correction) if correction else None),
    )
    db.execute(
        "INSERT INTO messages (conversation_id, role, fi, en) VALUES (?, 'tutor', ?, ?)",
        (req.conversation_id, reply["reply_fi"], reply["reply_en"]),
    )
    db.execute("INSERT INTO activity_log (kind, seconds) VALUES ('conversation', 60)")

    if correction:
        # Every tutor correction becomes a spaced-repetition card.
        srs.create_card(
            db,
            front=f"Fix: {correction['original']}",
            back=correction["corrected"],
            rule=correction["rule"],
            example=correction["explanation"],
            source="conversation",
        )

    return _conversation(db, req.conversation_id)
