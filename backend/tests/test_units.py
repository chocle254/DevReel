import os
import time

import pytest

from app import scanner, security, story
from app.github import parse_repo_url
from app.models import PipelineError, Understanding


def test_parse_repo_url_ok():
    for raw in [
        "https://github.com/chocle254/devreel",
        "http://github.com/chocle254/devreel/",
        "github.com/chocle254/devreel.git",
        "https://www.github.com/chocle254/devreel/tree/main/backend",
    ]:
        ref = parse_repo_url(raw)
        assert ref.name == "chocle254/devreel"
        assert ref.url == "https://github.com/chocle254/devreel"


@pytest.mark.parametrize(
    "raw",
    ["", "not a url", "https://gitlab.com/a/b", "https://github.com/onlyowner", "https://github.com/../x", "file:///etc/passwd",
     "https://github.com/a/b; rm -rf /", "https://evil.com/github.com/a/b"],
)
def test_parse_repo_url_rejects(raw):
    with pytest.raises(PipelineError) as e:
        parse_repo_url(raw)
    assert e.value.code == "invalid_url" and e.value.user_solvable


def test_render_token_roundtrip_and_tamper():
    rid = "11111111-1111-1111-1111-111111111111"
    tok = security.make_render_token(rid)
    assert security.verify_render_token(rid, tok)
    assert not security.verify_render_token("22222222-2222-2222-2222-222222222222", tok)
    assert not security.verify_render_token(rid, tok[:-2] + "00")
    assert not security.verify_render_token(rid, None)
    assert not security.verify_render_token(rid, "garbage")
    expired = f"{int(time.time()) - 5}.{security._sig(rid, int(time.time()) - 5)}"
    assert not security.verify_render_token(rid, expired)


def make_repo(tmp_path):
    r = tmp_path / "repo"
    (r / "app").mkdir(parents=True)
    (r / "node_modules" / "x").mkdir(parents=True)
    (r / "README.md").write_text("# Demo\nA triage tool. key = sk-abcdefghijklmnopqrstuvwxyz123456\n")
    (r / "requirements.txt").write_text("fastapi\nuvicorn\n")
    (r / "app" / "main.py").write_text("from fastapi import FastAPI\napp = FastAPI()\n")
    (r / "node_modules" / "x" / "index.js").write_text("module.exports = 1")
    (r / "logo.png").write_bytes(b"\x89PNG\r\n\x00\x00")
    (r / "blob.dat").write_bytes(b"\x00" * 100)
    (r / "big.py").write_text("x = 1\n" * 100_000)  # > max_file_kb
    (r / ".env").write_text("SECRET_TOKEN=abcdefghijklmnop1234")
    (r / "poetry.lock").write_text("lock")
    os.symlink("/etc/passwd", r / "link.txt")
    return r


def test_scanner_filters_and_redacts(tmp_path):
    ev = scanner.scan_repo(make_repo(tmp_path), "me/demo")
    paths = {f.path for f in ev.files}
    assert {"README.md", "requirements.txt", "app/main.py"} <= paths
    assert not any("node_modules" in p for p in ev.all_paths)
    assert "logo.png" not in ev.all_paths and "link.txt" not in ev.all_paths
    assert ".env" not in paths and "big.py" not in paths and "poetry.lock" not in ev.all_paths
    readme = next(f for f in ev.files if f.path == "README.md")
    assert "sk-abcdef" not in readme.content and "[REDACTED]" in readme.content
    assert "Python" in ev.languages
    text = ev.render()
    assert "FILE TREE" in text and "=== FILE: app/main.py" in text
    assert "/etc/passwd" not in text


def test_scanner_empty_repo(tmp_path):
    (tmp_path / "e").mkdir()
    (tmp_path / "e" / "a.png").write_bytes(b"\x00")
    with pytest.raises(PipelineError) as e:
        scanner.scan_repo(tmp_path / "e", "x/y")
    assert e.value.code == "repo_empty"


def _und():
    return Understanding.model_validate(
        {
            "name": "Demo", "one_liner": "x", "problem": "p", "solution": "s",
            "features": [{"name": "Symptom triage", "description": "Scores patient urgency", "evidence": ["a"]}],
            "flow": {"nodes": [], "edges": []},
        }
    )


