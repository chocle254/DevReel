"""End-to-end: API -> pipeline -> real ffmpeg -> MP4. Only the network pieces (GitHub, LLM) are faked."""
import json
import shutil
import time

import pytest
from fastapi.testclient import TestClient

from app import github, llm, media
from app.main import app
from app.models import PipelineError
from tests.test_units import make_repo

NARR = (
    "DevReel turns any public code repository into a short cinematic video that explains what the project is, "
    "why it matters, and how it works, so anyone can understand it in under two minutes."
)

UNDERSTANDING = {
    "name": "Demo",
    "one_liner": "A patient triage tool",
    "problem": "Clinics triage on paper.",
    "target_users": ["nurses"],
    "solution": "An API that scores urgency.",
    "features": [
        {"name": "Symptom triage", "description": "Scores patient urgency", "evidence": ["app/main.py", "nope.py"]},
        {"name": "Urgency alerts", "description": "Alerts doctors to urgent patients", "evidence": "README.md"},
        {"name": "Ghost feature", "description": "Not backed by files", "evidence": ["missing.py"]},
    ],
    "technology": [
        {"name": "FastAPI", "role": "API server", "evidence": ["requirements.txt"]},
        {"name": "Python", "role": "language", "evidence": ["app/main.py"]},
    ],
    "flow": {
        "nodes": [
            {"id": "Nurse", "label": "Nurse", "kind": "actor"},
            {"id": "api", "label": "API", "kind": "service"},
            {"id": "ai", "label": "AI Triage", "kind": "ai"},
            {"id": "doctor", "label": "Doctor", "kind": "actor"},
        ],
        "edges": [
            {"from": "nurse", "to": "api", "label": "symptoms"},
            {"source": "api", "target": "ai", "label": "score"},
            {"from": "ai", "to": "doctor", "label": "alert"},
        ],
    },
    "user_journey": ["enter symptoms", "see urgency"],
    "impact": "Faster care.",
}

STORY = {
    "title": "Demo In Motion",
    "tagline": "Triage that never waits",
    "summary": "Demo scores patient urgency. It alerts doctors fast.",
    "music_mood": "tech",
    "scenes": [
        {"type": "problem", "title": "The Problem", "headline": "Clinics triage on paper", "narration": NARR,
         "items": [{"label": "Long queues", "detail": "Patients wait"}, {"label": "No priority", "detail": "Urgent cases hide"}]},
        {"type": "flow", "title": "How It Works", "headline": "From symptoms to doctor", "narration": NARR,
         "nodes": [{"id": "nurse", "label": "Nurse", "kind": "actor"}, {"id": "api", "label": "API"}, {"id": "ai", "label": "AI Triage", "kind": "ai"}],
         "connections": [{"from": "nurse", "to": "api"}, {"from": "api", "to": "ai"}]},
        {"type": "feature", "title": "Key Features", "headline": "Built for urgency", "narration": NARR,
         "items": [{"label": "Symptom triage", "detail": "Scores urgency"}, {"label": "Urgency alerts", "detail": "Pings doctors"}, {"label": "Patient urgency view", "detail": "One screen"}]},
        {"type": "closing", "title": "Demo", "headline": "Care, in the right order.", "narration": NARR},
    ],
}

calls = []


@pytest.fixture
def client(tmp_path, monkeypatch):
    repo = make_repo(tmp_path)

    def fake_info(ref):
        if ref.repo == "missing":
            raise PipelineError("repo_not_found", "not found", True)
        return github.RepoInfo(size_kb=10, description="Triage for clinics")

    def fake_clone(ref, dest):
        shutil.copytree(repo, dest, symlinks=True)

    async def fake_chat(messages, *, temperature=0.3):
        user = messages[1]["content"]
        calls.append(user[:20])
        if user.startswith("PROJECT UNDERSTANDING"):
            return "<think>planning</think>\n```json\n" + json.dumps(STORY) + "\n```"
        return "Sure! Here you go:\n" + json.dumps(UNDERSTANDING)

    monkeypatch.setattr(github, "fetch_repo_info", fake_info)
    monkeypatch.setattr(github, "clone_repo", fake_clone)
    monkeypatch.setattr(llm, "chat", fake_chat)
    with TestClient(app) as c:
        yield c


def wait(client, rid, timeout=90):
    end = time.time() + timeout
    while time.time() < end:
        r = client.get(f"/api/reels/{rid}").json()
        if r["status"] in ("completed", "failed"):
            return r
        time.sleep(0.3)
    raise AssertionError("timed out")


