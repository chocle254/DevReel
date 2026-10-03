"""GitHub intake: validate URL, pre-check the repo, clone it safely.

Security rule: submitted repositories are untrusted. We only ever `git clone`
(hooks disabled, LFS skipped) and READ files as text. We never install,
build, test, or run anything from the repo.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import httpx

from .config import get_settings
from .models import PipelineError

_URL_RE = re.compile(
    r"^(?:https?://)?(?:www\.)?github\.com/(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+?)"
    r"(?:\.git)?(?:/(?:tree|blob|issues|pulls|commits|releases)(?:/.*)?)?/?$"
)


@dataclass
class RepoRef:
    owner: str
    repo: str

    @property
    def url(self) -> str:
        return f"https://github.com/{self.owner}/{self.repo}"

    @property
    def name(self) -> str:
        return f"{self.owner}/{self.repo}"


@dataclass
class RepoInfo:
    size_kb: int = 0
    description: str = ""
    language: str = ""
    default_branch: str = "HEAD"
    stars: int = 0


def parse_repo_url(raw: str) -> RepoRef:
    raw = (raw or "").strip()
    m = _URL_RE.match(raw)
    if not m or m["repo"] in (".", "..") or m["owner"] in (".", ".."):
        raise PipelineError(
            "invalid_url",
            "That doesn't look like a GitHub repository URL. Use the form https://github.com/owner/repo.",
            user_solvable=True,
        )
    return RepoRef(m["owner"], m["repo"])


def fetch_repo_info(ref: RepoRef) -> RepoInfo:
    """Pre-check via the GitHub API. Network/rate-limit problems are non-fatal."""
    s = get_settings()
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "devreel"}
    if s.github_token:
        headers["Authorization"] = f"Bearer {s.github_token}"
    try:
        r = httpx.get(f"https://api.github.com/repos/{ref.owner}/{ref.repo}", headers=headers, timeout=15)
    except httpx.HTTPError:
        return RepoInfo()
    if r.status_code == 404:
        raise PipelineError(
            "repo_not_found",
            "We couldn't find that repository. It may not exist or it may be private. DevReel only supports public repositories.",
            user_solvable=True,
        )
    if r.status_code != 200:
        return RepoInfo()  # e.g. 403 rate limit: let the clone decide
    d = r.json()
    if d.get("private"):
        raise PipelineError("repo_not_found", "That repository is private. DevReel only supports public repositories.", True)
    info = RepoInfo(
        size_kb=int(d.get("size") or 0),
        description=d.get("description") or "",
        language=d.get("language") or "",
        default_branch=d.get("default_branch") or "HEAD",
        stars=int(d.get("stargazers_count") or 0),
    )
    if info.size_kb > s.max_repo_mb * 1024:
        raise PipelineError(
            "repo_too_large",
            f"That repository is too large for this version of DevReel (limit {s.max_repo_mb} MB).",
            user_solvable=True,
        )
    return info


def clone_repo(ref: RepoRef, dest: Path) -> None:
    s = get_settings()
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)
    env = {
        **os.environ,
        "GIT_LFS_SKIP_SMUDGE": "1",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_ASKPASS": "echo",
    }
    cmd = [
        "git",
        "-c", "core.hooksPath=/dev/null",
        "-c", "protocol.file.allow=never",
        "-c", "core.symlinks=false",
        "clone", "--depth", "1", "--single-branch", "--no-tags",
        ref.url, str(dest),
    ]
    try:
        proc = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=s.clone_timeout_seconds)
    except subprocess.TimeoutExpired:
        shutil.rmtree(dest, ignore_errors=True)
        raise PipelineError(
            "repo_too_large",
            "Cloning that repository took too long. Try a smaller repository.",
            user_solvable=True,
        )
    if proc.returncode != 0:
        err = (proc.stderr or "").lower()
        shutil.rmtree(dest, ignore_errors=True)
        if "not found" in err or "could not read username" in err or "authentication" in err:
            raise PipelineError(
                "repo_not_found",
                "We couldn't access that repository. It may not exist or it may be private.",
                user_solvable=True,
            )
        raise PipelineError("analysis_failed", "We couldn't download that repository. Please try again.", False)
    # Safety net against oversize even when the API pre-check was skipped.
    total = _dir_size(dest)
    if total > s.max_repo_mb * 1024 * 1024:
        shutil.rmtree(dest, ignore_errors=True)
        raise PipelineError("repo_too_large", f"That repository is too large (limit {s.max_repo_mb} MB).", True)


def _dir_size(path: Path) -> int:
    total = 0
    for root, dirs, files in os.walk(path):
        if ".git" in dirs:
            dirs.remove(".git")
        for f in files:
            try:
                total += os.lstat(os.path.join(root, f)).st_size
            except OSError:
                pass
    return total
