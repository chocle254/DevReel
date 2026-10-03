"""Job orchestration: queued -> analyzing -> planning -> generating_narration -> selecting_music
-> rendering -> assembling -> uploading -> completed | failed.

Every stage transition is persisted to the reel record (the SSE stream and GET /reels/{id} both
read from it), so a reconnecting client always sees the true state. We never report success
unless the final MP4 exists and passed validation.
"""
from __future__ import annotations

import asyncio
import logging
import traceback
from typing import Optional

from . import assemble as assemble_mod
from . import capture, github, music, scanner, story, tts, understanding
from .config import get_settings
from .models import ErrorInfo, PipelineError
from .security import make_render_token
from .store import get_store

log = logging.getLogger("devreel")

STAGE_LABELS = {
    "queued": "Waiting in queue",
    "analyzing": "Understanding the project",
    "planning": "Building the story",
    "generating_narration": "Generating narration",
    "selecting_music": "Selecting music",
    "rendering": "Rendering scenes",
    "assembling": "Assembling the reel",
    "uploading": "Finishing up",
    "completed": "Done",
    "failed": "Failed",
}

_sem: Optional[asyncio.Semaphore] = None


def _semaphore() -> asyncio.Semaphore:
    global _sem
    if _sem is None:
        _sem = asyncio.Semaphore(get_settings().max_concurrent_jobs)
    return _sem


def _stage(reel_id: str, status: str, progress: int, message: str | None = None) -> None:
    store = get_store()
    store.update(reel_id, status=status, stage_label=STAGE_LABELS[status], progress=progress)
    if message:
        store.log(reel_id, message)
    log.info("reel %s: %s (%s%%) %s", reel_id[:8], status, progress, message or "")


def _scaled(lo: int, hi: int, done: int, total: int) -> int:
    return lo + int((hi - lo) * done / max(total, 1))


async def run_reel(reel_id: str) -> None:
    store = get_store()
    async with _semaphore():
        try:
            await _run(reel_id)
        except PipelineError as e:
            _fail(reel_id, e.code, e.message, e.user_solvable)
        except Exception:  # noqa: BLE001 — last-resort net; details go to server logs only
            log.error("reel %s crashed:\n%s", reel_id, traceback.format_exc())
            _fail(reel_id, "internal", "Something went wrong on our side. Please try again.", False)
        finally:
            reel = store.get(reel_id)
            if reel and reel.status == "completed":
                store.cleanup_work(reel_id)


def _fail(reel_id: str, code: str, message: str, user_solvable: bool) -> None:
    store = get_store()
    store.log(reel_id, message, level="error")
    store.update(
        reel_id,
        status="failed",
        stage_label=STAGE_LABELS["failed"],
        error=ErrorInfo(code=code, message=message, user_solvable=user_solvable),
    )
    log.warning("reel %s failed: %s — %s", reel_id[:8], code, message)


