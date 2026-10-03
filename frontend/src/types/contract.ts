export type ReelStatus =
  | 'queued'
  | 'analyzing'
  | 'planning'
  | 'generating_narration'
  | 'selecting_music'
  | 'rendering'
  | 'assembling'
  | 'uploading'
  | 'completed'
  | 'failed';

export type SceneType =
  | 'problem'
  | 'solution'
  | 'flow'
  | 'feature'
  | 'technology'
  | 'impact'
  | 'closing';

export type NodeKind = 'actor' | 'ui' | 'service' | 'ai' | 'database' | 'external';

export interface SceneNode {
  id: string;
  label: string;
  kind: NodeKind;
}

export interface SceneConnection {
  from: string;
  to: string;
  label: string;
}

export interface SceneItem {
  label: string;
  detail: string;
}

export interface Scene {
  index: number;
  type: SceneType;
  title: string;
  headline: string;
  items: SceneItem[];
  nodes: SceneNode[];
  connections: SceneConnection[];
  narration: string;
  duration_seconds: number;
}

export interface ChartNode {
  id: string;
  label: string;
  kind: NodeKind;
}

export interface ChartEdge {
  from: string;
  to: string;
  label: string;
}

export interface ProjectChart {
  nodes: ChartNode[];
  edges: ChartEdge[];
}

export interface FeatureUnderstanding {
  name: string;
  description: string;
  evidence: string[];
}

export interface TechUnderstanding {
  name: string;
  role: string;
  evidence: string[];
}

export interface ProjectUnderstanding {
  name: string;
  one_liner: string;
  problem: string;
  target_users: string[];
  solution: string;
  features: FeatureUnderstanding[];
  technology: TechUnderstanding[];
  flow: {
    nodes: ChartNode[];
    edges: ChartEdge[];
  };
  user_journey: string[];
  impact: string;
}

export interface ReelError {
  code:
    | 'invalid_url'
    | 'repo_not_found'
    | 'repo_too_large'
    | 'repo_empty'
    | 'analysis_failed'
    | 'ai_failed'
    | 'narration_failed'
    | 'render_failed'
    | 'assembly_failed'
    | 'internal';
  message: string;
  user_solvable: boolean;
}

export interface ReelLog {
  ts: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  mood: string;
  energy?: string;
  file?: string;
}

export interface Reel {
  id: string;
  session_id: string;
  repo_url: string;
  repo_name: string;
  status: ReelStatus;
  stage_label: string;
  progress: number;
  title: string | null;
  tagline: string | null;
  summary: string | null;
  understanding: ProjectUnderstanding | null;
  scenes: Scene[];
  chart: ProjectChart | null;
  music_track: MusicTrack | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  error: ReelError | null;
  logs: ReelLog[];
  created_at: string;
  updated_at: string;
}

export type ReelSummary = Omit<Reel, 'understanding' | 'scenes' | 'logs'>;

export interface RenderScenePayload {
  reel_id: string;
  title: string;
  index: number;
  total: number;
  scene: Scene;
  width: number;
  height: number;
}
