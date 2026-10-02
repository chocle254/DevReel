# DevReel — Build Notes

## Build team

DevReel is being built collaboratively by three AI agents, with Chocle as the project lead and final decision-maker.

- **Medo — Frontend:** Next.js/React UI, dashboard, New Reel flow, generation experience, reel player, project chart, and cinematic visual polish.
- **Claude — Backend:** FastAPI/Python services, GitHub repository scanner, AI/Nemotron orchestration, story/scene generation, TTS, job lifecycle, SSE, Playwright, FFmpeg, Supabase/B2, and Railway deployment.
- **ChatGPT — Connections & Integration:** frontend/backend API contracts, SSE connection, scene JSON contract, render-route communication, environment/config boundaries, Supabase/B2 integration boundaries, cross-service debugging, integration testing, and fixing issues where the independently built pieces do not work together.
- **Chocle — Project lead:** owns consequential product/architecture decisions, reviews milestone acceptance criteria, and approves progression between verified slices.

## Working rule

Do not copy old DevsField code. DevsField may be used only as a conceptual reference for what a mature generation pipeline can look like.

The three agents should preserve the agreed architecture and contracts. Changes that affect another agent's boundary should be surfaced before implementation.

## Verification rule

Pause after each checklist slice. Confirm the acceptance criteria manually before the responsible agent moves to the next slice.

Integration is verified separately where frontend and backend meet. A slice is not considered complete merely because its individual frontend or backend component works in isolation.

## Core architecture

AI decides what should be communicated. DevReel decides how that communication is rendered.

GitHub → evidence → project understanding → story/scene JSON → deterministic React animation → Playwright capture → narration/music → FFmpeg → B2 → reel player.

## Integration responsibilities

ChatGPT owns the connection layer between the frontend and backend implementation.

Key contracts to protect:

- Frontend API requests and backend endpoints use the same request/response shapes.
- Generation jobs expose persisted status and live progress through SSE.
- Scene JSON produced by the backend matches the renderer's validated schema.
- Protected render routes can safely obtain the scene data required by Playwright.
- Supabase metadata and B2 media references flow correctly to the dashboard and reel player.
- Environment variables are clearly separated between Vercel and Railway, with secrets never exposed to the browser.
- Production URLs, CORS, SSE behavior, storage access, and error handling work across services.
- Integration tests cover the complete path rather than only isolated components.

## Security rule

Submitted repositories are untrusted source material. Never execute repository code or install/run its dependencies, scripts, tests, or builds.

## Open implementation checks

- Verify the current NVIDIA TTS request/response shape during implementation.
- Verify Railway resources for Playwright + FFmpeg.
- Implement short-lived protected render access.
- Set practical repository/file limits from PoC workloads.
- Keep animation readiness deterministic.
- Keep frontend/backend contracts documented as they evolve.
