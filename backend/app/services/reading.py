"""Reading pipeline: tokenize → Voikko lemma → dictionary gloss, plus a
one-time LLM pass for vocabulary selection and comprehension questions.
Derived data is cached in SQLite (generate-once); article text lives only
in the local database, never in the repo.
"""

import re
import sqlite3

from . import dictionary, llm, morphology

TOKEN_RE = re.compile(r"[A-Za-zÅÄÖåäöŠšŽž]+(?:-[A-Za-zÅÄÖåäöŠšŽž]+)*")

ARTICLE_SCHEMA = {
    "type": "object",
    "properties": {
        "vocab": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "fi": {"type": "string"},
                    "en": {"type": "string"},
                },
                "required": ["fi", "en"],
            },
        },
        "questions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["vocab", "questions"],
}

ARTICLE_PROMPT = """You are preparing study material for a B1 (intermediate) learner of Finnish. Here is an easy-Finnish article.

Title: {title}

{text}

Return:
- vocab: the 5 most useful-to-learn content words from this article for an intermediate learner (skip trivial words like olla, ja, hän). Give each as its DICTIONARY BASE FORM (`fi`) with a short English translation (`en`).
- questions: exactly 3 short comprehension questions about the article, written in easy Finnish.
"""


def lemmatize(word: str) -> str | None:
    analyses = morphology.analyze(word)
    if analyses:
        return analyses[0].get("BASEFORM")
    return None


def _token_lookup(word: str, db: sqlite3.Connection) -> tuple[str | None, dict | None]:
    lemma = lemmatize(word)
    if lemma is None:
        return None, None
    hit = dictionary.lookup(lemma, db)
    if hit is None:
        return lemma, None
    return lemma, {"base": lemma, "en": hit["gloss"], "note": hit["pos"] or None}


def derive(title: str, text: str, db: sqlite3.Connection) -> dict:
    paragraphs_raw = [p.strip() for p in re.split(r"\n\s*\n|\n", text) if p.strip()]

    # One-time LLM pass; degrade gracefully if Ollama is unavailable.
    try:
        extra = llm.structured(
            [{"role": "user", "content": ARTICLE_PROMPT.format(title=title, text=text)}],
            ARTICLE_SCHEMA,
        )
        vocab = extra.get("vocab", [])[:5]
        questions = extra.get("questions", [])[:3]
    except Exception:
        vocab, questions = [], []

    # Prefer the bundled dictionary's gloss over the LLM's when available.
    for v in vocab:
        hit = dictionary.lookup(v["fi"], db)
        if hit:
            v["en"] = hit["gloss"]
    vocab_lemmas = {v["fi"].lower() for v in vocab}

    lookup_cache: dict[str, tuple[str | None, dict | None]] = {}
    word_count = 0
    paragraphs = []
    for para in paragraphs_raw:
        tokens = []
        pos = 0
        for m in TOKEN_RE.finditer(para):
            if m.start() > pos:
                tokens.append({"text": para[pos : m.start()]})
            word = m.group()
            word_count += 1
            if word not in lookup_cache:
                lookup_cache[word] = _token_lookup(word, db)
            lemma, lookup = lookup_cache[word]
            token: dict = {"text": word}
            if lookup:
                token["lookup"] = lookup
            elif lemma:
                token["lookup"] = {"base": lemma, "en": None, "note": None}
            if lemma and lemma.lower() in vocab_lemmas:
                token["unknown"] = True
            tokens.append(token)
            pos = m.end()
        if pos < len(para):
            tokens.append({"text": para[pos:]})
        paragraphs.append(tokens)

    return {
        "paragraphs": paragraphs,
        "vocab": vocab,
        "questions": questions,
        "read_time": f"{max(1, round(word_count / 120))} min",
        "word_count": word_count,
    }
