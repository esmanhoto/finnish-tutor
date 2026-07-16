"""Live conversation tutor — the only place a *live* LLM is required.

The LLM proofreads and chats; it never decides drill correctness (that is
Voikko's job). Structured output keeps the reply machine-readable.
"""

import json

from ollama import Client

from ..config import settings

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "reply_fi": {"type": "string"},
        "reply_en": {"type": "string"},
        "correction": {
            "anyOf": [
                {"type": "null"},
                {
                    "type": "object",
                    "properties": {
                        "original": {"type": "string"},
                        "corrected": {"type": "string"},
                        "rule": {"type": "string"},
                        "explanation": {"type": "string"},
                    },
                    "required": ["original", "corrected", "rule", "explanation"],
                },
            ]
        },
    },
    "required": ["reply_fi", "reply_en", "correction"],
}

SYSTEM = """You are Maija, a friendly native Finnish tutor chatting with {name}, a {level} (intermediate) learner. The conversation topic is: {topic}. All grammar explanations are in plain English.

For EVERY user message, do two jobs:

1. PROOFREAD (be strict). Check each word of the user's Finnish: case endings (especially location cases and objects), verb conjugation and agreement, vowel harmony, consonant gradation, word order. Intermediate learners make case errors constantly — look for a missing or wrong case before concluding the sentence is correct.
   - If there is any error: fill `correction` with the user's exact sentence (`original`), the fixed version (`corrected`), a short `rule` name like "Illative case (-Vn) — direction into a place", and a 1-2 sentence plain-English `explanation`.
   - Only if every word is perfect: `correction` = null.

2. REPLY as a warm conversation partner, in Finnish only, 1-3 short sentences suited to {level} level, ending with a question that keeps the conversation going. Do not mention the correction in the reply. `reply_en` is the English translation of `reply_fi`."""

OPENER_INSTRUCTION = (
    "Start the conversation: greet {name} briefly in Finnish and ask an easy, "
    "concrete opening question about the topic. correction must be null."
)


def _client() -> Client:
    return Client(host=settings.ollama_host)


def _chat(messages: list[dict]) -> dict:
    resp = _client().chat(
        model=settings.ollama_model,
        think=False,
        format=RESPONSE_SCHEMA,
        options={"temperature": 0.4},
        messages=messages,
    )
    return json.loads(resp.message.content)


def _system(topic: str) -> dict:
    return {
        "role": "system",
        "content": SYSTEM.format(name=settings.user_name, level=settings.level, topic=topic),
    }


def opener(topic: str) -> dict:
    return _chat(
        [
            _system(topic),
            {"role": "user", "content": OPENER_INSTRUCTION.format(name=settings.user_name)},
        ]
    )


def respond(topic: str, history: list[dict], user_fi: str) -> dict:
    """history: prior messages as [{'role': 'tutor'|'user', 'fi': ...}]."""
    messages = [_system(topic)]
    for m in history:
        role = "assistant" if m["role"] == "tutor" else "user"
        messages.append({"role": role, "content": m["fi"]})
    messages.append({"role": "user", "content": user_fi})
    return _chat(messages)
