---
doc: spec
status: draft
---

# DevReel Technical Specification

> Turn your code into a story worth watching.

## 1. How This Works, In Plain Language

DevReel takes a public GitHub repository and turns the software inside it into a short cinematic project explanation.

The system does not simply read the README or record somebody clicking around the application. The backend inspects the actual repository as source material, identifies the project's purpose, important features, technical components, and how information moves through the system.

That understanding is passed to an AI model which creates a structured story and visual plan.

The frontend contains a deterministic animation renderer. Rather than asking an AI video model to generate arbitrary video, DevReel converts the structured scene plan into controlled React/HTML/SVG animations.

A browser controlled by Playwright captures those animations as video.

The backend combines the scene videos with AI-generated narration and a selected background-music track using FFmpeg.

The finished MP4 is uploaded to Backblaze B2 and its metadata is stored in Supabase/Postgres.

The user sees the finished reel through the Next.js frontend.

Core pipeline:

GitHub Repository
→ Repository Analysis
→ Project Understanding
→ Story + Visual Plan
→ Structured Scene Specification
→ Browser Animation
→ Video Capture
→ Narration + Music
→ FFmpeg Assembly
→ Backblaze B2
→ Reel Player

**AI decides what should be communicated. DevReel decides how that communication is rendered.**

This keeps output visually consistent while allowing the story to change depending on the project.

## 2. Core Journey Through the System

### 2.1 Dashboard

The Next.js frontend loads the user's anonymous session and requests reels associated with that session.

The dashboard displays:
- Existing generated reels.
- Project name/title.
- Short project description.
- Generation status.
- Thumbnail where available.
- Date created.
- New Reel action.
- Empty state when no reels exist.

No account system is required for the proof of concept.

The browser generates a random `session_id` and stores it in `localStorage`.

This is a proof-of-concept convenience rather than production-grade authentication.

### 2.2 Create a New Reel

The user selects **New Reel**.

The frontend displays one field:

```
GitHub Repository URL
```

The frontend sends:

```
POST /api/reels
```

with:

```json
{
  "repo_url": "https://github.com/example/project",
  "session_id": "anonymous-session-id"
}
```

The backend validates the URL, creates a reel generation job, and returns a reel/job ID.

The frontend then moves to the generation screen.

No presentation preferences are required in the PoC.

### 2.3 Repository Analysis

The backend receives the public GitHub URL and clones the repository into an isolated temporary workspace.

The repository is treated as untrusted source material.

DevReel does **not** execute the submitted repository. It must not run the project's application, install its dependencies, run repository tests, execute repository shell scripts, or execute user-provided build commands.

Instead, DevReel reads relevant source files as text.

The scanner:
1. Parses the GitHub repository URL.
2. Clones the repository with limited depth.
3. Builds a file tree.
4. Ignores `.git`, dependency directories, build output, caches, binaries, and irrelevant files.
5. Applies repository, file-count, and file-size limits.
6. Selects relevant source/configuration files.
7. Extracts useful summaries from those files.
8. Passes structured evidence to the AI analysis stage.

Examples of useful files include `package.json`, `requirements.txt`, `pyproject.toml`, `README.md`, application routes, components, API modules, database models, schemas, and configuration files.

### 2.4 Project Understanding

Repository evidence is processed into a structured project-understanding object.

The understanding stage identifies:
- Project name.
- Purpose.
- Problem.
- Target users.
- Solution.
- Important features.
- User journey.
- Major technical components.
- Data/API flow.
- Technology stack.
- Important relationships.
- Evidence supporting important claims.

Conceptual output:

```json
{
  "project_name": "Example Project",
  "problem": "Users struggle to...",
  "solution": "The application...",
  "target_users": ["..."],
  "features": ["..."],
  "technology": ["Next.js", "Python", "PostgreSQL"],
  "flow": ["User", "Frontend", "API", "AI Model", "Database"],
  "evidence": [
    {
      "path": "app/page.tsx",
      "summary": "Main user interface..."
    }
  ]
}
```

Claims should be grounded in repository evidence rather than invented functionality.

### 2.5 Story and Visual Planning

Project understanding is passed to a planning stage.

The planner converts technical understanding into a short project story, normally covering:
1. Problem.
2. Solution.
3. How it works.
4. Important features.
5. Technology.
6. Impact/outcome.
7. Closing.

The exact number and ordering of scenes can change depending on the project.

Each scene has one primary communication goal.

The AI produces structured scene data rather than arbitrary HTML or video instructions.

Example:

```json
{
  "type": "flow",
  "title": "How CivCare Works",
  "duration": 8,
  "nodes": ["Patient", "CivCare", "AI Triage", "Doctor"],
  "connections": [
    ["Patient", "CivCare"],
    ["CivCare", "AI Triage"],
    ["AI Triage", "Doctor"]
  ],
  "narration": "CivCare connects patients to..."
}
```

### 2.6 Story Quality Gate

Before rendering, a lightweight quality check verifies:
- Claims are supported by repository evidence.
- The story represents the actual project.
- The sequence is understandable.
- Scenes are not overloaded.
- Important project flow is represented.
- Narration matches visual content.
- The scene specification conforms to its schema.

If the plan fails validation, the backend can regenerate or revise the plan once.

This does not guarantee literal perfection; it prevents an unconstrained AI response from becoming the visual program.

### 2.7 Scene Rendering

The Next.js frontend contains dedicated rendering routes for DevReel scenes.

Conceptually:

```
/render/{reel_id}/{scene_index}
```

The renderer receives a validated scene specification and converts it into deterministic React/HTML/SVG animation.

Reusable scene types include:
- `ProblemScene`
- `SolutionScene`
- `FlowScene`
- `FeatureScene`
- `TechnologyScene`
- `ImpactScene`
- `ClosingScene`

The renderer controls typography, layout, cards, icons/shapes, nodes, connections, arrows, timelines, code fragments, progressive reveals, and transitions.

The AI does not generate arbitrary frontend code.

The flow is:

```
AI Scene JSON
→ Validated Scene Model
→ Known Renderer Component
→ Animated Browser Scene
```

### 2.8 Browser Capture

Railway runs Playwright with Chromium.

Playwright opens the deployed DevReel rendering route at a fixed viewport.

The browser waits for:

```javascript
window.__DEVREEL_READY__ = true
```

before recording.

The renderer sets this flag only after fonts, assets, scene data, and initial animation state are ready.

Each scene is recorded at a fixed final-video viewport.

Temporary scene recordings are stored on the Railway worker filesystem and passed to FFmpeg.

### 2.9 Narration

Generated story scenes contain narration text.

The backend sends narration to the selected NVIDIA text-to-speech service.

Generated audio is saved temporarily.

The backend measures generated audio duration so visual duration and narration can remain synchronized.

The exact TTS request shape will be verified during implementation against the current NVIDIA API documentation.

### 2.10 Background Music

The PoC uses a small curated catalog of royalty-free music tracks.

Tracks are pre-selected rather than dynamically searched during every generation.

Each track has metadata such as:

```json
{
  "id": "cinematic_01",
  "mood": "cinematic",
  "energy": "medium",
  "source": "Pixabay",
  "file": "music/cinematic_01.mp3"
}
```

The AI selects an appropriate track based on the story mood.

Music is mixed underneath narration at a lower volume.

Sound effects are intentionally deferred from the PoC.

### 2.11 Video Assembly

FFmpeg assembles:

```
Scene 1
+
Scene 2
+
Scene 3
+
...
+
Narration
+
Background Music
```

into a single MP4.

FFmpeg handles scene concatenation, audio mixing, music volume reduction, encoding, and final output validation.

The backend verifies that the final file exists and has a valid duration before marking the reel complete.

### 2.12 Storage

Completed media is uploaded to Backblaze B2.

Example object structure:

```
reels/
  {session_id}/
    {reel_id}/
      final.mp4
      thumbnail.webp
      narration.wav
      music.mp3
```

Permanent storage can be limited to the final video and thumbnail. Intermediate scene files should normally be deleted after successful assembly.

### 2.13 Reel Player

After successful generation, the frontend navigates to the reel page.

The page displays:
- Video player.
- Project title.
- Project summary.
- Relevant project information.
- Playback controls.
- Playback speed.
- Fullscreen.
- Expandable project connection chart.

The chart uses the same structured relationships generated during analysis, so it is not a separate manually-created illustration.

### 2.14 Generation Progress

Generation is long-running and does not happen inside the normal frontend request.

The frontend creates a job and subscribes to:

```
GET /api/reels/{reel_id}/events
```

using Server-Sent Events.

The backend emits messages such as:

```
Inspecting package.json
Reading application routes
Getting more context from components
Tracing how data flows
Understanding the project structure
Turning code into a story
Designing the visual sequence
Recording the scenes
Adding narration
Mixing the soundtrack
Almost ready...
```

The frontend displays overall progress, current stage, activity log, and failure information.

The backend remains responsible for the generation lifecycle.

### 2.15 Regeneration

The user can choose **Regenerate** from an existing reel.

