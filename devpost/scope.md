---
status: approved
---

# DevReel — Scope

## The Idea

DevReel turns a GitHub project into a cinematic animated explanation/pitch.

**Tagline:** “Turn your code into a story worth watching.”

The product is not a demo-video recorder. It helps a viewer understand what a project is, why it matters, how it works, and what makes it interesting.

> Code tells computers what a product does.
>
> A README tells developers what a product does.
>
> DevReel tells everyone else.

## The Audience

DevReel is for developers, builders, founders, and hackathon participants who need to explain a software project to:

- judges
- clients
- investors
- teammates
- non-technical viewers

## The Unique Kernel

DevReel inspects the actual repository code, not only the README, and transforms its understanding of the project into a systematic visual story.

The distinctive loop is:

**Repository → Code Understanding → Story → Visual Direction → Animated Explainer**

The AI decides what should be communicated; DevReel decides how that communication is rendered.

## The Core Loop

1. The user provides a public GitHub repository URL.
2. DevReel scans relevant repository files and understands the project.
3. AI identifies the project's purpose, users, problem, solution, features, technology, and flow.
4. AI turns that understanding into a concise story/pitch and structured scene plan.
5. DevReel renders reusable animated scenes from the structured plan.
6. Narration and background music are added.
7. The user receives a playable cinematic project explainer.

## What Working Looks Like

A user should be able to submit a representative public GitHub repository and receive a playable explainer that visibly communicates:

- the problem
- the solution
- how the product works
- important features
- relevant technology
- the project's impact or value

The explanation should feel cinematic, polished, intelligent, engaging, and satisfying rather than like a screen recording or slide deck.

## Proof-of-Concept Boundary

The PoC demonstrates the complete transformation from a real GitHub repository to an animated explanation.

It includes:

- public GitHub repository input
- actual codebase analysis
- project purpose and flow understanding
- feature and technology understanding
- AI-generated story/pitch
- structured visual direction
- reusable animated scene types
- narration
- background music
- a representation of project connections and flow
- a playable final explainer

The PoC will use representative repositories to demonstrate the general architecture rather than attempting perfect support for every possible codebase.

## Later, Not Now

Potential future directions include:

- broader repository and language support
- multiple visual styles
- deeper codebase understanding
- user-controlled presentation preferences
- customization and editing
- regeneration of individual scenes
- richer visual storytelling

## Explicitly Cut From the PoC

To keep the experiment focused, the following are deferred:

- sound effects
- a full video editor
- an expensive generative-video pipeline
- perfect support for every repository
- a production SaaS platform with accounts, billing, and enterprise features

## Success Signal

The PoC succeeds when a viewer can watch the generated reel and understand what the project is, why it exists, how its main flow works, and what technology or features make it possible—without needing to inspect the source code first.
