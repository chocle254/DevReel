"""File-backed reel store. One folder per reel:

outputs/<reel_id>/meta.json   reel record (source of truth, survives restarts)
outputs/<reel_id>/reel.mp4    final video
outputs/<reel_id>/thumb.jpg   thumbnail
outputs/<reel_id>/work/       temporary files (deleted when the job ends)

`store_video()` is the single hook for media storage. Swap its body for
Supabase Storage / Backblaze B2 later without touching the pipeline.
"""
from __future__ import annotations

import json
import os
import shutil
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .config import get_settings
from .models import ErrorInfo, LogEntry, Reel


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class ReelStore:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.root: Path = self.settings.output_dir
        self.root.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._cache: dict[str, Reel] = {}
        self._load_all()

    # ---------- paths ----------
    def reel_dir(self, reel_id: str) -> Path:
        _check_id(reel_id)
        return self.root / reel_id

    def work_dir(self, reel_id: str) -> Path:
        d = self.reel_dir(reel_id) / "work"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def video_path(self, reel_id: str) -> Path:
        return self.reel_dir(reel_id) / "reel.mp4"

    def thumb_path(self, reel_id: str) -> Path:
        return self.reel_dir(reel_id) / "thumb.jpg"

    # ---------- persistence ----------
    def _meta_path(self, reel_id: str) -> Path:
        return self.reel_dir(reel_id) / "meta.json"

    def _write(self, reel: Reel) -> None:
        d = self.reel_dir(reel.id)
        d.mkdir(parents=True, exist_ok=True)
        tmp = d / "meta.json.tmp"
        tmp.write_text(reel.model_dump_json(by_alias=True), encoding="utf-8")
        os.replace(tmp, self._meta_path(reel.id))

    def _load_all(self) -> None:
        for p in self.root.glob("*/meta.json"):
            try:
                reel = Reel.model_validate_json(p.read_text(encoding="utf-8"))
            except Exception:
                continue
            # A job that was running when the server stopped can never finish.
            if reel.status not in ("completed", "failed"):
                reel.status = "failed"
                reel.stage_label = "Failed"
                reel.error = ErrorInfo(
                    code="internal",
                    message="The server restarted while this reel was generating. Please try again.",
                    user_solvable=False,
                )
                reel.rev += 1
                reel.updated_at = now_iso()
                self._write(reel)
            self._cache[reel.id] = reel

    # ---------- API ----------
    def create(self, repo_url: str, repo_name: str, session_id: str) -> Reel:
        ts = now_iso()
        reel = Reel(
            id=str(uuid.uuid4()),
            session_id=session_id,
            repo_url=repo_url,
            repo_name=repo_name,
            created_at=ts,
            updated_at=ts,
        )
        with self._lock:
            self._cache[reel.id] = reel
            self._write(reel)
        return reel.model_copy(deep=True)

    def get(self, reel_id: str) -> Optional[Reel]:
        with self._lock:
            reel = self._cache.get(reel_id)
            return reel.model_copy(deep=True) if reel else None

    def list(self, session_id: str) -> list[Reel]:
        with self._lock:
            reels = [r for r in self._cache.values() if r.session_id == session_id]
        reels.sort(key=lambda r: r.created_at, reverse=True)
        return [r.model_copy(deep=True) for r in reels]

    def active_count(self) -> int:
        with self._lock:
            return sum(1 for r in self._cache.values() if r.status not in ("completed", "failed"))

    def update(self, reel_id: str, **fields) -> Reel:
        """Apply field changes atomically, bump rev, persist. Progress never goes backwards."""
        with self._lock:
            reel = self._cache[reel_id]
            if "progress" in fields and fields["progress"] is not None:
                fields["progress"] = max(reel.progress, min(100, int(fields["progress"])))
            for k, v in fields.items():
                setattr(reel, k, v)
            reel.rev += 1
            reel.updated_at = now_iso()
            self._write(reel)
            return reel.model_copy(deep=True)

    def log(self, reel_id: str, message: str, level: str = "info") -> None:
        with self._lock:
            reel = self._cache[reel_id]
            reel.logs.append(LogEntry(ts=now_iso(), level=level, message=message))  # type: ignore[arg-type]
            reel.logs = reel.logs[-200:]
            reel.rev += 1
            reel.updated_at = now_iso()
            self._write(reel)

    def delete(self, reel_id: str) -> bool:
        with self._lock:
            reel = self._cache.pop(reel_id, None)
        if reel is None:
            return False
        shutil.rmtree(self.reel_dir(reel_id), ignore_errors=True)
        return True

    def cleanup_work(self, reel_id: str) -> None:
        shutil.rmtree(self.reel_dir(reel_id) / "work", ignore_errors=True)

    # ---------- media hook ----------
    def store_video(self, reel_id: str, local_path: Path) -> str:
        """Persist the final MP4 and return the public URL.

        Local-disk implementation: the file already lives in the reel folder, so
        this just validates and returns the API URL. To move to cloud storage,
        upload `local_path` here and return the bucket/CDN URL instead.
        """
        if not local_path.exists() or local_path.stat().st_size == 0:
            raise FileNotFoundError(str(local_path))
        target = self.video_path(reel_id)
        if local_path.resolve() != target.resolve():
            shutil.move(str(local_path), target)
        return f"{self.settings.public_api_url.rstrip('/')}/api/reels/{reel_id}/video"

    def thumbnail_url(self, reel_id: str) -> str:
        return f"{self.settings.public_api_url.rstrip('/')}/api/reels/{reel_id}/thumbnail"


def _check_id(reel_id: str) -> None:
    try:
        uuid.UUID(reel_id)
    except ValueError as e:  # blocks path traversal like "../x"
        raise KeyError(reel_id) from e


_store: Optional[ReelStore] = None


def get_store() -> ReelStore:
    global _store
    if _store is None:
        _store = ReelStore()
    return _store
