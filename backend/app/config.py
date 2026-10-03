"""Central configuration. Everything comes from environment variables (see .env.example)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- LLM (any OpenAI-compatible chat endpoint; defaults to NVIDIA NIM / Nemotron) ---
    llm_base_url: str = "https://integrate.api.nvidia.com/v1"
    llm_api_key: str = ""
    # Verify the exact model id on build.nvidia.com before the first real run.
    llm_model: str = "nvidia/nemotron-3.5-lightning-30b-a3b"
    llm_timeout_seconds: float = 300.0
    llm_max_tokens: int = 4096

    # --- URLs / CORS ---
    public_api_url: str = "http://localhost:8000"  # used to build absolute video/thumbnail URLs
    frontend_url: str = "http://localhost:5173"  # Playwright opens {frontend_url}/render/...
    frontend_origins: str = "http://localhost:5173"  # comma separated CORS origins

    # --- Render access ---
    render_secret: str = "dev-only-change-me"
    render_token_ttl_seconds: int = 900

    # --- Storage ---
    output_dir: Path = BASE_DIR / "outputs"
    music_dir: Path = BASE_DIR / "music"

    # --- GitHub / repository intake ---
    github_token: str = ""  # optional: raises the unauthenticated API rate limit
    max_repo_mb: int = 150
    max_file_kb: int = 200
    evidence_chars: int = 60_000
    per_file_chars: int = 6_000
    max_tree_entries: int = 300
    clone_timeout_seconds: int = 120

    # --- Story ---
    # Comma separated subset of: problem,solution,flow,feature,technology,impact,closing
    enabled_scene_types: str = "problem,flow,feature,closing"
    min_narration_words: int = 14
    max_narration_words: int = 60

    # --- Narration (TTS) ---
    tts_provider: str = "edge"  # edge | silent
    tts_voice: str = "en-US-AndrewNeural"
    tts_rate: str = "+0%"

    # --- Timing ---
    scene_lead_seconds: float = 0.5
    scene_tail_seconds: float = 0.9
    min_scene_seconds: float = 5.0
    max_scene_seconds: float = 22.0

    # --- Video ---
    video_width: int = 1280
    video_height: int = 720
    video_fps: int = 30
    music_volume: float = 0.16
    capture_mode: str = "playwright"  # playwright | mock
    capture_ready_timeout_seconds: float = 30.0

    # --- Jobs ---
    max_queue: int = 5
    max_concurrent_jobs: int = 1

    @property
    def origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.frontend_origins.split(",") if o.strip()]

    @property
    def scene_types(self) -> list[str]:
        return [t.strip() for t in self.enabled_scene_types.split(",") if t.strip()]


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.output_dir.mkdir(parents=True, exist_ok=True)
    return s