async def _run(reel_id: str) -> None:
    s = get_settings()
    store = get_store()
    reel = store.get(reel_id)
    assert reel is not None
    work = store.work_dir(reel_id)

    # Checkpoints are persisted in the reel record. A failed job resumes from
    # the furthest durable artifact instead of repeating expensive AI work.
    u = reel.understanding
    plan = None
    narrations = []
    track_path = None
    clips = []

    # ------------------------------------------------------------- analyzing
    if u is None:
        _stage(reel_id, "analyzing", 3, "Checking the repository")
        ref = github.parse_repo_url(reel.repo_url)
        info = await asyncio.to_thread(github.fetch_repo_info, ref)

        _stage(reel_id, "analyzing", 6, f"Downloading {ref.name}")
        repo_dir = work / "repo"
        await asyncio.to_thread(github.clone_repo, ref, repo_dir)

        _stage(reel_id, "analyzing", 12, "Reading the codebase")
        ev = await asyncio.to_thread(scanner.scan_repo, repo_dir, ref.name)
        ev.description = info.description
        store.log(reel_id, f"Found {ev.total_files} files; studying {len(ev.files)} key files")

        _stage(reel_id, "analyzing", 16, "Understanding what the project does")
        u = await understanding.understand(ev)
        store.update(reel_id, understanding=u, chart=u.flow, repo_name=ref.name)
        _stage(reel_id, "analyzing", 30, f"Understood {u.name}: {u.one_liner}")
    else:
        store.log(reel_id, "Resuming from saved project understanding")
        _stage(reel_id, "analyzing", 30, "Using saved project understanding")

    # ---------------------------------------------------------------- planning
    if reel.scenes:
        # Scenes are a durable checkpoint; reconstruct the plan without another AI call.
        plan = story.StoryPlan(
            title=reel.title or u.name,
            tagline=reel.tagline or "",
            summary=reel.summary or u.one_liner,
            music_mood=reel.music_track or "cinematic",
            scenes=reel.scenes,
        )
        store.log(reel_id, f"Resuming with saved story ({len(plan.scenes)} scenes)")
    else:
        _stage(reel_id, "planning", 32, "Writing the story")
        plan = await story.plan_story(u)
        store.update(
            reel_id,
            title=plan.title,
            tagline=plan.tagline,
            summary=plan.summary,
            scenes=plan.scenes,
        )
        _stage(reel_id, "planning", 45, f"Story ready: {len(plan.scenes)} scenes")

    # --------------------------------------------------------------- narration
    _stage(reel_id, "generating_narration", 46, "Preparing the narration")
    def narr_progress(done: int, total: int) -> None:
        store.update(reel_id, progress=_scaled(46, 58, done, total))

    narrations = await tts.narrate(plan.scenes, work / "audio", on_progress=narr_progress, resume=True)
    total = round(sum(sc.duration_seconds for sc in plan.scenes), 1)
    store.update(reel_id, scenes=plan.scenes, duration_seconds=total)
    store.log(reel_id, f"Narration ready ({total}s of video)")

    # -------------------------------------------------------------------- music
    _stage(reel_id, "selecting_music", 59, "Choosing background music")
    if reel.music_track:
        track_id, track_path = await asyncio.to_thread(music.get_track, reel.music_track)
    else:
        mood = plan.music_mood or "cinematic"
        track_id, track_path = await asyncio.to_thread(music.select_track, mood)
    store.update(reel_id, music_track=track_id)
    store.log(reel_id, f"Music: {track_id}")

    # ---------------------------------------------------------------- rendering
    _stage(reel_id, "rendering", 62, "Rendering scenes")
    token = make_render_token(reel_id)
    def render_progress(done: int, total_scenes: int) -> None:
        store.update(reel_id, progress=_scaled(62, 88, done, total_scenes))
        store.log(reel_id, f"Rendered scene {done} of {total_scenes}")

    clips = await asyncio.to_thread(
        capture.capture_scenes, reel_id, plan.scenes, work / "clips", token, render_progress, True
    )

    # --------------------------------------------------------------- assembling
    _stage(reel_id, "assembling", 89, "Mixing narration and music, building the final video")
    final_path = store.video_path(reel_id)
    thumb_path = store.thumb_path(reel_id)
    duration = await asyncio.to_thread(
        assemble_mod.assemble, plan.scenes, clips, narrations, track_path, work / "mix", final_path, thumb_path
    )

    # ---------------------------------------------------------------- uploading
    _stage(reel_id, "uploading", 97, "Saving the reel")
    try:
        video_url = await asyncio.to_thread(store.store_video, reel_id, final_path)
    except Exception as e:  # noqa: BLE001
        raise PipelineError("assembly_failed", "We couldn't save the finished video. Please try again.", False) from e

    store.update(
        reel_id,
        video_url=video_url,
        thumbnail_url=store.thumbnail_url(reel_id),
        duration_seconds=duration,
        status="completed",
        stage_label=STAGE_LABELS["completed"],
        progress=100,
        error=None,
    )
    store.log(reel_id, "Your reel is ready")
    log.info("reel %s completed (%.1fs)", reel_id[:8], duration)