def test_full_pipeline_produces_real_mp4(client):
    sid = {"X-Session-Id": "sess-1"}
    r = client.post("/api/reels", json={"repo_url": "https://github.com/me/demo"}, headers=sid)
    assert r.status_code == 202
    reel = r.json()
    assert reel["status"] == "queued" and reel["repo_name"] == "me/demo" and "rev" not in reel
    rid = reel["id"]

    reel = wait(client, rid)
    assert reel["status"] == "completed", reel.get("error")
    assert reel["progress"] == 100 and reel["error"] is None
    assert reel["title"] == "Demo In Motion" and len(reel["scenes"]) == 4
    assert [s["index"] for s in reel["scenes"]] == [0, 1, 2, 3]
    assert all(s["duration_seconds"] >= 5 for s in reel["scenes"])
    # grounding: ghost feature dropped, string evidence normalised, nonexistent paths removed
    feats = {f["name"]: f["evidence"] for f in reel["understanding"]["features"]}
    assert "Ghost feature" not in feats and feats["Symptom triage"] == ["app/main.py"] and feats["Urgency alerts"] == ["README.md"]
    assert reel["chart"]["nodes"][0]["id"] == "nurse" and reel["chart"]["edges"][0]["from"] == "nurse"
    assert reel["music_track"] == "tech_01"
    assert reel["video_url"] == f"http://testserver/api/reels/{rid}/video"
    assert reel["thumbnail_url"].endswith("/thumbnail")
    assert any("Rendered scene 4 of 4" in l["message"] for l in reel["logs"])
    assert not (client.app and False)

    # video is a real, valid, correctly sized MP4 with video+audio
    v = client.get(f"/api/reels/{rid}/video")
    assert v.status_code == 200 and v.headers["content-type"] == "video/mp4"
    from app.store import get_store

    path = get_store().video_path(rid)
    dur = media.probe_duration(path)
    assert abs(dur - reel["duration_seconds"]) < 0.5 and dur == pytest.approx(sum(s["duration_seconds"] for s in reel["scenes"]), abs=1.0)
    probe = media.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height", "-of", "json", str(path)])
    streams = {s["codec_type"]: s for s in json.loads(probe.stdout)["streams"]}
    assert streams["video"]["codec_name"] == "h264" and streams["video"]["width"] == 640
    assert streams["audio"]["codec_name"] == "aac"

    # range requests (seeking) and thumbnail
    rng = client.get(f"/api/reels/{rid}/video", headers={"Range": "bytes=0-99"})
    assert rng.status_code == 206 and len(rng.content) == 100
    assert client.get(f"/api/reels/{rid}/thumbnail").headers["content-type"] == "image/jpeg"

    # temp work dir cleaned up
    assert not (get_store().reel_dir(rid) / "work").exists()

    # list is session scoped
    assert [x["id"] for x in client.get("/api/reels", headers=sid).json()["reels"]] == [rid]
    assert client.get("/api/reels", headers={"X-Session-Id": "other"}).json()["reels"] == []
    assert "scenes" not in client.get("/api/reels", headers=sid).json()["reels"][0]

    # SSE on a finished reel: one state event, then the stream closes
    with client.stream("GET", f"/api/reels/{rid}/events") as s:
        body = "".join(s.iter_text())
    assert body.startswith("event: state\ndata: ") and '"status": "completed"' in body

    # render access: token required
    from app.security import make_render_token

    tok = make_render_token(rid)
    assert client.get(f"/api/render/{rid}/scenes/1").status_code == 403
    assert client.get(f"/api/render/{rid}/scenes/1?token=bad").status_code == 403
    one = client.get(f"/api/render/{rid}/scenes/1?token={tok}").json()
    assert one["index"] == 1 and one["total"] == 4 and one["scene"]["type"] == "flow" and one["width"] == 640
    assert one["scene"]["connections"][0] == {"from": "nurse", "to": "api", "label": ""}
    assert len(client.get(f"/api/render/{rid}/scenes?token={tok}").json()["scenes"]) == 4
    assert client.get(f"/api/render/{rid}/scenes/9?token={tok}").status_code == 404

    # regenerate keeps the original and makes a new reel
    again = client.post(f"/api/reels/{rid}/regenerate").json()
    assert again["id"] != rid and again["repo_url"] == reel["repo_url"] and again["session_id"] == "sess-1"
    assert wait(client, again["id"])["status"] == "completed"
    assert client.get(f"/api/reels/{rid}").json()["status"] == "completed"

    # delete removes metadata + media
    assert client.delete(f"/api/reels/{rid}").json() == {"deleted": True}
    assert client.get(f"/api/reels/{rid}").status_code == 404
    assert not get_store().reel_dir(rid).exists()


def test_validation_and_user_errors(client):
    r = client.post("/api/reels", json={"repo_url": "https://example.com/x/y"})
    assert r.status_code == 400 and r.json()["error"] == {
        "code": "invalid_url", "message": r.json()["error"]["message"], "user_solvable": True}
    assert client.post("/api/reels", json={}).status_code == 400
    assert client.get("/api/reels/not-a-uuid").status_code == 404
    assert client.get("/api/reels/00000000-0000-0000-0000-000000000000/video").status_code == 404

    rid = client.post("/api/reels", json={"repo_url": "https://github.com/me/missing"}).json()["id"]
    reel = wait(client, rid)
    assert reel["status"] == "failed" and reel["error"]["code"] == "repo_not_found" and reel["error"]["user_solvable"]
    assert reel["video_url"] is None
    assert client.get(f"/api/reels/{rid}/video").status_code == 404
    with client.stream("GET", f"/api/reels/{rid}/events") as s:
        assert '"status": "failed"' in "".join(s.iter_text())


def test_ai_garbage_fails_cleanly_after_one_retry(client, monkeypatch):
    n = {"c": 0}

    async def bad_chat(messages, *, temperature=0.3):
        n["c"] += 1
        return "I cannot help with that."

    monkeypatch.setattr(llm, "chat", bad_chat)
    rid = client.post("/api/reels", json={"repo_url": "https://github.com/me/demo"}).json()["id"]
    reel = wait(client, rid)
    assert reel["status"] == "failed" and reel["error"]["code"] == "ai_failed" and not reel["error"]["user_solvable"]
    assert n["c"] == 2  # first attempt + exactly one controlled retry
    assert reel["video_url"] is None and reel["progress"] < 100
