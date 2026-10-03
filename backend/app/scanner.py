"""Repository evidence scanner. Reads files as TEXT only; never executes anything.

Produces a bounded, prioritised evidence bundle (file tree, language mix, and
excerpts from the files most likely to explain what the project is).
"""
from __future__ import annotations

import os
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from .config import get_settings
from .models import PipelineError

IGNORE_DIRS = {
    ".git", "node_modules", "dist", "build", ".next", ".nuxt", "out", "target", "vendor", "venv", ".venv",
    "env", "__pycache__", ".idea", ".vscode", "coverage", ".cache", ".turbo", ".gradle", "bin", "obj",
    "site-packages", ".pytest_cache", ".mypy_cache", "bower_components", "Pods", ".dart_tool", ".terraform",
    "migrations_old", ".svn", ".hg",
}
BINARY_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg", ".bmp", ".tiff", ".mp3", ".mp4", ".mov", ".wav",
    ".webm", ".avi", ".pdf", ".zip", ".gz", ".tar", ".tgz", ".rar", ".7z", ".woff", ".woff2", ".ttf", ".otf",
    ".eot", ".exe", ".dll", ".so", ".dylib", ".class", ".jar", ".pyc", ".o", ".a", ".bin", ".dat", ".db",
    ".sqlite", ".sqlite3", ".pkl", ".pt", ".pth", ".onnx", ".h5", ".npy", ".npz", ".parquet", ".psd", ".ai",
    ".apk", ".aab", ".keystore", ".jks", ".lock",
}
SKIP_NAMES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Pipfile.lock", "composer.lock",
    "Cargo.lock", "Gemfile.lock", "go.sum", "bun.lockb", "npm-shrinkwrap.json",
}
SECRET_NAME = re.compile(r"(^\.env($|\.)|secret|credential|id_rsa|\.pem$|\.key$|\.p12$|\.pfx$)", re.I)
LANG_BY_EXT = {
    ".py": "Python", ".js": "JavaScript", ".jsx": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript",
    ".go": "Go", ".rs": "Rust", ".java": "Java", ".kt": "Kotlin", ".swift": "Swift", ".rb": "Ruby",
    ".php": "PHP", ".cs": "C#", ".cpp": "C++", ".cc": "C++", ".c": "C", ".h": "C/C++", ".dart": "Dart",
    ".vue": "Vue", ".svelte": "Svelte", ".html": "HTML", ".css": "CSS", ".scss": "CSS", ".sql": "SQL",
    ".sh": "Shell", ".ipynb": "Jupyter", ".r": "R", ".scala": "Scala", ".lua": "Lua",
}
TOP_PRIORITY = [
    "readme.md", "readme", "readme.rst", "readme.txt", "package.json", "pyproject.toml", "requirements.txt",
    "pubspec.yaml", "go.mod", "cargo.toml", "pom.xml", "build.gradle", "composer.json", "gemfile",
    "dockerfile", "docker-compose.yml", "docker-compose.yaml", "vercel.json", "railway.json", "railway.toml",
    "next.config.js", "next.config.mjs", "next.config.ts", "vite.config.ts", "vite.config.js", "app.json",
    "manifest.json", "supabase/config.toml", "schema.sql", "schema.prisma",
]
ENTRY_NAMES = {
    "main.py", "app.py", "server.py", "manage.py", "index.js", "index.ts", "server.js", "server.ts", "app.js",
    "app.ts", "main.ts", "main.js", "main.go", "main.rs", "lib.rs", "main.dart", "page.tsx", "layout.tsx",
    "app.tsx", "main.tsx", "index.tsx", "index.html",
}
HINT_WORDS = ("route", "router", "api", "model", "schema", "service", "controller", "handler", "agent", "prompt", "pipeline", "worker", "view", "store")


@dataclass
class EvidenceFile:
    path: str
    content: str
    truncated: bool


