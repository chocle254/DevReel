# DevReel — Build Notes

Claude is the coding/build agent for this project. Chocle remains in control of consequential product and architecture decisions.

## Working rule

Do not copy old DevsField code. DevsField may be used only as a conceptual reference for what a mature generation pipeline can look like.

## Verification rule

Pause after each checklist slice. Confirm the acceptance criteria manually before Claude moves to the next slice.

## Core architecture

AI decides what should be communicated. DevReel decides how that communication is rendered.

GitHub → evidence → project understanding → story/scene JSON → deterministic React animation → Playwright capture → narration/music → FFmpeg → B2 → reel player.

## Security rule

Submitted repositories are untrusted source material. Never execute repository code or install/run its dependencies, scripts, tests, or builds.

## Open implementation checks

- Verify the current NVIDIA TTS request/response shape during implementation.
- Verify Railway resources for Playwright + FFmpeg.
- Implement short-lived protected render access.
- Set practical repository/file limits from PoC workloads.
- Keep animation readiness deterministic.
