---
status: approved
---

# DevReel — Product Requirements

## Product Summary

DevReel transforms a GitHub project into a cinematic animated explanation/pitch.

The core journey is:

**Codebase → Understanding → Story → Animation → Explainer**

The product should feel cinematic, polished, intelligent, modern, engaging, and satisfying.

## Core User Journey

### 1. Dashboard

The user lands on a dashboard containing:

- a prominent **New Reel** action
- a library of previously generated reels
- an empty state when no reels exist

Each reel card can show the project name, status, thumbnail, and relevant metadata.

### 2. New Reel

The user starts a new reel by entering:

- GitHub repository URL

The PoC deliberately avoids a settings-heavy setup. The user does not need to choose:

- target audience
- tone
- visual style
- music
- narration

Those choices are handled automatically so the core experience stays focused.

### 3. Generation

After submitting a repository, the interface enters a generation state.

The UI should show:

- disabled submission while the job is running
- overall progress
- current generation stage
- a live activity/log area
- human-readable progress messages

The generation process should communicate stages such as:

- understanding the project
- building the story
- planning visuals
- generating narration
- selecting music
- rendering scenes
- assembling the reel
- finishing the result

The generated result contains:

- project understanding
- story
- visual connections
- animation direction
- explainer scenes
- narration
- music

### 4. Generated Reel

The user receives a reel player containing:

- the generated video
- project title
- short project summary
- project details
- an expandable project chart showing important relationships and flow

The player supports:

- play/pause
- playback speed
- fullscreen

### 5. Reel Actions

The user can:

- keep the reel
- regenerate it
- delete it

Regeneration should create a new generation from the same repository rather than requiring the user to start the entire process again.

## Generation Experience

The generation experience must feel alive without pretending that work has completed.

Progress events should correspond to real backend stages.

If generation fails, the UI should distinguish:

- user-solvable problems, such as an invalid or inaccessible repository
- internal generation failures

The interface must never show fake success.

## Storytelling Requirements

The generated story should communicate one clear purpose per scene and avoid overwhelming the viewer.

Typical narrative structure:

1. Problem
2. Solution
3. How it works
4. Key features
5. Technology
6. Impact/value
7. Closing

A scene should generally focus on one or two key ideas.

The story must be grounded in evidence found in the repository. The system should avoid inventing features or claims that cannot be supported by the codebase or project documentation.

## Visual Requirements

DevReel should use a deterministic visual grammar rather than asking a generative video model to invent every frame.

Reusable scene types can include:

- Problem Scene
- Solution Scene
- Flow Scene
- Feature Scene
- Technology Scene
- Impact Scene
- Closing Scene

AI produces structured scene specifications. The renderer turns those specifications into HTML/CSS/SVG/React animations.

For example:

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
  "narration": "CivCare analyzes..."
}
```

AI should not output arbitrary HTML or application code for the renderer.

## Project Understanding

Repository analysis should produce a structured understanding containing, where evidence allows:

- project identity
- problem
- target user
- solution
- user journey
- features
- architecture/technology
- data/API flow
- evidence references to relevant files

The system should inspect actual source/configuration files rather than blindly sending an entire repository to a single prompt.

## Progress and Reliability

The frontend receives live progress from the backend using Server-Sent Events (SSE).

A generation job moves through states such as:

`queued → analyzing → planning → generating_narration → selecting_music → rendering → assembling → uploading → completed`

or:

`failed`

The frontend should recover gracefully from temporary connection issues and reflect the persisted job state when reconnecting.

## Data and Media

A reel record stores:

- reel ID
- anonymous session ID
- repository URL
- repository/project name
- generation status
- title
- summary
- project understanding
- scene specification
- project chart
- final video reference
- thumbnail reference
- duration
- error information
- timestamps

Final media is stored outside the application server.

## Anonymous PoC Session

The PoC does not require user accounts.

The browser creates a `session_id` in local storage so generated reels can be associated with the same browser session.

This is a convenience mechanism for the PoC, not a production authentication/security model.

## Error States

The product should handle at least:

- invalid GitHub URL
- inaccessible/private repository
- unsupported or oversized repository
- repository analysis failure
- AI generation failure
- narration failure
- rendering failure
- video assembly failure
- upload failure

Errors should be human-readable and should not imply that a reel exists when it does not.

## Deferred Features

The following are intentionally outside the PoC:

- user-controlled presentation preferences
- multiple visual styles
- custom narration/voice controls
- custom music selection
- advanced scene editing
- sound effects
- broader edge-case repository support
- accounts
- billing
- enterprise functionality

## Non-Goals

DevReel is not:

- a full video editor
- a manual animation studio
- a general-purpose AI video generator
- a project-management tool
- a production SaaS platform

## Product Feel

The experience should feel like turning a technical project into a polished visual story.

Desired qualities:

**cinematic · polished · intelligent · modern · engaging · satisfying**

The interface should avoid looking like a generic AI dashboard. The generated reel is the hero experience.
