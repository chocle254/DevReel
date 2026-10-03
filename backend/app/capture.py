"""Stage 5: turn scenes into video clips.

playwright  Opens {FRONTEND_URL}/render/{reel}/{scene}?token=... in headless Chromium, waits for
            window.__DEVREEL_READY__ === true, records scene.duration_seconds of the page, then
            trims off the load time (everything before the ready flag) and re-encodes to a clean
            fixed-size H.264 clip.
mock        Placeholder slate clips made with ffmpeg only. Lets the whole job lifecycle (assembly,
            storage, player) work before the frontend renderer exists.
"""
from __future__ import annotations

import logging
import time
from pathlib import Path
from urllib.parse import quote

from .config import get_settings
from .media import ffmpeg, probe_duration
from .models import PipelineError, Scene

log = logging.getLogger("devreel")

_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]
_MOCK_COLORS = ["0x16132b", "0x0f2a2a", "0x2a1a14", "0x141c2e", "0x241226", "0x112218", "0x1d1d12"]


# ---------------------------------------------------------------- playwright
def _encode_clip(webm: Path, offset: float, duration: float, out: Path) -> None:
    s = get_settings()
    vf = (
        f"tpad=stop_mode=clone:stop_duration=3,fps={s.video_fps},"
        f"scale={s.video_width}:{s.video_height}:flags=lanczos,format=yuv420p"
    )
    ffmpeg(
        [
            "-ss", f"{max(offset, 0):.3f}", "-i", str(webm), "-t", f"{duration:.3f}",
            "-vf", vf, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-movflags", "+faststart", str(out),
        ],
        timeout=300,
    )


def _capture_playwright(reel_id: str, scenes: list[Scene], work: Path, token: str, on_progress, resume: bool = False) -> list[Path]:
    from playwright.sync_api import Error as PlaywrightError
    from playwright.sync_api import TimeoutError as PlaywrightTimeout
    from playwright.sync_api import sync_playwright

    s = get_settings()
    raw_dir = work / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    clips: list[Path] = []
    base = s.frontend_url.rstrip("/")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                args=[
                    "--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required",
                ]
            )
            try:
                for i, sc in enumerate(scenes):
                    clip = work / f"clip_{sc.index}.mp4"
                    if resume and clip.exists() and probe_duration(clip) >= sc.duration_seconds - 0.6:
                        clips.append(clip)
                        if on_progress:
                            on_progress(i + 1, len(scenes))
                        continue
                    url = f"{base}/render/{reel_id}/{sc.index}?token={quote(token)}"
                    size = {"width": s.video_width, "height": s.video_height}
                    ctx = browser.new_context(viewport=size, record_video_dir=str(raw_dir), record_video_size=size)
                    page = ctx.new_page()
                    t0 = time.monotonic()
                    try:
                        page.goto(url, wait_until="load", timeout=int(s.capture_ready_timeout_seconds * 1000))
                        page.wait_for_function(
                            "window.__DEVREEL_READY__ === true", timeout=int(s.capture_ready_timeout_seconds * 1000)
                        )
                        ready_at = time.monotonic() - t0
                        page.wait_for_timeout(int((sc.duration_seconds + 0.4) * 1000))
                        video = page.video
                        ctx.close()  # finalises the webm
                        webm = Path(video.path()) if video else None
                    except PlaywrightTimeout as e:
                        ctx.close()
                        raise PipelineError(
                            "render_failed",
                            f"Scene {i + 1} never reported ready (window.__DEVREEL_READY__). Check the render route.",
                            False,
                        ) from e
                    if not webm or not webm.exists():
                        raise PipelineError("render_failed", f"Scene {i + 1} recording was not produced.", False)
                    clip = work / f"clip_{sc.index}.mp4"
                    _encode_clip(webm, ready_at, sc.duration_seconds, clip)
                    clips.append(clip)
                    webm.unlink(missing_ok=True)
                    if on_progress:
                        on_progress(i + 1, len(scenes))
            finally:
                browser.close()
    except PipelineError:
        raise
    except PlaywrightError as e:
        log.error("playwright error: %s", str(e)[:500])
        raise PipelineError(
            "render_failed", "The scene renderer couldn't be opened. Please try again in a moment.", False
        ) from e
    except RuntimeError as e:  # ffmpeg
        log.error("clip encode error: %s", e)
        raise PipelineError("render_failed", "A scene recording couldn't be processed.", False) from e
    return clips


# ---------------------------------------------------------------------- mock
def _capture_mock(scenes: list[Scene], work: Path, on_progress, resume: bool = False) -> list[Path]:
    s = get_settings()
    font = next((f for f in _FONT_CANDIDATES if Path(f).exists()), None)
    clips: list[Path] = []
    for i, sc in enumerate(scenes):
        out = work / f"clip_{sc.index}.mp4"
        if resume and out.exists() and probe_duration(out) >= sc.duration_seconds - 0.6:
            clips.append(out)
            if on_progress:
                on_progress(i + 1, len(scenes))
            continue
        color = _MOCK_COLORS[i % len(_MOCK_COLORS)]
        src = f"color=c={color}:s={s.video_width}x{s.video_height}:r={s.video_fps}:d={sc.duration_seconds}"
        base = ["-f", "lavfi", "-i", src]
        enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-an", str(out)]
        done = False
        if font:
            txt = work / f"mock_{sc.index}.txt"
            txt.write_text(f"{sc.type.upper()}\n\n{sc.headline}", encoding="utf-8")
            vf = (
                f"drawtext=fontfile={font}:textfile={txt}:fontcolor=white:fontsize=44:"
                "x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=16"
            )
            try:
                ffmpeg([*base, "-vf", vf, *enc])
                done = True
            except RuntimeError:
                done = False
        if not done:
            ffmpeg([*base, *enc])
        clips.append(out)
        if on_progress:
            on_progress(i + 1, len(scenes))
    return clips


def capture_scenes(reel_id: str, scenes: list[Scene], work: Path, token: str, on_progress=None, resume: bool = False) -> list[Path]:
    """Blocking. Call via asyncio.to_thread."""
    work.mkdir(parents=True, exist_ok=True)
    s = get_settings()
    if s.capture_mode == "mock":
        clips = _capture_mock(scenes, work, on_progress, resume)
    else:
        clips = _capture_playwright(reel_id, scenes, work, token, on_progress, resume)
    for clip, sc in zip(clips, scenes):
        d = probe_duration(clip)
        if d < sc.duration_seconds - 0.6:
            raise PipelineError("render_failed", f"Scene {sc.index + 1} came out shorter than expected.", False)
    return clips
