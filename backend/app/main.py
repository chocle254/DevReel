"""DevReel API. See API_CONTRACT.md for the full contract."""
from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from .config import get_settings
from .models import CreateReelRequest, PipelineError
from .pipeline import STAGE_LABELS, run_reel
from .github import parse_repo_url
from .security import verify_render_token
from .store import get_store

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("devreel")

_tasks: set[asyncio.Task] = set()
TERMINAL = ("completed", "failed")


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, user_solvable: bool = False):
        self.status, self.code, self.message, self.user_solvable = status, code, message, user_solvable


def _err(status: int, code: str, message: str, user_solvable: bool = False) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "user_solvable": user_solvable}},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    get_store()  # loads reels, marks interrupted jobs failed
    if s.render_secret == "dev-only-change-me":
        log.warning("RENDER_SECRET is the dev default. Set a real secret in production.")
    if not s.llm_api_key:
        log.warning("LLM_API_KEY is not set: generation will fail at the AI stages.")
    yield


app = FastAPI(title="DevReel API", version="1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)


@app.exception_handler(ApiError)
async def _api_error(_: Request, e: ApiError):
    return _err(e.status, e.code, e.message, e.user_solvable)


@app.exception_handler(RequestValidationError)
async def _validation_error(_: Request, e: RequestValidationError):
    return _err(400, "invalid_request", "The request was missing or had invalid fields.", True)


def _start(reel_id: str) -> None:
    task = asyncio.create_task(run_reel(reel_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


def _get_or_404(reel_id: str):
    try:
        reel = get_store().get(reel_id)
    except KeyError:
        reel = None
    if reel is None:
        raise ApiError(404, "not_found", "That reel doesn't exist.")
    return reel


def _session(x_session_id: str | None) -> str:
    return (x_session_id or "anonymous").strip()[:64] or "anonymous"


# ------------------------------------------------------------------ health
@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/health/deep")
async def health_deep():
    """Setup check you can open in a browser after deploying. Never returns secrets."""
    import shutil as _sh

    import httpx

    s = get_settings()
    checks: dict[str, dict] = {}

    def add(name: str, ok: bool, detail: str = "") -> None:
        checks[name] = {"ok": ok, "detail": detail}

    for tool in ("ffmpeg", "ffprobe", "git"):
        add(tool, _sh.which(tool) is not None, "" if _sh.which(tool) else "not installed")
    add("llm_api_key", bool(s.llm_api_key), f"model={s.llm_model}" if s.llm_api_key else "LLM_API_KEY not set")
    add("render_secret", s.render_secret != "dev-only-change-me", "" if s.render_secret != "dev-only-change-me" else "using the dev default")
    add("tts", s.tts_provider in ("edge", "silent"), f"provider={s.tts_provider}")
    if s.capture_mode == "mock":
        add("capture", True, "mock mode (placeholder clips, no frontend needed)")
    else:
        try:
            from playwright.sync_api import sync_playwright

            def _chromium() -> bool:
                with sync_playwright() as p:
                    return __import__("os").path.exists(p.chromium.executable_path)

            ok = await asyncio.to_thread(_chromium)
            add("chromium", ok, "" if ok else "run: playwright install chromium")
        except Exception as e:  # noqa: BLE001
            add("chromium", False, f"playwright unavailable: {type(e).__name__}")
        try:
            async with httpx.AsyncClient(timeout=6, follow_redirects=True) as c:
                r = await c.get(s.frontend_url)
            add("frontend_reachable", r.status_code < 500, f"{s.frontend_url} -> HTTP {r.status_code}")
        except Exception as e:  # noqa: BLE001
            add("frontend_reachable", False, f"{s.frontend_url} unreachable ({type(e).__name__})")
    add("output_dir_writable", __import__("os").access(s.output_dir, __import__("os").W_OK), str(s.output_dir))
    return {"ok": all(c["ok"] for c in checks.values()), "capture_mode": s.capture_mode, "checks": checks}


# ------------------------------------------------------------------- reels
@app.post("/api/reels", status_code=202)
async def create_reel(body: CreateReelRequest, x_session_id: str | None = Header(default=None)):
    try:
        ref = parse_repo_url(body.repo_url)
    except PipelineError as e:
        raise ApiError(400, e.code, e.message, e.user_solvable)
    store = get_store()
    if store.active_count() >= get_settings().max_queue:
        raise ApiError(429, "busy", "DevReel is busy right now. Please try again in a minute.", True)
    reel = store.create(ref.url, ref.name, _session(x_session_id))
    _start(reel.id)
    return reel.public()


@app.get("/api/reels")
async def list_reels(x_session_id: str | None = Header(default=None)):
    reels = get_store().list(_session(x_session_id))
    return {"reels": [r.summary_public() for r in reels]}


@app.get("/api/reels/{reel_id}")
async def get_reel(reel_id: str):
    return _get_or_404(reel_id).public()


@app.get("/api/reels/{reel_id}/events")
async def reel_events(reel_id: str, request: Request):
    _get_or_404(reel_id)
    store = get_store()

    async def gen():
        last_rev = -1
        idle = 0.0
        while True:
            if await request.is_disconnected():
                return
            reel = store.get(reel_id)
            if reel is None:  # deleted mid-stream
                return
            if reel.rev != last_rev:
                last_rev = reel.rev
                idle = 0.0
                yield f"event: state\ndata: {json.dumps(reel.public())}\n\n"
                if reel.status in TERMINAL:
                    return
            else:
                idle += 0.4
                if idle >= 15:
                    idle = 0.0
                    yield ": ping\n\n"
            await asyncio.sleep(0.4)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/api/reels/{reel_id}/video")
async def get_video(reel_id: str):
    reel = _get_or_404(reel_id)
    path = get_store().video_path(reel_id)
    if reel.status != "completed" or not path.exists():
        raise ApiError(404, "not_ready", "This reel's video isn't ready.")
    return FileResponse(path, media_type="video/mp4", filename=None)


@app.get("/api/reels/{reel_id}/thumbnail")
async def get_thumbnail(reel_id: str):
    reel = _get_or_404(reel_id)
    path = get_store().thumb_path(reel_id)
    if reel.status != "completed" or not path.exists():
        raise ApiError(404, "not_ready", "This reel's thumbnail isn't ready.")
    return FileResponse(path, media_type="image/jpeg")


@app.delete("/api/reels/{reel_id}")
async def delete_reel(reel_id: str):
    reel = _get_or_404(reel_id)
    if reel.status not in TERMINAL:
        raise ApiError(409, "in_progress", "This reel is still generating. Try again when it finishes.", True)
    get_store().delete(reel_id)
    return {"deleted": True}


@app.post("/api/reels/{reel_id}/continue", status_code=202)
async def continue_reel(reel_id: str):
    old = _get_or_404(reel_id)
    store = get_store()
    if old.status != "failed":
        raise ApiError(409, "not_failed", "This reel can only be continued after a failed generation.", True)
    if old.understanding is None and not old.repo_url:
        raise ApiError(409, "no_checkpoint", "There is no saved checkpoint to continue from.", True)
    if store.active_count() >= get_settings().max_queue:
        raise ApiError(429, "busy", "DevReel is busy right now. Please try again in a minute.", True)
    store.update(
        reel_id,
        status="queued",
        stage_label=STAGE_LABELS["queued"],
        progress=max(0, old.progress),
        error=None,
    )
    store.log(reel_id, "Continuing from the latest saved checkpoint")
    _start(reel_id)
    return store.get(reel_id).public()


@app.post("/api/reels/{reel_id}/regenerate", status_code=202)
async def regenerate(reel_id: str):
    old = _get_or_404(reel_id)
    store = get_store()
    if store.active_count() >= get_settings().max_queue:
        raise ApiError(429, "busy", "DevReel is busy right now. Please try again in a minute.", True)
    reel = store.create(old.repo_url, old.repo_name, old.session_id)  # original is kept untouched
    _start(reel.id)
    return reel.public()


# ------------------------------------------------------------ render access
def _render_guard(reel_id: str, token: str | None):
    if not verify_render_token(reel_id, token):
        raise ApiError(403, "forbidden", "This render link is invalid or has expired.")
    reel = _get_or_404(reel_id)
    if not reel.scenes:
        raise ApiError(404, "not_ready", "Scenes aren't ready yet.")
    return reel


@app.get("/api/render/{reel_id}/scenes")
async def render_scenes(reel_id: str, token: str | None = Query(default=None)):
    reel = _render_guard(reel_id, token)
    s = get_settings()
    return {
        "reel_id": reel.id,
        "title": reel.title,
        "total": len(reel.scenes),
        "scenes": [sc.model_dump(by_alias=True, mode="json") for sc in reel.scenes],
        "width": s.video_width,
        "height": s.video_height,
    }


@app.get("/api/render/{reel_id}/scenes/{index}")
async def render_scene(reel_id: str, index: int, token: str | None = Query(default=None)):
    reel = _render_guard(reel_id, token)
    if not 0 <= index < len(reel.scenes):
        raise ApiError(404, "not_found", "That scene doesn't exist.")
    s = get_settings()
    return {
        "reel_id": reel.id,
        "title": reel.title,
        "index": index,
        "total": len(reel.scenes),
        "scene": reel.scenes[index].model_dump(by_alias=True, mode="json"),
        "width": s.video_width,
        "height": s.video_height,
    }
