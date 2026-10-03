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

export interface TechItem {
  name: string;
  category: 'Frontend' | 'Backend' | 'AI / Models' | 'Database' | 'DevOps / Media' | 'Core';
  description: string;
  badge?: string;
  iconName?: string;
}

export interface FlowConnection {
  from: string;
  to: string;
  label: string;
  description?: string;
}

export interface FileEvidence {
  file_path: string;
  relevance: string;
  snippet?: string;
}

export interface ImpactMetric {
  value: string;
  label: string;
  trend?: string;
  detail: string;
}

export interface ProjectUnderstanding {
  project_name: string;
  tagline: string;
  purpose: string;
  problem: string;
  solution: string;
  target_users: string[];
  features: string[];
  technology: TechItem[];
  flow: FlowConnection[];
  evidence: FileEvidence[];
  metrics: ImpactMetric[];
  closing_statement: string;
}

export interface SceneVisualProblem {
  headline: string;
  pain_points: { title: string; description: string; icon: string; severity: 'high' | 'medium' | 'critical' }[];
  context_stat?: { number: string; label: string };
  warning_badge: string;
}

export interface SceneVisualSolution {
  breakthrough_title: string;
  core_concept: string;
  pillars: { title: string; desc: string; icon: string }[];
  code_snippet?: { filename: string; language: string; code: string };
}

export interface SceneVisualFlow {
  steps: { id: string; name: string; role: string; type: string; icon: string }[];
  arrows: { from: string; to: string; label: string; payload?: string }[];
  cycle_label?: string;
}

export interface SceneVisualFeature {
  items: {
    id: string;
    title: string;
    description: string;
    tag: string;
    highlight: string;
    icon: string;
  }[];
}

export interface SceneVisualTechnology {
  layers: {
    name: string;
    technologies: { name: string; role: string; icon: string }[];
  }[];
  architecture_highlight: string;
}

export interface SceneVisualImpact {
  metrics: ImpactMetric[];
  quote: {
    text: string;
    author: string;
    role: string;
  };
}

export interface SceneVisualClosing {
  project_name: string;
  tagline: string;
  call_to_action: string;
  repo_url: string;
  stars?: number;
  author: {
    name: string;
    handle: string;
    avatar?: string;
  };
}

export type SceneVisualData =
  | SceneVisualProblem
  | SceneVisualSolution
  | SceneVisualFlow
  | SceneVisualFeature
  | SceneVisualTechnology
  | SceneVisualImpact
  | SceneVisualClosing
  | Record<string, any>;

export interface SceneData {
  id: string;
  type: SceneType;
  title: string;
  subtitle: string;
  duration: number; // in seconds
  narration: string;
  visual: SceneVisualData;
}

export interface ChartNode {
  id: string;
  label: string;
  type: 'client' | 'api' | 'ai' | 'storage' | 'renderer' | 'engine';
  subLabel?: string;
  description?: string;
  fileReference?: string;
}

export interface ChartConnection {
  from: string;
  to: string;
  label: string;
}

export interface ProjectChart {
  nodes: ChartNode[];
  connections: ChartConnection[];
}

export interface SoundtrackTrack {
  id: string;
  title: string;
  mood: 'Cinematic' | 'Ambient' | 'High-Tech' | 'Inspiring' | 'Futuristic';
  energy: 'Chill' | 'Medium' | 'High';
  duration: string;
  source: string;
  description: string;
}

export interface Reel {
  id: string;
  session_id: string;
  repo_url: string;
  repo_name: string;
  status: ReelStatus;
  title: string;
  summary: string;
  duration_seconds: number;
  thumbnail_url?: string;
  video_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  project_understanding: ProjectUnderstanding;
  scenes: SceneData[];
  project_chart: ProjectChart;
  soundtrack: SoundtrackTrack;
}

export interface GenerationStep {
  id: ReelStatus;
  label: string;
  description: string;
  order: number;
}
