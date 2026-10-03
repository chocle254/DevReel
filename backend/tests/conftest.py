import os
import shutil
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_tmp = Path(tempfile.mkdtemp(prefix="devreel-test-"))
(_tmp / "music").mkdir()
shutil.copy(ROOT / "music" / "catalog.json", _tmp / "music" / "catalog.json")

os.environ.update(
    OUTPUT_DIR=str(_tmp / "outputs"),
    MUSIC_DIR=str(_tmp / "music"),
    CAPTURE_MODE="mock",
    TTS_PROVIDER="silent",
    LLM_API_KEY="test-key",
    RENDER_SECRET="test-secret",
    PUBLIC_API_URL="http://testserver",
    VIDEO_WIDTH="640",
    VIDEO_HEIGHT="360",
)
