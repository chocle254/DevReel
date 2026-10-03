"""Stage 4: pick a track from the curated catalog.

Drop real royalty-free tracks (e.g. from Pixabay) into `music/` using the file names in
`music/catalog.json` and they are used automatically. Any track whose file is missing is
synthesised once as an ambient pad with ffmpeg, so the pipeline always works.
"""
from __future__ import annotations

import json
from pathlib import Path

from .config import get_settings
from .media import ffmpeg
from .models import PipelineError

# (chord frequencies in Hz, tremolo rate) per mood for the placeholder pads
_SYNTH = {
    "cinematic": ([110.0, 164.81, 220.0, 277.18], 0.15),
    "uplifting": ([130.81, 196.0, 261.63, 329.63], 0.35),
    "tech": ([98.0, 146.83, 196.0, 293.66], 0.5),
    "calm": ([87.31, 130.81, 174.61, 220.0], 0.1),
}


def load_catalog() -> list[dict]:
    path = get_settings().music_dir / "catalog.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _synthesise(track: dict, out: Path) -> None:
    freqs, trem = _SYNTH.get(track["mood"], _SYNTH["cinematic"])
    dur = 150
    inputs: list[str] = []
    for f in freqs:
        inputs += ["-f", "lavfi", "-i", f"sine=frequency={f}:duration={dur}"]
    chain = (
        "[0][1][2][3]amix=inputs=4:normalize=0,"
        f"tremolo=f={trem}:d=0.45,lowpass=f=1100,aecho=0.8:0.7:500|900:0.4|0.3,"
        "volume=0.9,afade=t=in:d=3"
    )
    ffmpeg([*inputs, "-filter_complex", chain, "-c:a", "libmp3lame", "-q:a", "5", str(out)], timeout=120)


def get_track(track_id: str) -> tuple[str, Path]:
    s = get_settings()
    catalog = load_catalog()
    track = next((t for t in catalog if t["id"] == track_id), None)
    if track is None:
        raise PipelineError("music_failed", "The saved soundtrack is no longer available.", False)
    path = s.music_dir / track["file"]
    if not path.exists() or path.stat().st_size == 0:
        s.music_dir.mkdir(parents=True, exist_ok=True)
        _synthesise(track, path)
    return track["id"], path


def select_track(mood: str) -> tuple[str, Path]:
    s = get_settings()
    catalog = load_catalog()
    mood = (mood or "cinematic").lower()
    track = next((t for t in catalog if t["mood"] == mood), catalog[0])
    path = s.music_dir / track["file"]
    if not path.exists() or path.stat().st_size == 0:
        s.music_dir.mkdir(parents=True, exist_ok=True)
        _synthesise(track, path)
    return track["id"], path
