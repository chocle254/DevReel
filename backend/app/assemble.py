"""Stage 6: FFmpeg assembly — scene clips + narration + ducked music -> one MP4 (+ thumbnail)."""
from __future__ import annotations

import logging
from pathlib import Path

from .config import get_settings
from .media import ffmpeg, probe_duration
from .models import PipelineError, Scene

log = logging.getLogger("devreel")


def _pad_narration(src: Path, scene: Scene, out: Path) -> None:
    """Delay narration slightly (lead-in), pad with silence to the exact scene length."""
    s = get_settings()
    lead_ms = int(s.scene_lead_seconds * 1000)
    ffmpeg(
        [
            "-i", str(src),
            "-af", f"adelay={lead_ms}|{lead_ms},apad=whole_dur={scene.duration_seconds:.3f},aresample=48000",
            "-t", f"{scene.duration_seconds:.3f}", "-ac", "2", "-c:a", "pcm_s16le", str(out),
        ]
    )


def _concat_list(paths: list[Path], listing: Path) -> None:
    listing.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in paths), encoding="utf-8")


def assemble(
    scenes: list[Scene],
    clips: list[Path],
    narrations: list[Path],
    music: Path,
    work: Path,
    final_path: Path,
    thumb_path: Path,
) -> float:
    """Blocking. Returns the final duration in seconds."""
    s = get_settings()
    work.mkdir(parents=True, exist_ok=True)
    try:
        # 1. video: all clips share codec/size/fps, so a concat copy is exact and fast
        vlist = work / "video.txt"
        _concat_list(clips, vlist)
        video = work / "video_all.mp4"
        ffmpeg(["-f", "concat", "-safe", "0", "-i", str(vlist), "-c", "copy", str(video)])

        # 2. narration track, scene-aligned
        padded: list[Path] = []
        for sc, n in zip(scenes, narrations):
            out = work / f"narr_pad_{sc.index}.wav"
            _pad_narration(n, sc, out)
            padded.append(out)
        alist = work / "audio.txt"
        _concat_list(padded, alist)
        narration = work / "narration_all.wav"
        ffmpeg(["-f", "concat", "-safe", "0", "-i", str(alist), "-c", "copy", str(narration)])

        total = sum(sc.duration_seconds for sc in scenes)
        fade_out_at = max(total - 2.0, 0)

        # 3. mix: looped music, ducked under narration, faded in/out
        fc = (
            f"[2:a]volume={s.music_volume},atrim=0:{total:.3f},asetpts=PTS-STARTPTS,"
            f"afade=t=in:d=1.5,afade=t=out:st={fade_out_at:.3f}:d=2[m];"
            "[1:a]asplit=2[n][side];"
            "[m][side]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=500[mduck];"
            "[n][mduck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]"
        )
        final_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = work / "final_tmp.mp4"
        ffmpeg(
            [
                "-i", str(video), "-i", str(narration), "-stream_loop", "-1", "-i", str(music),
                "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}",
                "-movflags", "+faststart", str(tmp),
            ],
            timeout=900,
        )

        # 4. validate before we ever claim success
        dur = probe_duration(tmp)
        if dur < 3 or abs(dur - total) > 1.5 or tmp.stat().st_size < 10_000:
            raise PipelineError("assembly_failed", "The assembled video failed validation. Please try again.", False)
        tmp.replace(final_path)

        # 5. thumbnail from ~30% in
        ffmpeg(
            ["-ss", f"{dur * 0.3:.2f}", "-i", str(final_path), "-frames:v", "1", "-q:v", "3", str(thumb_path)]
        )
        return round(dur, 2)
    except PipelineError:
        raise
    except Exception as e:
        log.error("assembly failed: %s", e)
        raise PipelineError("assembly_failed", "We couldn't assemble the final video. Please try again.", False) from e