The frontend sends:

```
POST /api/reels/{reel_id}/regenerate
```

The backend creates a new generation using the existing repository URL.

The original reel is not silently overwritten until the new generation succeeds.

### 2.16 Deletion

The user can delete a reel after confirmation.

The backend:
1. Removes reel metadata.
2. Removes associated B2 objects where appropriate.
3. Returns success.
4. The frontend removes the reel from the library.

## 3. Stack

### Frontend
- Next.js
- React
- HTML
- CSS
- SVG

Responsibilities:
- Dashboard.
- New Reel form.
- Generation UI.
- SSE progress display.
- Reel player.
- Project information.
- Project connection chart.
- Scene rendering routes.

The frontend does not perform long-running AI generation.

### Backend
- Python
- FastAPI

Responsibilities:
- API endpoints.
- Repository scanning.
- AI orchestration.
- Story generation.
- Scene validation.
- TTS requests.
- Music selection.
- Playwright orchestration.
- FFmpeg assembly.
- B2 uploads.
- Supabase metadata.
- Generation status.

### AI
Primary model:

```
NVIDIA NIM
Nemotron 3.5 Lightning 30B A3B
nvidia/nemotron-3.5-lightning-30b-a3b
```

The model is accessed through an OpenAI-compatible API.

AI responsibilities are limited to understanding, planning, validation, and selection.

### Text-to-Speech
The PoC uses an NVIDIA NIM-compatible text-to-speech service. Exact request details are verified during implementation.

### Browser Automation
- Playwright
- Chromium

### Video Processing
- FFmpeg

### Database
- Supabase
- PostgreSQL

### Object Storage
- Backblaze B2

### Deployment
- Vercel for Next.js frontend.
- Railway for FastAPI generation backend.

## 4. Where It Runs and How Someone Tries It

### Local Development

Intended structure:

```
DevReel/
├── frontend/
└── backend/
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Environment variables are stored locally and never committed. An `.env.example` documents required configuration names.

### Production Request Flow

```
User
 ↓
Vercel / Next.js
 ↓ API request + SSE
Railway / FastAPI
 ├── Repository Scanner
 ├── AI Analysis
 ├── Story Generator
 ├── TTS
 ├── Music Selection
 ├── Playwright
 └── FFmpeg
 ├──────────────→ Supabase
 └──────────────→ Backblaze B2
```

Vercel is responsible for the user interface. Railway is responsible for long-running generation.

### Renderer Access

Railway's Playwright worker opens a protected rendering route on the deployed frontend:

```
Railway
 ↓
Playwright
 ↓
Vercel /render/{reel_id}/{scene_index}
 ↓
Scene JSON
 ↓
