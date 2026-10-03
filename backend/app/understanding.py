"""Stage 1: repository evidence -> grounded, structured project understanding."""
from __future__ import annotations

import re

from . import llm
from .models import Understanding
from .scanner import Evidence

SYSTEM = """You are a senior engineer who explains software projects to non-technical audiences.
You are given EVIDENCE from a repository (file tree + file excerpts). Work out what the project is.

Rules:
- Ground every claim in the evidence. Do NOT invent features, users, integrations or numbers that the files do not support.
- For each feature and technology, cite the evidence file paths (exactly as they appear in the file tree) that support it.
- Prefer concrete, specific statements over marketing language.
- If the README and the code disagree, trust the code.
- Output ONE JSON object only, no markdown, no commentary.

JSON shape:
{
  "name": "project name",
  "one_liner": "what it is in <= 18 words",
  "problem": "the real-world problem it addresses (1-2 sentences)",
  "target_users": ["who uses it"],
  "solution": "what the developer built (1-2 sentences)",
  "features": [{"name": "...", "description": "one sentence", "evidence": ["path/in/tree"]}],
  "technology": [{"name": "FastAPI", "role": "what it does here", "evidence": ["path/in/tree"]}],
  "flow": {
    "nodes": [{"id": "short_id", "label": "<=3 words", "kind": "actor|ui|service|ai|database|external"}],
    "edges": [{"from": "node_id", "to": "node_id", "label": "<=3 words"}]
  },
  "user_journey": ["step 1", "step 2"],
  "impact": "why it matters (1 sentence)"
}
Give 3-6 features, 3-8 technologies, and a flow of 4-8 nodes showing how data/requests move through the real system (start with who or what triggers it)."""


def _ids(s: str) -> str:
    return re.sub(r"[^a-z0-9_]+", "_", s.lower()).strip("_") or "node"


def _repair(raw: dict) -> dict:
    """Cheap, safe normalisation of common model slips before strict validation."""
    if not isinstance(raw, dict):
        return raw
    flow = raw.get("flow") or {}
    nodes = flow.get("nodes") or []
    for n in nodes:
        if isinstance(n, dict):
            n["id"] = _ids(str(n.get("id") or n.get("label") or "node"))
            if n.get("kind") not in ("actor", "ui", "service", "ai", "database", "external"):
                n["kind"] = "service"
    flow["nodes"] = nodes
    for e in flow.get("edges") or []:
        if isinstance(e, dict):
            if "source" in e and "from" not in e:
                e["from"] = e.pop("source")
            if "target" in e and "to" not in e:
                e["to"] = e.pop("target")
            e["from"] = _ids(str(e.get("from", "")))
            e["to"] = _ids(str(e.get("to", "")))
    raw["flow"] = flow
    for key in ("features", "technology"):
        items = raw.get(key) or []
        for it in items:
            if isinstance(it, dict) and isinstance(it.get("evidence"), str):
                it["evidence"] = [it["evidence"]]
        raw[key] = items
    return raw


def _ground(u: Understanding, ev: Evidence) -> list[str]:
    """Drop evidence paths that don't exist; require claims keep at least some grounding."""
    known = ev.all_paths
    problems: list[str] = []
    for coll in (u.features, u.technology):
        for item in coll:
            item.evidence = [p.strip().lstrip("./") for p in item.evidence if p.strip().lstrip("./") in known]
    u.features = [f for f in u.features if f.evidence] or u.features[:0]
    u.technology = [t for t in u.technology if t.evidence] or u.technology[:0]
    if len(u.features) < 2:
        problems.append(
            "fewer than 2 features had valid evidence paths. Cite file paths exactly as they appear in the FILE TREE."
        )
    if len(u.technology) < 2:
        problems.append("fewer than 2 technologies had valid evidence paths. Cite exact paths from the FILE TREE.")
    nodes = {n.id for n in u.flow.nodes}
    u.flow.edges = [e for e in u.flow.edges if e.source in nodes and e.target in nodes]
    if len(u.flow.nodes) < 3:
        problems.append("flow needs at least 3 nodes")
    if len(u.flow.edges) < 2:
        problems.append("flow needs at least 2 edges whose from/to match node ids")
    return problems


async def understand(ev: Evidence) -> Understanding:
    user = "EVIDENCE:\n\n" + ev.render()
    return await llm.chat_model(
        SYSTEM,
        user,
        Understanding,
        validate=lambda u: _ground(u, ev),
        repair=_repair,
        temperature=0.2,
    )
