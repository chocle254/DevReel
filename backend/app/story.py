"""Stage 2: understanding -> story + typed scene JSON, then the story quality gate."""
from __future__ import annotations

import re

from . import llm
from .config import get_settings
from .models import Node, Scene, SceneConnection, SceneItem, StoryPlan, Understanding

CANONICAL_ORDER = ["problem", "solution", "flow", "feature", "technology", "impact", "closing"]

ITEM_RULES = {  # type: (min_items, max_items)
    "problem": (2, 3),
    "solution": (0, 3),
    "flow": (0, 0),
    "feature": (3, 4),
    "technology": (3, 6),
    "impact": (2, 3),
    "closing": (0, 0),
}

SYSTEM_TMPL = """You are a creative director turning a software project into a short cinematic explainer video.
You receive a grounded PROJECT UNDERSTANDING. Write the story and the scene plan.

Rules:
- Use ONLY facts present in the understanding. Never invent features, users, numbers or integrations.
- The video has EXACTLY these scenes, in this order: {types}.
- One clear goal per scene. Narration is spoken aloud: conversational, vivid, plain English, no code symbols, no URLs, no file paths, no "in this scene". {min_w}-{max_w} words per scene.
- The first scene's narration should name the project. The closing scene narration lands a memorable one-line pitch.
- On-screen text is short: title <= 6 words, headline <= 16 words, item label <= 5 words, item detail <= 14 words.
- Scene shapes:
  problem: headline + 2-3 items (pain points).
  solution: headline + 0-3 items.
  flow: headline + 3-7 nodes + connections (>= nodes-1). Each connection's "from"/"to" must be node ids. Show how a request or data actually moves through the system. This scene should explain what was built and how it works.
  feature: headline + 3-4 items (label = feature name, detail = one line). Pick from the understanding's features.
  technology: headline + 3-6 items (label = technology, detail = its role).
  impact: headline + 2-3 items (outcomes).
  closing: headline = the final pitch line, no items.
- Unused arrays must be empty.
- music_mood is one of: cinematic, uplifting, tech, calm.
- Output ONE JSON object only, no markdown, no commentary.

JSON shape:
{{
  "title": "<= 6 words, the reel title",
  "tagline": "<= 12 words",
  "summary": "2 sentences describing the project for a viewer",
  "music_mood": "cinematic",
  "scenes": [
    {{
      "type": "problem",
      "title": "The Problem",
      "headline": "...",
      "items": [{{"label": "...", "detail": "..."}}],
      "nodes": [{{"id": "user", "label": "User", "kind": "actor|ui|service|ai|database|external"}}],
      "connections": [{{"from": "user", "to": "api", "label": "request"}}],
      "narration": "..."
    }}
  ]
}}"""


def _system(types: list[str]) -> str:
    s = get_settings()
    return SYSTEM_TMPL.format(types=", ".join(types), min_w=s.min_narration_words, max_w=s.max_narration_words)


def _ids(s: str) -> str:
    return re.sub(r"[^a-z0-9_]+", "_", s.lower()).strip("_") or "node"


def _words(s: str) -> int:
    return len(s.split())


def _make_repair(types: list[str]):
    def repair(raw: dict) -> dict:
        if not isinstance(raw, dict):
            return raw
        scenes = raw.get("scenes") or []
        # keep only enabled types, one each, canonical order
        by_type: dict[str, dict] = {}
        for sc in scenes:
            if isinstance(sc, dict) and sc.get("type") in types and sc["type"] not in by_type:
                by_type[sc["type"]] = sc
        out = []
        for t in types:
            sc = by_type.get(t)
            if not sc:
                continue
            sc.setdefault("items", [])
            sc.setdefault("nodes", [])
            sc.setdefault("connections", [])
            lo, hi = ITEM_RULES[t]
            if hi == 0:
                sc["items"] = []
            else:
                sc["items"] = (sc["items"] or [])[:hi]
            if t != "flow":
                sc["nodes"], sc["connections"] = [], []
            else:
                nodes = []
                seen = set()
                for n in (sc.get("nodes") or [])[:7]:
                    if isinstance(n, dict):
                        n["id"] = _ids(str(n.get("id") or n.get("label") or "node"))
                        if n["id"] in seen:
                            continue
                        seen.add(n["id"])
                        if n.get("kind") not in ("actor", "ui", "service", "ai", "database", "external"):
                            n["kind"] = "service"
                        nodes.append(n)
                sc["nodes"] = nodes
                conns = []
                for c in sc.get("connections") or []:
                    if isinstance(c, dict):
                        if "source" in c and "from" not in c:
                            c["from"] = c.pop("source")
                        if "target" in c and "to" not in c:
                            c["to"] = c.pop("target")
                        c["from"], c["to"] = _ids(str(c.get("from", ""))), _ids(str(c.get("to", "")))
                        if c["from"] in seen and c["to"] in seen:
                            conns.append(c)
                sc["connections"] = conns
            out.append(sc)
        raw["scenes"] = out
        return raw

    return repair


