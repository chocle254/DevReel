"""Small ffmpeg/ffprobe helpers shared by tts, music, capture and assemble."""
from __future__ import annotations

import subprocess
from pathlib import Path


def run(cmd: list[str], timeout: int = 600) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def probe_duration(path: Path) -> float:
    p = run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        timeout=60,
    )
    try:
        return float(p.stdout.strip())
    except ValueError:
        return 0.0


def ffmpeg(args: list[str], timeout: int = 600) -> None:
    """Run ffmpeg, raise RuntimeError with the tail of stderr on failure."""
    p = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args], timeout=timeout)
    if p.returncode != 0:
        raise RuntimeError((p.stderr or "ffmpeg failed")[-800:])
