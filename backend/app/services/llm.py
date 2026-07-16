"""Small helper for one-shot structured LLM calls (precompute pipeline)."""

import json

from ollama import Client

from ..config import settings


def structured(messages: list[dict], schema: dict, temperature: float = 0.3) -> dict:
    client = Client(host=settings.ollama_host)
    resp = client.chat(
        model=settings.ollama_model,
        think=False,
        format=schema,
        options={"temperature": temperature},
        messages=messages,
    )
    return json.loads(resp.message.content)
