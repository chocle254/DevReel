"""Pydantic models = the data contract (see API_CONTRACT.md)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

NodeKind = Literal["actor", "ui", "service", "ai", "database", "external"]
SceneType = Literal["problem", "solution", "flow", "feature", "technology", "impact", "closing"]
Status = Literal[
    "queued",
    "analyzing",
    "planning",
    "generating_narration",
    "selecting_music",
    "rendering",
    "assembling",
    "uploading",
    "completed",
    "failed",
]


# ---------- shared graph pieces ----------
class Node(BaseModel):
    id: str
    label: str
    kind: NodeKind = "service"


class Edge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    source: str = Field(alias="from")
    target: str = Field(alias="to")
    label: str = ""


class Flow(BaseModel):
    nodes: list[Node] = []
    edges: list[Edge] = []


# ---------- project understanding ----------
class FeatureClaim(BaseModel):
    name: str
    description: str
    evidence: list[str] = []


class TechClaim(BaseModel):
    name: str
    role: str
    evidence: list[str] = []


class Understanding(BaseModel):
    name: str
    one_liner: str
    problem: str
    target_users: list[str] = []
    solution: str
    features: list[FeatureClaim] = []
    technology: list[TechClaim] = []
    flow: Flow = Flow()
    user_journey: list[str] = []
    impact: str = ""


# ---------- scenes ----------
class SceneItem(BaseModel):
    label: str
    detail: str = ""


class SceneConnection(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    source: str = Field(alias="from")
    target: str = Field(alias="to")
    label: str = ""


class Scene(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    index: int = 0
    type: SceneType
    title: str
    headline: str
    items: list[SceneItem] = []
    nodes: list[Node] = []
    connections: list[SceneConnection] = []
    narration: str
    duration_seconds: float = 0.0


class StoryPlan(BaseModel):
    title: str
    tagline: str
    summary: str
    music_mood: str = "cinematic"
    scenes: list[Scene]


# ---------- reel ----------
class LogEntry(BaseModel):
    ts: str
    level: Literal["info", "warn", "error"] = "info"
    message: str


class ErrorInfo(BaseModel):
    code: str
    message: str
    user_solvable: bool = False


class Reel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    session_id: str = ""
    repo_url: str
    repo_name: str = ""
    status: Status = "queued"
    stage_label: str = "Waiting in queue"
    progress: int = 0
    title: Optional[str] = None
    tagline: Optional[str] = None
    summary: Optional[str] = None
    understanding: Optional[Understanding] = None
    scenes: list[Scene] = []
    chart: Optional[Flow] = None
    music_track: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    error: Optional[ErrorInfo] = None
    logs: list[LogEntry] = []
    created_at: str
    updated_at: str
    rev: int = 0  # internal change counter (not part of the public contract)

    def public(self) -> dict:
        data = self.model_dump(by_alias=True, mode="json")
        data.pop("rev", None)
        return data

    def summary_public(self) -> dict:
        data = self.public()
        for k in ("understanding", "scenes", "logs"):
            data.pop(k, None)
        return data


class CreateReelRequest(BaseModel):
    repo_url: str


class PipelineError(Exception):
    """Raised anywhere in the pipeline; becomes Reel.error."""

    def __init__(self, code: str, message: str, user_solvable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.user_solvable = user_solvable
