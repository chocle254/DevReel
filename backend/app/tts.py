"""Stage 3: narration. One audio file per scene; the audio length decides the scene length.

Providers:
  edge    Microsoft Edge neural voices via the `edge-tts` package (no API key). Default.
  silent  No speech; durations are estimated from word count. For offline dev/tests only.

NVIDIA TTS is intentionally not wired in: its request shape has not been verified
against current docs (see build notes). Add a provider here when it is.
"""
from __future__ import annotations

from pathlib import Path

from .config import get_settings
from .media import ffmpeg, probe_duration
from .models import PipelineError, Scene


def scene_duration(narration_seconds: float) -> float:
    s = get_settings()
    total = narration_seconds + s.scene_lead_seconds + s.scene_tail_seconds
    return round(min(max(total, s.min_scene_seconds), s.max_scene_seconds), 2)


async def _edge(text: str, out: Path) -> None:
    import edge_tts

    s = get_settings()
    comm = edge_tts.Communicate(text, s.tts_voice, rate=s.tts_rate)
    await comm.save(str(out))


def _silent(text: str, out: Path) -> None:
    secs = max(len(text.split()) / 2.6, 1.0)
    ffmpeg(["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{secs:.2f}", "-c:a", "libmp3lame", str(out)])


async def synthesize_scene(scene: Scene, out_dir: Path) -> Path:
    s = get_settings()
    out = out_dir / f"narration_{scene.index}.mp3"
    try:
        if s.tts_provider == "edge":
            await _edge(scene.narration, out)
        elif s.tts_provider == "silent":
            _silent(scene.narration, out)
        else:
            raise PipelineError("narration_failed", f"Unknown TTS provider '{s.tts_provider}'.", False)
    except PipelineError:
        raise
    except Exception as e:
        raise PipelineError("narration_failed", "We couldn't generate the narration. Please try again.", False) from e
    if not out.exists() or out.stat().st_size < 500:
        raise PipelineError("narration_failed", "The narration came back empty. Please try again.", False)
    return out


async def narrate(scenes: list[Scene], out_dir: Path, on_progress=None) -> list[Path]:
    """Generate narration for each scene, set scene.duration_seconds from the real audio length."""
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for i, sc in enumerate(scenes):
        path = await synthesize_scene(sc, out_dir)
        dur = probe_duration(path)
        if dur <= 0.3:
            raise PipelineError("narration_failed", "The narration audio was invalid. Please try again.", False)
        sc.duration_seconds = scene_duration(dur)
        paths.append(path)
        if on_progress:
            on_progress(i + 1, len(scenes))
    return paths