def _plan(types, **over):
    scenes = []
    nar = " ".join(["word"] * 20)
    for t in types:
        sc = {"type": t, "title": "T", "headline": "A headline here", "narration": nar, "items": [], "nodes": [], "connections": []}
        if t == "problem":
            sc["items"] = [{"label": "a", "detail": "b"}, {"label": "c", "detail": "d"}]
        if t == "flow":
            sc["nodes"] = [{"id": "User", "label": "User", "kind": "actor"}, {"id": "api", "label": "API"}, {"id": "db", "label": "DB", "kind": "database"}]
            sc["connections"] = [{"from": "user", "to": "api"}, {"from": "api", "to": "db"}, {"from": "ghost", "to": "db"}]
        if t == "feature":
            sc["items"] = [{"label": "Symptom triage", "detail": "urgency"}, {"label": "Urgency scoring", "detail": "patient"}, {"label": "Triage alerts", "detail": "x"}]
        scenes.append(sc)
    raw = {"title": "Demo Reel", "tagline": "t", "summary": "s", "music_mood": "tech", "scenes": scenes}
    raw.update(over)
    return raw


def test_story_repair_and_gate_accepts_good_plan():
    from app.models import StoryPlan

    types = ["problem", "flow", "feature", "closing"]
    raw = _plan(["closing", "feature", "flow", "problem", "problem", "technology"])  # wrong order, dupes, disabled type
    raw = story._make_repair(types)(raw)
    assert [s["type"] for s in raw["scenes"]] == types
    flow = next(s for s in raw["scenes"] if s["type"] == "flow")
    assert [n["id"] for n in flow["nodes"]] == ["user", "api", "db"]  # ids normalised
    assert len(flow["connections"]) == 2  # dangling 'ghost' edge dropped
    plan = StoryPlan.model_validate(raw)
    assert story._gate(plan, types, _und()) == []


def test_story_gate_flags_problems():
    from app.models import StoryPlan

    types = ["problem", "flow", "feature", "closing"]
    raw = story._make_repair(types)(_plan(types))
    raw["scenes"][0]["narration"] = "too short"
    raw["scenes"][2]["items"] = [{"label": "Blockchain", "detail": "quantum"}] * 3
    raw["scenes"][3]["narration"] = " ".join(["word"] * 20) + " see https://x.com"
    problems = story._gate(StoryPlan.model_validate(raw), types, _und())
    joined = " | ".join(problems)
    assert "narration is 2 words" in joined
    assert "do not invent features" in joined
    assert "plain speech" in joined


def test_encode_clip_trims_load_time_and_pads(tmp_path):
    """Covers the Playwright post-processing step with a synthetic VP8 'recording'."""
    from app import capture, media

    webm = tmp_path / "rec.webm"
    media.ffmpeg(["-f", "lavfi", "-i", "testsrc=size=800x450:rate=25:duration=6", "-c:v", "libvpx", "-b:v", "1M", str(webm)])
    out = tmp_path / "clip.mp4"
    capture._encode_clip(webm, 1.5, 4.0, out)  # drop 1.5s load, keep 4.0s
    assert media.duration_ok(out, 4.0) if hasattr(media, "duration_ok") else abs(media.probe_duration(out) - 4.0) < 0.15
    # recording shorter than requested: last frame is held so the clip still reaches full length
    short = tmp_path / "short.webm"
    media.ffmpeg(["-f", "lavfi", "-i", "testsrc=size=800x450:rate=25:duration=3", "-c:v", "libvpx", str(short)])
    out2 = tmp_path / "clip2.mp4"
    capture._encode_clip(short, 1.0, 5.0, out2)
    assert abs(media.probe_duration(out2) - 5.0) < 0.2
    p = media.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height,pix_fmt,r_frame_rate", "-of", "csv=p=0", str(out)])
    assert "640,360,yuv420p,30/1" in p.stdout


def test_health_deep():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        d = c.get("/api/health/deep").json()
    assert d["capture_mode"] == "mock" and d["checks"]["ffmpeg"]["ok"] and d["checks"]["capture"]["ok"]
    assert "test-key" not in str(d)