def _tokens(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) >= 4}


def _gate(plan: StoryPlan, types: list[str], u: Understanding) -> list[str]:
    """Story quality gate: structure, grounding, narration length, one goal per scene."""
    s = get_settings()
    problems: list[str] = []
    got = [sc.type for sc in plan.scenes]
    missing = [t for t in types if t not in got]
    if missing:
        problems.append(f"missing scenes: {', '.join(missing)}. Required order: {', '.join(types)}")
    if _words(plan.title) > 8 or not plan.title.strip():
        problems.append("title must be 1-8 words")
    known_feature_tokens = set()
    for f in u.features:
        known_feature_tokens |= _tokens(f.name + " " + f.description)
    for sc in plan.scenes:
        t = sc.type
        n = _words(sc.narration)
        if n < s.min_narration_words or n > s.max_narration_words:
            problems.append(f"{t}: narration is {n} words; must be {s.min_narration_words}-{s.max_narration_words}")
        if _words(sc.title) > 8 or _words(sc.headline) > 20 or not sc.headline.strip():
            problems.append(f"{t}: title must be <= 6 words and headline 1-16 words")
        lo, hi = ITEM_RULES[t]
        if len(sc.items) < lo:
            problems.append(f"{t}: needs at least {lo} items")
        for it in sc.items:
            if _words(it.label) > 7 or _words(it.detail) > 18:
                problems.append(f"{t}: item '{it.label}' is too long (label <= 5 words, detail <= 14)")
        if t == "flow":
            if not 3 <= len(sc.nodes) <= 7:
                problems.append("flow: needs 3-7 nodes")
            if len(sc.connections) < max(len(sc.nodes) - 1, 2):
                problems.append("flow: needs connections >= nodes-1 with from/to equal to node ids")
        if t == "feature" and sc.items and known_feature_tokens:
            hits = sum(1 for it in sc.items if _tokens(it.label + " " + it.detail) & known_feature_tokens)
            if hits < max(1, len(sc.items) // 2):
                problems.append("feature: items must come from the understanding's features (do not invent features)")
        if re.search(r"https?://|\.py\b|\.tsx?\b|\.js\b|`", sc.narration):
            problems.append(f"{t}: narration must be plain speech (no URLs, file names or code)")
    return problems


def _fallback_flow(plan: StoryPlan, u: Understanding) -> None:
    """If the model's flow scene is unusable, build it from the grounded understanding flow."""
    for sc in plan.scenes:
        if sc.type != "flow":
            continue
        ok = 3 <= len(sc.nodes) <= 7 and len(sc.connections) >= max(len(sc.nodes) - 1, 2)
        if ok or len(u.flow.nodes) < 3:
            return
        nodes = u.flow.nodes[:7]
        ids = {n.id for n in nodes}
        sc.nodes = [Node(id=n.id, label=n.label, kind=n.kind) for n in nodes]
        sc.connections = [
            SceneConnection(source=e.source, target=e.target, label=e.label)
            for e in u.flow.edges
            if e.source in ids and e.target in ids
        ]


async def plan_story(u: Understanding) -> StoryPlan:
    s = get_settings()
    types = [t for t in CANONICAL_ORDER if t in s.scene_types]
    if "closing" not in types:
        types.append("closing")
    if "problem" not in types:
        types.insert(0, "problem")
    user = "PROJECT UNDERSTANDING:\n" + u.model_dump_json(by_alias=True, indent=1)

    def validate(plan: StoryPlan) -> list[str]:
        _fallback_flow(plan, u)
        return _gate(plan, types, u)

    plan = await llm.chat_model(
        _system(types), user, StoryPlan, validate=validate, repair=_make_repair(types), temperature=0.5
    )
    plan.music_mood = (plan.music_mood or "cinematic").strip().lower()
    for i, sc in enumerate(plan.scenes):
        sc.index = i
    return plan


def story_summary(plan: StoryPlan) -> str:
    """Human-readable storyboard for logs/review."""
    lines = [f"{plan.title} — {plan.tagline}"]
    for sc in plan.scenes:
        lines.append(f"[{sc.index}] {sc.type}: {sc.headline}")
    return "\n".join(lines)
