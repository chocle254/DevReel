# DevReel Backend

FastAPI service that turns a public GitHub repo into a narrated, animated MP4.

```
GitHub URL → clone + scan (never executes repo code) → Nemotron: grounded understanding
→ story + typed scene JSON (quality gate, one retry) → TTS narration (sets scene lengths)
→ music → Playwright records the frontend's /render routes → FFmpeg mix → reel.mp4
```

Contract with the frontend: **[API_CONTRACT.md](API_CONTRACT.md)** (source of truth).

## Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium          # only needed for CAPTURE_MODE=playwright
cp .env.example .env                 # fill LLM_API_KEY and RENDER_SECRET
uvicorn app.main:app --reload --port 8000
```
Needs `ffmpeg`, `ffprobe` and `git` on PATH.

* `CAPTURE_MODE=mock` makes placeholder clips, so the whole lifecycle (progress, player, storage) works before the frontend renderer exists.
* Open `/api/health/deep` to see exactly what is missing.

## Deploy (Railway)

1. New service from this repo, root directory `backend/` (it has a `Dockerfile`).
2. Add a **volume** mounted at `/data` and set `OUTPUT_DIR=/data/outputs` (otherwise reels vanish on redeploy).
3. Set the variables from `.env.example`: `LLM_API_KEY`, `RENDER_SECRET`, `PUBLIC_API_URL` (the Railway URL), `FRONTEND_URL` and `FRONTEND_ORIGINS` (the Vercel URL).
4. Give it enough memory for Chromium + FFmpeg (1–2 GB).
5. Open `https://<railway-url>/api/health/deep` and make sure every check is `ok`.

## Layout

```
app/main.py          routes, SSE, render access
app/pipeline.py      job lifecycle + progress
app/github.py        URL validation, GitHub pre-check, safe shallow clone
app/scanner.py       bounded evidence bundle (ignores binaries/symlinks/lockfiles, redacts secrets)
app/llm.py           OpenAI-compatible client, JSON extraction, one validated retry
app/understanding.py grounded project understanding (evidence paths verified against the repo)
app/story.py         story + scene JSON and the quality gate
app/tts.py           narration (edge-tts) and scene timing
app/music.py         curated catalog; synthesised placeholder pads if no real track
app/capture.py       Playwright capture (+ mock mode)
app/assemble.py      FFmpeg concat, ducked mix, validation, thumbnail
app/store.py         file-backed reels; store_video() is the one hook for cloud storage
tests/               unit + end-to-end tests
```

## Tests

```bash
pip install -r requirements-dev.txt
pytest -q
```
The end-to-end test runs the real pipeline (real FFmpeg, real file storage, real API) with only GitHub and the LLM faked, and asserts a valid H.264 + AAC MP4 comes out.

## Honest status

Verified by tests: URL validation, safe clone + scan (verified on a real public repo), grounding and story gate, API + SSE + Range video, render tokens, FFmpeg trim/mix/validation, failure paths, regenerate/delete.

**Not verified yet (needs your keys / the frontend):**
* Real calls to NVIDIA Nemotron (check the model id in `.env`, `LLM_MODEL`).
* Real `edge-tts` voices (needs internet from the server).
* Playwright capture against the real frontend renderer. The trim/encode step is tested on a synthetic recording, but the browser step needs the `/render/...` page and `window.__DEVREEL_READY__` from the frontend.
* NVIDIA TTS is not implemented (request shape unverified). `edge` is the default.

## Music

Without real tracks the backend generates simple ambient placeholder pads. For the demo, download 4 royalty-free tracks (Pixabay) and save them in `music/` with the names in `music/catalog.json` (`cinematic_01.mp3`, `uplifting_01.mp3`, `tech_01.mp3`, `calm_01.mp3`). Note: `.gitignore` ignores `music/*.mp3` except `real_*.mp3`; rename the catalog `file` entries to `real_*.mp3` or remove that rule.