Animated scene
```

The rendering route should require a short-lived render token.

### Demo Route

```
Open DevReel
→ New Reel
→ Paste public GitHub URL
→ Generate
→ Watch live analysis
→ Watch generated explainer
→ Expand project chart
→ Return to dashboard
→ Show generated reel in library
```

The hackathon video should prioritize the end-to-end working experience.

## 5. Look and Feel

DevReel should feel like a cinematic presentation product rather than a developer utility.

Visual characteristics:
- Dark, premium interface.
- Strong typography.
- High contrast.
- Smooth transitions.
- Clear hierarchy.
- Minimal clutter.
- Generous spacing.
- Subtle motion.
- Technical details presented visually rather than as walls of text.
- Generated reel treated as the visual centerpiece.

Generation can use playful messages while remaining polished.

Example:

```
Sleuthing through the codebase...
Getting virtual coffee with your architecture...
```

Animation should use a consistent visual grammar:
- Nodes.
- Connection lines.
- Cards.
- Code snippets.
- Icons.
- Metrics.
- Timelines.
- Progressive reveals.
- Large statement typography.
- Architecture diagrams.

Each scene should communicate one primary idea.

## 6. Components

### Frontend Components

```
Dashboard
ReelCard
EmptyLibrary
NewReelForm
GenerationProgress
ProgressBar
ActivityLog
ErrorCard
ReelPlayer
ProjectDetails
ProjectChart
DeleteConfirmation
RenderScene
```

### Scene Renderer

```
ProblemScene
SolutionScene
FlowScene
FeatureScene
TechnologyScene
ImpactScene
ClosingScene
```

These consume validated scene data.

### Backend Components

```
API
Job Manager
Repository Scanner
Repository Evidence Extractor
Project Analyzer
Story Generator
Story Validator
Scene Validator
TTS Service
Music Catalog
Renderer Orchestrator
Playwright Capture
FFmpeg Assembler
B2 Storage
Supabase Repository
```

Exact module names may change during implementation while responsibilities remain stable.

## 7. Data Model

### reels

Conceptual table:

```
id
session_id
repo_url
repo_name
status
title
summary
project_understanding_json
scene_spec_json
chart_json
video_key
thumbnail_key
duration_seconds
error_message
created_at
updated_at
```

### Status

```
queued
analyzing
planning
generating_narration
selecting_music
rendering
assembling
uploading
completed
failed
```

### Project Understanding

```json
{
  "project_name": "...",
  "purpose": "...",
  "problem": "...",
  "solution": "...",
  "target_users": [],
  "features": [],
  "technology": [],
  "flow": [],
  "evidence": []
}
```

### Scene Specification

```json
{
  "scenes": [
    {
      "type": "problem",
      "title": "...",
      "duration": 7,
      "narration": "...",
      "visual": {}
    }
  ]
}
```

### Project Chart

```json
{
  "nodes": [
    {
      "id": "frontend",
      "label": "Frontend",
      "type": "application"
    }
  ],
  "connections": [
    {
      "from": "frontend",
      "to": "api",
      "label": "requests"
    }
  ]
}
```

### Anonymous Session

The browser creates and stores a random `session_id` in `localStorage`.

This is not production-grade authentication or authorization.

## 8. File Structure

Intended implementation structure:

```
DevReel/
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   ├── new/
│   │   ├── generate/
│   │   ├── reels/
│   │   └── render/
│   │       └── [reelId]/
│   │           └── [sceneIndex]/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── generation/
│   │   ├── reel/
│   │   ├── chart/
│   │   └── scenes/
│   ├── lib/
│   │   ├── api.ts
│   │   └── session.ts
│   ├── public/
│   │   └── assets/
│   ├── package.json
│   └── next.config.ts
│
├── backend/
│   ├── main.py
│   ├── api/
│   │   ├── reels.py
│   │   └── events.py
│   ├── services/
│   │   ├── repository.py
│   │   ├── analysis.py
│   │   ├── story.py
│   │   ├── validation.py
│   │   ├── tts.py
│   │   ├── music.py
│   │   ├── rendering.py
│   │   ├── video.py
│   │   ├── storage.py
│   │   └── database.py
│   ├── models/
│   │   ├── reel.py
│   │   ├── project.py
│   │   └── scene.py
│   ├── prompts/
│   │   ├── analysis.txt
│   │   ├── story.txt
│   │   └── validation.txt
│   ├── music/
│   │   └── catalog.json
│   ├── requirements.txt
│   └── Dockerfile
│
├── devpost/
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   ├── spec.md
│   └── spec.html
│
├── .env.example
├── .gitignore
└── README.md
```

This is an intended architecture; implementation may add supporting files.

## 9. External Services and Dependencies

### GitHub
Public repositories are the input source. The PoC only needs publicly accessible repositories. Git can clone repositories without GitHub authentication.

### NVIDIA NIM
Used for repository understanding, story generation, validation, and selection.

Model:
`nvidia/nemotron-3.5-lightning-30b-a3b`

Official documentation:
https://build.nvidia.com/nvidia/nemotron-3_5-lightning-30b-a3b

### NVIDIA Text-to-Speech
Used to generate narration.

Official model documentation:
https://build.nvidia.com/nvidia/magpie-tts-zeroshot

### Supabase
Provides PostgreSQL metadata storage.

Documentation:
https://supabase.com/docs

### Backblaze B2
Stores generated media using its S3-compatible API.

Documentation:
https://www.backblaze.com/docs/cloud-storage-s3-compatible-api

### Railway
Hosts the FastAPI generation backend and long-running worker.

Documentation:
https://docs.railway.com/guides/fastapi

The required compute resources must be validated because Playwright Chromium and FFmpeg can require more resources than a simple API.

### Vercel
Hosts the Next.js frontend and scene-rendering routes.

Documentation:
https://vercel.com/docs

### Playwright
Controls Chromium for deterministic scene capture.

Documentation:
https://playwright.dev/docs/videos

### FFmpeg
Performs video conversion, concatenation, encoding, and audio mixing.

Documentation:
https://ffmpeg.org/documentation.html

### Pixabay
The PoC uses a small manually curated collection of suitable music tracks. Music metadata should retain source/license information.

Documentation:
https://pixabay.com/service/license-summary/

The PoC does not depend on a runtime Pixabay music-search API.

## 10. Important Failure Modes

### Invalid GitHub URL
Reject before generation and explain how to correct the URL.

### Repository Inaccessible
Private, deleted, unavailable, or unclonable repositories result in a clear failed state. No fake success.

### Repository Too Large
Repositories exceeding configured limits are stopped with an explanation.

### AI Generation Failure
Invalid or failed AI responses are validated and can receive one controlled retry. Failed retries result in `failed`.

### Rendering Failure
Playwright capture failures result in a failed generation and preserve server-side debugging information.

### FFmpeg Failure
Assembly failures result in a failed generation and cleanup of temporary files where possible.

### Storage Failure
B2 upload failures can be retried. The reel is not marked completed unless storage succeeds.

## 11. What Was Simplified and Why

### No Authentication
Anonymous browser sessions keep the PoC focused on the core product.

### Public GitHub Repositories Only
Private repository authentication is deferred because the PoC needs to prove repository understanding rather than enterprise permissions.

### Curated Music
A small pre-vetted music catalog avoids unnecessary runtime search complexity.

### No Sound Effects
Narration, animation, and music are sufficient for the PoC.

### No Full Video Editor
The product's differentiator is automated explanation, not manual editing.

### No Generative Video Model
The core experiment is AI-driven understanding and structured visual storytelling. Deterministic rendering reduces cost and improves consistency.

### Limited Scene Library
A constrained renderer makes visual quality easier to maintain.

### Representative Repositories
The PoC demonstrates the generalized approach without claiming perfect support for every repository.

### No Production Accounts/Billing
Accounts, subscriptions, teams, billing, and enterprise controls are outside the proof-of-concept goal.

## 12. Decisions and Open Issues

### Confirmed Decisions

| Decision | Choice |
|---|---|
| Frontend | Next.js + React |
| Backend | FastAPI + Python |
| Long-running generation | Railway |
| Frontend hosting | Vercel |
| Progress updates | Server-Sent Events |
| AI model | NVIDIA Nemotron 3.5 Lightning 30B A3B |
| TTS | NVIDIA TTS |
| Browser rendering | Playwright + Chromium |
| Video assembly | FFmpeg |
| Database | Supabase/PostgreSQL |
| Object storage | Backblaze B2 |
| Music | Curated Pixabay catalog |
| Authentication | Deferred |
| Sound effects | Deferred |
| Full editor | Deferred |
| Generative video | Deferred |

### Open Implementation Issues

#### Railway Resource Requirements
Validate the smallest practical Railway resource allocation once Playwright and FFmpeg run together.

#### NVIDIA TTS Request Shape
Confirm the exact current request and response format during implementation.

#### Renderer Security
Use a short-lived render token so Playwright can access scene data without exposing arbitrary generation data.

#### Repository Limits
Choose initial file, size, and processing limits based on actual PoC workloads.

#### Deterministic Animation Timing
The renderer must expose:

```javascript
window.__DEVREEL_READY__ = true
```

only after fonts, assets, scene data, and initial animation state are ready.

## Final Architecture

```
                    ┌─────────────────────┐
                    │       User          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Vercel / Next.js    │
                    │                     │
                    │ Dashboard           │
                    │ New Reel            │
                    │ Generation UI       │
                    │ Reel Player         │
                    │ Project Chart       │
                    │ Scene Renderer      │
                    └──────────┬──────────┘
                               │
                         API + SSE
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Railway / FastAPI   │
                    │                     │
                    │ Job Manager         │
                    │ Repository Scanner  │
                    │ AI Analysis         │
                    │ Story Generator     │
                    │ Scene Validator     │
                    │ TTS                 │
                    │ Music Selection     │
                    │ Playwright          │
                    │ FFmpeg              │
                    └──────┬──────┬───────┘
                           │      │
                 ┌─────────┘      └──────────┐
                 ▼                           ▼
        ┌────────────────┐          ┌────────────────┐
        │ Supabase       │          │ Backblaze B2   │
        │                │          │                │
        │ Reel metadata  │          │ Final MP4      │
        │ Scene data     │          │ Thumbnail      │
        │ Project data   │          │ Media          │
        └────────────────┘          └────────────────┘
```

The fundamental transformation is:

```
GitHub Codebase
      ↓
Repository Evidence
      ↓
Project Understanding
      ↓
Story / Pitch
      ↓
Structured Scene Specification
      ↓
React / HTML / SVG Animation
      ↓
Playwright Video Capture
      ↓
Narration + Music
      ↓
FFmpeg
      ↓
Final Cinematic Explainer
```

**DevReel's core technical idea is not "AI generates a video."**

It is:

**AI understands software and decides how that software should be explained; a controlled renderer turns that explanation into a polished audiovisual story.**
