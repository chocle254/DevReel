# DevReel — Build Checklist

## Build Preferences

- **Build mode:** Autonomous — Claude is the coding/build agent.
- **Comprehension checks:** Yes — explain consequential choices at milestone pauses.
- **Git:** Commit after each verified slice.
- **Verification:** Yes — milestone verification pauses.
- **Check-in cadence:** Balanced.

## Checklist

- [ ] **1. Establish the project foundation**
  Spec ref: `spec.md > Section 3 > Stack`
  What to build: Create the Next.js/React frontend and FastAPI/Python backend structure, shared environment configuration, local development commands, and the base API/frontend connection. Keep secrets out of Git.
  Acceptance: Frontend and backend start locally; the frontend can reach a health endpoint; `.env.example` documents required configuration names; no secrets are committed.
  Verify: Start both services and manually confirm the frontend loads and the backend health endpoint responds successfully.

- [ ] **2. Build the repository intake and evidence scanner**
  Spec ref: `spec.md > Section 2 > 2.3 Repository Analysis`
  What to build: Accept a public GitHub URL, validate it, clone it into a temporary workspace with bounded depth, build a filtered file tree, enforce file/repository limits, and extract relevant source/configuration text without executing repository code.
  Acceptance: Valid repositories produce structured evidence; invalid/inaccessible/oversized repositories produce clear failures; ignored directories and binaries are excluded; submitted project code is never executed.
  Verify: Test with a representative public repo plus invalid/private/oversized cases and inspect logs to confirm no install, build, test, or project-script execution occurs.

- [ ] **3. Implement AI project understanding with evidence**
  Spec ref: `spec.md > Section 2 > 2.4 Project Understanding`
  What to build: Integrate NVIDIA Nemotron through the OpenAI-compatible API and create validated structured project-understanding output containing identity, problem, users, solution, features, technology, flow, and evidence references.
  Acceptance: The model receives structured repository evidence rather than an unbounded repository dump; output validates against a schema; important claims include evidence references; one controlled retry handles invalid AI output.
  Verify: Run analysis on a representative repository and inspect the stored understanding JSON for grounded claims and valid evidence paths.

- [ ] **4. Generate and validate the story + scene specification**
  Spec ref: `spec.md > Section 2 > 2.5–2.6 Story and Visual Planning / Story Quality Gate`
  What to build: Turn project understanding into a concise story and typed scene JSON using the reusable scene types. Add validation for claim grounding, scene structure, duration, narration, and communication focus.
  Acceptance: The generated plan follows a coherent explanation arc, each scene has one primary goal, scene JSON conforms to its schema, and invalid plans are revised/retried once rather than rendered blindly.
  Verify: Generate a storyboard for a representative repo and manually review the JSON plus a human-readable scene summary before continuing.

- [ ] **5. Build the cinematic scene renderer**
  Spec ref: `spec.md > Section 2 > 2.7 Scene Rendering`
  What to build: Implement reusable React/HTML/SVG scene components for Problem, Solution, Flow, Feature, Technology, Impact, and Closing scenes, plus protected render routes and deterministic animation timing.
  Acceptance: Every supported scene type renders from validated scene data without arbitrary AI-generated frontend code; animations are visually consistent; the renderer exposes `window.__DEVREEL_READY__ = true` only when ready.
  Verify: Open representative render routes in a browser, test several scene types, and confirm the ready flag appears at the correct time.

- [ ] **6. Add live generation orchestration and progress**
  Spec ref: `spec.md > Section 2 > 2.14 Generation Progress`
  What to build: Create the long-running Railway-compatible job lifecycle, persistence, SSE endpoint, reconnect behavior, and polished generation UI with real stage/activity messages.
  Acceptance: Jobs move through persisted states from queued to completed/failed; the UI reflects real backend stages; reconnecting restores persisted state; no fake completion is shown; user-solvable and internal errors are distinguishable.
  Verify: Run a generation while watching the UI, refresh/reconnect during the job, and force a controlled failure to confirm the correct error state.

- [ ] **7. Add narration, curated music, browser capture, and FFmpeg assembly**
  Spec ref: `spec.md > Sections 2.8–2.11 > Browser Capture, Narration, Background Music, Video Assembly`
  What to build: Integrate the verified NVIDIA TTS request shape, curated music catalog, Playwright/Chromium scene capture, audio-duration synchronization, music ducking, and FFmpeg assembly into a final MP4.
  Acceptance: Scenes capture at a fixed viewport; narration matches scene timing; music is mixed beneath narration; final MP4 is created with valid duration; temporary files are cleaned up; failures do not report completion.
  Verify: Produce one complete local reel and inspect playback, narration synchronization, music balance, duration, and FFmpeg output metadata.

- [ ] **8. Implement persistence, B2 media storage, and reel lifecycle**
  Spec ref: `spec.md > Sections 2.12–2.16 and 7 > Data Model`
  What to build: Implement the Supabase/Postgres `reels` model, anonymous browser sessions, B2 upload/delete operations, thumbnails, reel retrieval, regeneration, and deletion.
  Acceptance: Reels are isolated by PoC session ID; metadata and media references persist; final media is stored outside the API server; regeneration does not silently overwrite a successful original; deletion removes metadata and associated media where appropriate.
  Verify: Generate a reel, refresh the dashboard, play it from stored media, regenerate it, then delete it and confirm metadata/media cleanup.

- [ ] **9. Polish the product experience and deploy the working path**
  Spec ref: `spec.md > Section 5 > Look and Feel`
  What to build: Finish the cinematic dashboard, generation screen, reel player, project details/chart, responsive states, loading/error states, and production deployment with Vercel frontend and Railway backend.
  Acceptance: The end-to-end path works in production: GitHub URL → generation progress → finished reel → project chart → dashboard library. The interface feels cinematic/polished rather than like a generic AI dashboard.
  Verify: Run the complete production demo path on a clean browser session and confirm the deployed frontend, backend, SSE, storage, renderer, and final video all work together.

- [ ] **10. Prepare Devpost handoff**
  Spec ref: `prd.md > Product Summary and Core User Journey`
  What to build: Gather the final project story, working demo path, public repository link, screenshots/visual proof as needed, and the planning documents required for submission preparation.
  Acceptance: The project can be demonstrated without cloning/running it during judging; the 1–3 minute demo path clearly shows the core transformation and the public repo contains the required planning documents.
  Verify: Review the final demo path and confirm the next step is submission preparation.

## Verification Notes

Claude is the implementation agent, but Chocle remains the decision-maker. At each milestone pause, review the working slice against its acceptance criteria before Claude moves to the next slice.

The intended wow moment is the complete transformation: paste a real GitHub repository → watch DevReel understand the project and build the story → reveal the finished cinematic reel.
