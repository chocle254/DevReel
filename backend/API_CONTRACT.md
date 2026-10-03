# DevReel — Frontend ↔ Backend Contract (v1)

Backend: FastAPI. Frontend backend URL = `VITE_API_URL` (local backend: `http://localhost:8000`).
All JSON. All timestamps ISO-8601 UTC. Every API route is under `/api`.

## 0. Session

The browser creates `session_id` (uuid) in localStorage and sends it as header
`X-Session-Id` on `POST /api/reels` and `GET /api/reels`.
`GET /api/reels/{id}`, the SSE stream, video and thumbnail need no header (the reel id is an unguessable uuid, and `EventSource`/`<video>` cannot set headers).

## 1. Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/health/deep` | Setup check (ffmpeg, Chromium, LLM key, frontend reachable). Open it in a browser after deploying |
| POST | `/api/reels` | Start a generation. Body `{ "repo_url": "https://github.com/owner/repo" }` → `202` with a **Reel** (status `queued`) |
| GET | `/api/reels` | List this session's reels (newest first) → `{ "reels": [ReelSummary] }` |
| GET | `/api/reels/{id}` | Full **Reel** (polling fallback / reconnect state) |
| GET | `/api/reels/{id}/events` | **SSE** live progress (see §4) |
| GET | `/api/reels/{id}/video` | The MP4 (supports Range → seeking works). `404` until completed |
| GET | `/api/reels/{id}/thumbnail` | JPEG |
| DELETE | `/api/reels/{id}` | Delete reel + media → `{ "deleted": true }`. `409 in_progress` while it is still generating |
| POST | `/api/reels/{id}/regenerate` | New generation for the same repo → `202` new **Reel** (the original is kept) |
| GET | `/api/render/{id}/scenes?token=…` | **Render-only.** All scenes (see §5) |
| GET | `/api/render/{id}/scenes/{index}?token=…` | **Render-only.** One scene (see §5) |

Error responses (any non-2xx): `{ "error": { "code": "invalid_url", "message": "Human readable", "user_solvable": true } }`.

Request validation errors at submit time: `400 invalid_url`, `429 busy` (queue full).

## 2. Reel object

```json
{
  "id": "uuid",
  "session_id": "uuid",
  "repo_url": "https://github.com/owner/repo",
  "repo_name": "owner/repo",
  "status": "queued | analyzing | planning | generating_narration | selecting_music | rendering | assembling | uploading | completed | failed",
  "stage_label": "Understanding the project",
  "progress": 0,
  "title": null,
  "tagline": null,
  "summary": null,
  "understanding": null,
  "scenes": [],
  "chart": null,
  "music_track": null,
  "video_url": null,
  "thumbnail_url": null,
  "duration_seconds": null,
  "error": null,
  "logs": [ { "ts": "2026-10-03T09:00:00Z", "level": "info", "message": "Cloned repository (412 files)" } ],
  "created_at": "…",
  "updated_at": "…"
}
```

* `progress` is 0–100 and only moves forward.
* `title/tagline/summary/understanding/scenes/chart` fill in as the job advances (null/[] before). Do not assume they exist until `planning` has passed.
* `video_url` / `thumbnail_url` are absolute URLs, set only when `status == "completed"`.
* `error` (only when `failed`): `{ "code": "...", "message": "...", "user_solvable": true|false }`.
  * User-solvable codes: `invalid_url`, `repo_not_found` (missing or private), `repo_too_large`, `repo_empty`.
  * Internal codes: `analysis_failed`, `ai_failed`, `narration_failed`, `render_failed`, `assembly_failed`, `internal`.
  * Never show a reel player when `status != "completed"`.
* `ReelSummary` = same object without `understanding`, `scenes`, `logs`.

### Stage → label → progress (what the generation screen can show)

| status | stage_label | progress range |
|---|---|---|
| queued | Waiting in queue | 0 |
| analyzing | Understanding the project | 3–30 |
| planning | Building the story | 30–45 |
| generating_narration | Generating narration | 45–58 |
| selecting_music | Selecting music | 58–62 |
| rendering | Rendering scenes | 62–88 |
| assembling | Assembling the reel | 88–96 |
| uploading | Finishing up | 96–99 |
| completed | Done | 100 |

Use `logs` (append-only, newest last) for the live activity area.

### understanding / chart

