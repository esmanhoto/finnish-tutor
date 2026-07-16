# Finnish Tutor (Suomi)

A local-first, single-user web app to break the intermediate plateau in Finnish.
Conversation with an AI tutor, morphology drills, easy-Finnish reading, and
error-driven spaced repetition — everything runs on your own machine, for free.

- **Frontend:** React + Vite + Tailwind + shadcn/ui (`frontend/`)
- **Backend:** Python + FastAPI + SQLite (`backend/`)
- **LLM:** local Qwen via [Ollama](https://ollama.com) — no cloud API, no cost
- **Morphology truth:** [Voikko](https://voikko.puimula.org/) (rule-based, never hallucinates)
- **Spaced repetition:** FSRS

## Prerequisites

- Node.js 20+, Python 3.12+, [uv](https://docs.astral.sh/uv/)
- [Ollama](https://ollama.com) with a Qwen model: `ollama pull qwen3:32b`
- Voikko: `brew install libvoikko` (macOS) or `apt install libvoikko1 voikko-fi` (Debian/Ubuntu)

## Setup

```bash
# Backend
cd backend
uv sync
cp .env.example .env          # adjust if needed (model name, YLE key, …)
uv run python scripts/build_dictionary.py   # one-time: builds the Fi→En dictionary (large download)
uv run uvicorn app.main:app --reload --port 8000

# Frontend (second terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173, proxies /api to :8000
```

## YLE API key (optional)

Reading mode can fetch Yle Selkouutiset articles live. Register your own key at
[developer.yle.fi](https://developer.yle.fi/) and set `YLE_APP_ID` / `YLE_APP_KEY`
in `backend/.env`. Without a key you can paste article text manually — the rest
of the pipeline (lookup, vocabulary, comprehension questions) works the same.
Article text is never stored; the app keeps only the link and derived exercises.

## Licensing

Code is MIT. The locally built dictionary data derives from Wiktionary
(CC BY-SA, see `NOTICE`). Voikko and Qwen weights are external dependencies
with their own licenses; YLE content is never bundled.
