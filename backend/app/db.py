import sqlite3
from collections.abc import Iterator
from pathlib import Path

from .config import settings

SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    # One connection per request, used sequentially — but FastAPI may run a sync
    # dependency and its endpoint on different threadpool threads.
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = _connect(settings.db_path)
    try:
        conn.executescript(SCHEMA_PATH.read_text())
        conn.commit()
    finally:
        conn.close()


def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: one connection per request."""
    conn = _connect(settings.db_path)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