```json
"understanding": {
  "name": "CivCare",
  "one_liner": "…",
  "problem": "…",
  "target_users": ["…"],
  "solution": "…",
  "features": [ { "name": "…", "description": "…", "evidence": ["backend/app/triage.py"] } ],
  "technology": [ { "name": "FastAPI", "role": "API server", "evidence": ["requirements.txt"] } ],
  "flow": { "nodes": [ChartNode], "edges": [ChartEdge] },
  "user_journey": ["…"],
  "impact": "…"
}
"chart": { "nodes": [ { "id": "api", "label": "FastAPI", "kind": "service" } ],
           "edges": [ { "from": "user", "to": "api", "label": "request" } ] }
```
`kind` ∈ `actor | ui | service | ai | database | external`. `chart` is the project chart for the expandable chart UI.

## 3. Scene object (the renderer's input)

```json
{
  "index": 0,
  "type": "problem | solution | flow | feature | technology | impact | closing",
  "title": "The Problem",
  "headline": "Clinics in Kenya triage patients on paper.",
  "items": [ { "label": "Long queues", "detail": "Patients wait hours before anyone assesses urgency." } ],
  "nodes": [ { "id": "patient", "label": "Patient", "kind": "actor" } ],
  "connections": [ { "from": "patient", "to": "app", "label": "symptoms" } ],
  "narration": "Full voiceover text for this scene.",
  "duration_seconds": 11.4
}
```

Per type (what the backend guarantees; unused arrays are `[]`):

| type | headline | items | nodes/connections |
|---|---|---|---|
| problem | yes | 2–3 pain points | `[]` |
| solution | yes | 0–3 | `[]` |
| flow | yes | `[]` | 3–7 nodes, ≥ nodes−1 connections; every `from`/`to` is a node id |
| feature | yes | 3–4 features (`label` = name, `detail` = one line) | `[]` |
| technology | yes | 3–6 (`label` = tech, `detail` = role) | `[]` |
| impact | yes | 2–3 | `[]` |
| closing | yes (final pitch) | `[]` | `[]` |

MVP default enabled types: `problem, flow, feature, closing`. Build these four first; the other three can come later with no contract change.
Text lengths the AI is told to follow: `title` ≤ 6 words, `headline` ≤ 16 words, item `label` ≤ 5 words, item `detail` ≤ 14 words, node `label` ≤ 3 words. The backend only enforces slightly looser caps (title ≤ 8, headline ≤ 20, label ≤ 7, detail ≤ 18), so the renderer must wrap or shrink text instead of assuming the tighter numbers.

`duration_seconds` is final (already matches the narration audio). The scene animation must take about this long.

## 4. SSE — `GET /api/reels/{id}/events`

```
event: state
data: { …full Reel object… }
```
* Sent immediately on connect (so a refresh/reconnect restores state), then on every change.
* A `: ping` comment every 15 s.
* After a terminal state (`completed`/`failed`) the server sends the final `state` event, then closes the stream. **The client must call `eventSource.close()` when it receives a terminal status**, otherwise `EventSource` will reconnect forever.
* If the connection drops, `EventSource` reconnects on its own and receives a fresh `state`. `GET /api/reels/{id}` is the polling fallback.

CORS: backend allows the origins in `FRONTEND_ORIGINS`.

## 5. Render route (used by Playwright — frontend must implement)

Frontend route: **`/render/:reelId/:sceneIndex?token=…`** (Vite/React route, no app chrome/navigation).

Flow:
1. Playwright opens `{FRONTEND_URL}/render/{reelId}/{sceneIndex}?token={token}`.
2. Page calls `GET {API}/api/render/{reelId}/scenes/{sceneIndex}?token={token}` → 

```json
{ "reel_id": "…", "title": "…", "index": 2, "total": 4,
  "scene": { …Scene… }, "width": 1280, "height": 720 }
```
3. Page renders the scene full-viewport at exactly `width × height` (1280×720), no scrollbars, no cursor, transparent-free solid background.
4. **When fonts, images and initial state are ready, the page sets `window.__DEVREEL_READY__ = true` and starts the scene animation timeline at that same moment (t = 0).** The backend records from the moment the flag flips, for `scene.duration_seconds`.
5. The animation should be deterministic (CSS/SVG/Framer timings only, no randomness, no network after ready) and should finish by about `duration_seconds` (a calm hold on the final frame is fine).
6. Invalid/expired token → backend returns `403`; the page should show a plain error, never set the ready flag.

Tokens are short-lived (15 min) and signed by the backend; the frontend only forwards what is in the URL.

`GET /api/render/{id}/scenes` returns `{ "reel_id", "title", "total", "scenes": [Scene], "width", "height" }` if useful for previews.

## 6. Dev conveniences

* `CAPTURE_MODE=mock` on the backend produces placeholder clips without needing the frontend render route, so the full job lifecycle (and the player) can be built before the renderer exists.
* `GET /api/reels/{id}` works at every stage; use it to debug.
