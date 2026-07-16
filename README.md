# Finnish Tutor (Suomi)

A local-first, single-user web app to break the intermediate plateau in Finnish.
Conversation with an AI tutor, morphology drills, easy-Finnish reading, and
error-driven spaced repetition — everything runs on your own machine, for free.

| Screen | What it does |
|---|---|
| **Conversation** | Chat in Finnish with "Maija" (local LLM). Every grammar mistake gets an inline correction card with a plain-English rule — and becomes a review card. |
| **Drills** | Cases, consonant gradation, vowel harmony, verb types. Answers are checked by **Voikko** (rule-based analyzer) — deterministic, never hallucinated. Mistakes become review cards. |
| **Reading** | Paste an easy-Finnish article (e.g. Yle Selkouutiset). Every word is tap-to-translate (Voikko lemma + bundled Wiktionary dictionary), with LLM-generated vocabulary and comprehension questions, cached forever. |
| **Review** | FSRS spaced repetition over cards generated from *your own mistakes*. |
| **Home** | Streak, daily goal, mastery stats — all computed from real usage. |

## Architecture

- **Frontend:** React + Vite + Tailwind + shadcn/ui (`frontend/`)
- **Backend:** Python + FastAPI + SQLite (`backend/`)
- **LLM:** local Qwen via [Ollama](https://ollama.com) — no cloud API, zero cost
- **Morphology truth:** [Voikko](https://voikko.puimula.org/) — the analyzer decides correctness; the LLM only phrases explanations
- **SRS:** [py-fsrs](https://github.com/open-spaced-repetition/py-fsrs)
- **Dictionary:** built locally from the [kaikki.org](https://kaikki.org/dictionary/Finnish/) Wiktionary extract (CC BY-SA, see `NOTICE`; never committed)

LLM output is precomputed once and cached in SQLite (article vocab, questions);
only the conversation is live. Article text stays in your local database —
the repo ships code, not content.

## Setup (macOS / Linux)

Prerequisites: Node 20+, Python 3.12+, [uv](https://docs.astral.sh/uv/),
[Ollama](https://ollama.com), Voikko:

```bash
brew install libvoikko          # macOS (includes the Finnish dictionary)
# apt install libvoikko1 voikko-fi   # Debian/Ubuntu
ollama pull qwen3:32b           # or qwen3:8b on smaller machines
```

Then:

```bash
# Backend
cd backend
uv sync
cp .env.example .env                          # defaults are fine locally
uv run python scripts/build_dictionary.py     # one-time: ~4.6 GB download → 26 MB database
uv run python scripts/seed_drills.py          # seed the Voikko-verified drill bank
uv run uvicorn app.main:app --reload --port 8000

# Frontend (second terminal)
cd frontend
npm install
npm run dev                                   # http://localhost:5173 (proxies /api → :8000)
```

For production-style serving, `npm run build` in `frontend/` and FastAPI will
serve the built app itself at http://localhost:8000.

Check `GET /api/health` — it reports whether Voikko, Ollama, and the
dictionary are ready.

### Docker

```bash
docker compose up --build
# then, once: docker compose exec ollama ollama pull qwen3:32b
```

Note for Apple Silicon: Docker containers can't use the GPU, so Ollama inside
Docker is slow. Prefer running Ollama on the host and pointing the app at it
(`OLLAMA_HOST=http://host.docker.internal:11434` for the `app` service).

## Configuration (`backend/.env`)

| Variable | Default | Notes |
|---|---|---|
| `OLLAMA_MODEL` | `qwen3:32b` | `qwen3:8b` is much faster on modest hardware |
| `OLLAMA_HOST` | `http://localhost:11434` | |
| `YLE_APP_ID` / `YLE_APP_KEY` | empty | Optional — register your own at [developer.yle.fi](https://developer.yle.fi/). Without a key, paste article text manually. |
| `USER_NAME` / `LEVEL` / `DAILY_GOAL_MINUTES` | `Eduardo` / `B1` / `20` | Level is a soft setting that tunes the tutor's register |
| `VOIKKO_DICT_PATH` | empty | Only if libvoikko can't find a system dictionary |

## Licensing

- **Code:** MIT (`LICENSE`)
- **Dictionary data** (built locally, not committed): CC BY-SA, from Wiktionary via kaikki.org — see `NOTICE`
- **Voikko** and **Qwen** weights are external dependencies with their own licenses
- **YLE content** is never stored in the repo; users bring their own API key, and the app keeps only links plus derived exercises