@dataclass
class Evidence:
    repo_name: str
    tree: list[str] = field(default_factory=list)
    languages: dict[str, int] = field(default_factory=dict)
    files: list[EvidenceFile] = field(default_factory=list)
    all_paths: set[str] = field(default_factory=set)
    total_files: int = 0
    description: str = ""

    def render(self) -> str:
        """Text block handed to the model."""
        parts = [f"REPOSITORY: {self.repo_name}", f"TOTAL FILES: {self.total_files}"]
        if self.description:
            parts.append(f"GITHUB DESCRIPTION: {self.description}")
        if self.languages:
            langs = ", ".join(f"{k} ({v} files)" for k, v in self.languages.items())
            parts.append(f"LANGUAGES: {langs}")
        parts.append("FILE TREE (filtered):\n" + "\n".join(self.tree))
        for f in self.files:
            note = " [truncated]" if f.truncated else ""
            parts.append(f"=== FILE: {f.path}{note} ===\n{f.content}")
        return "\n\n".join(parts)


def _is_text(path: Path) -> bool:
    try:
        with open(path, "rb") as fh:
            chunk = fh.read(2048)
    except OSError:
        return False
    return b"\x00" not in chunk


def _score(rel: str, size: int) -> float:
    low = rel.lower()
    name = low.rsplit("/", 1)[-1]
    depth = rel.count("/")
    score = 0.0
    if low in TOP_PRIORITY or name in TOP_PRIORITY:
        score += 100 - depth * 5
    if name in ENTRY_NAMES:
        score += 60 - depth * 4
    if any(w in low for w in HINT_WORDS):
        score += 25
    if low.endswith((".md", ".rst")) and depth <= 1:
        score += 30
    if low.startswith(("docs/", "doc/")):
        score += 8
    if any(seg in low for seg in ("test", "spec", "mock", "fixture", "example", "sample", "__snapshots__", ".min.")):
        score -= 40
    score -= depth * 3
    score -= min(size / 20_000, 10)  # prefer smaller files
    return score


def scan_repo(root: Path, repo_name: str) -> Evidence:
    s = get_settings()
    candidates: list[tuple[float, str, Path, int]] = []
    langs: Counter[str] = Counter()
    tree: list[str] = []
    all_paths: set[str] = set()
    total = 0

    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = sorted(d for d in dirnames if d not in IGNORE_DIRS and not d.startswith(".git"))
        rel_dir = os.path.relpath(dirpath, root)
        for fn in sorted(filenames):
            full = Path(dirpath) / fn
            if full.is_symlink():  # never follow links out of the clone
                continue
            rel = fn if rel_dir == "." else f"{rel_dir}/{fn}".replace(os.sep, "/")
            ext = os.path.splitext(fn)[1].lower()
            if ext in BINARY_EXT or fn in SKIP_NAMES:
                continue
            total += 1
            all_paths.add(rel)
            if ext in LANG_BY_EXT:
                langs[LANG_BY_EXT[ext]] += 1
            if len(tree) < s.max_tree_entries:
                tree.append(rel)
            if SECRET_NAME.search(fn) and not fn.lower().endswith((".example", ".sample", ".md")):
                continue
            try:
                size = full.stat().st_size
            except OSError:
                continue
            if size == 0 or size > s.max_file_kb * 1024:
                continue
            candidates.append((_score(rel, size), rel, full, size))

    if total == 0:
        raise PipelineError("repo_empty", "That repository doesn't contain any readable source files.", True)

    candidates.sort(key=lambda c: (-c[0], c[1]))
    files: list[EvidenceFile] = []
    budget = s.evidence_chars
    for _, rel, full, _size in candidates:
        if budget <= 400:
            break
        if not _is_text(full):
            continue
        try:
            text = full.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        text = _redact(text)
        limit = min(s.per_file_chars, budget)
        truncated = len(text) > limit
        files.append(EvidenceFile(rel, text[:limit], truncated))
        budget -= min(len(text), limit)

    if not files:
        raise PipelineError("repo_empty", "That repository doesn't contain any readable source files.", True)

    return Evidence(
        repo_name=repo_name,
        tree=tree,
        languages=dict(langs.most_common(8)),
        files=files,
        all_paths=all_paths,
        total_files=total,
    )


_SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|secret|token|password|passwd|authorization)\s*[:=]\s*['\"]?[A-Za-z0-9_\-./+=]{12,}"),
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"nvapi-[A-Za-z0-9_\-]{20,}"),
    re.compile(r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{10,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
]


def _redact(text: str) -> str:
    """Keep accidental secrets in a public repo's files from ever reaching the model or logs."""
    for pat in _SECRET_PATTERNS:
        text = pat.sub("[REDACTED]", text)
    return text
