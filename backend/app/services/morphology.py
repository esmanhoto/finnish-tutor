"""Voikko-backed morphology: the deterministic source of truth.

Answers are checked by *analysis*, not string comparison: a user's form is
correct iff Voikko analyzes it as the expected base word carrying the expected
grammatical features. The LLM never decides correctness.
"""

import ctypes.util
import platform
from functools import lru_cache
from pathlib import Path

from libvoikko import Voikko

from ..config import settings

# Voikko's Finnish names for the cases, keyed by our drill category keys.
CASE_FEATURES = {
    "nominative": "nimento",
    "genitive": "omanto",
    "partitive": "osanto",
    "essive": "olento",
    "translative": "tulento",
    "inessive": "sisaolento",
    "elative": "sisaeronto",
    "illative": "sisatulento",
    "adessive": "ulkoolento",
    "ablative": "ulkoeronto",
    "allative": "ulkotulento",
    "abessive": "vajanto",
    "comitative": "seuranto",
    "instructive": "keinonto",
}

_SEARCH_PATHS = ["/opt/homebrew/lib", "/usr/local/lib", "/usr/lib"]


@lru_cache(maxsize=1)
def get_voikko() -> Voikko:
    dict_path = settings.voikko_dict_path or None
    if platform.system() != "Windows" and not ctypes.util.find_library("voikko"):
        for path in _SEARCH_PATHS:
            if list(Path(path).glob("libvoikko.*")):
                Voikko.setLibrarySearchPath(path)
                break
    return Voikko("fi", path=dict_path)


def analyze(word: str) -> list[dict]:
    return get_voikko().analyze(word.strip())


def matches(word: str, base: str, features: dict[str, str]) -> bool:
    """True iff some Voikko analysis of `word` has BASEFORM `base` and all
    expected feature values (e.g. SIJAMUOTO/NUMBER, or MOOD/TENSE/PERSON)."""
    word = word.strip().lower()
    base = base.strip().lower()
    if not word:
        return False
    for a in analyze(word):
        if a.get("BASEFORM", "").lower() != base:
            continue
        if all(a.get(k) == v for k, v in features.items()):
            return True
    return False


def verify_item(base: str, answer: str, features: dict[str, str]) -> bool:
    """Seed-time verification: the stored answer must itself pass the check."""
    return matches(answer, base, features)
