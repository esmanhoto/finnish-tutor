from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "qwen3:32b"

    db_path: Path = DATA_DIR / "tutor.sqlite"
    dictionary_db_path: Path = DATA_DIR / "dictionary" / "dictionary.sqlite"
    # Directory containing a Voikko dictionary, if libvoikko can't find the
    # system one (see README). Empty string = use system default.
    voikko_dict_path: str = ""

    yle_app_id: str = ""
    yle_app_key: str = ""

    user_name: str = "Eduardo"
    level: str = "B1"
    daily_goal_minutes: int = 20


settings = Settings()
