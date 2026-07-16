from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import APIRouter, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import init_db

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Finnish Tutor", lifespan=lifespan)

api = APIRouter(prefix="/api")


@api.get("/health")
async def health() -> dict:
    voikko_ok = False
    try:
        from .services.morphology import get_voikko

        voikko_ok = get_voikko() is not None
    except Exception:
        voikko_ok = False

    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            r = await client.get(f"{settings.ollama_host}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        ollama_ok = False

    return {
        "status": "ok",
        "voikko": voikko_ok,
        "ollama": ollama_ok,
        "model": settings.ollama_model,
        "dictionary": settings.dictionary_db_path.exists(),
        "yle": bool(settings.yle_app_id and settings.yle_app_key),
    }


from .routers import drills  # noqa: E402

api.include_router(drills.router)
app.include_router(api)

# Production: serve the built frontend (SPA fallback to index.html).
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str) -> FileResponse:
        file = FRONTEND_DIST / path
        if path and file.is_file():
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")
