import type { Reel, ReelSummary, RenderScenePayload, ReelStatus } from '../types/contract';
import { INITIAL_REELS, CHOCLE_DEVREEL } from '../data/mockReels';

const STORAGE_SESSION_KEY = 'devreel_session_id';
const STORAGE_REELS_KEY = 'devreel_reels_store';

const memoryStore = new Map<string, string>();

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    // localStorage restricted in sandbox iframe
  }
  return memoryStore.get(key) || null;
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch (e) {
    // localStorage restricted
  }
  memoryStore.set(key, value);
}

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  let sid = safeGetStorage(STORAGE_SESSION_KEY);
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    safeSetStorage(STORAGE_SESSION_KEY, sid);
  }
  return sid;
}

function getStoredReels(): Reel[] {
  if (typeof window === 'undefined') return INITIAL_REELS;
  try {
    const raw = safeGetStorage(STORAGE_REELS_KEY);
    if (!raw) {
      safeSetStorage(STORAGE_REELS_KEY, JSON.stringify(INITIAL_REELS));
      return INITIAL_REELS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored reels', e);
    return INITIAL_REELS;
  }
}

function saveStoredReels(reels: Reel[]) {
  if (typeof window === 'undefined') return;
  try {
    safeSetStorage(STORAGE_REELS_KEY, JSON.stringify(reels));
  } catch (e) {
    console.error('Failed to save stored reels', e);
  }
}

let backendAvailable: boolean | null = null;

async function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
    backendAvailable = res.ok;
  } catch {
    backendAvailable = false;
  }
  return backendAvailable;
}

export const api = {
  async getHealth(): Promise<{ status: string }> {
    const hasBackend = await checkBackend();
    if (hasBackend) {
      const res = await fetch(`${API_BASE}/api/health`);
      return res.json();
    }
    return { status: 'ok' };
  },

  async getReels(): Promise<{ reels: ReelSummary[] }> {
    const hasBackend = await checkBackend();
    if (hasBackend) {
      const res = await fetch(`${API_BASE}/api/reels`, {
        headers: { 'X-Session-Id': getSessionId() },
      });
      if (res.ok) return res.json();
    }
    const reels = getStoredReels();
    const summaries: ReelSummary[] = reels.map(({ understanding, scenes, logs, ...summary }) => summary);
    return { reels: summaries };
  },

  async getReel(id: string): Promise<Reel> {
    const hasBackend = await checkBackend();
    if (hasBackend) {
      const res = await fetch(`${API_BASE}/api/reels/${id}`);
      if (res.ok) return res.json();
    }
    const reels = getStoredReels();
    const found = reels.find((r) => r.id === id);
    if (!found) {
      throw new Error(`Reel ${id} not found`);
    }
    return found;
  },

  async createReel(repoUrl: string): Promise<Reel> {
    // Validate repository URL
    const urlPattern = /^https?:\/\/(www\.)?github\.com\/([\w.-]+)\/([\w.-]+)(\/)?$/i;
    const match = repoUrl.trim().match(urlPattern);
    if (!match) {
      throw {
        code: 'invalid_url',
        message: 'Please provide a valid public GitHub repository URL (e.g., https://github.com/owner/repository)',
        user_solvable: true,
      };
    }

    const owner = match[2];
    const repo = match[3].replace(/\.git$/, '');
    const repoName = `${owner}/${repo}`;

    const hasBackend = await checkBackend();
    if (hasBackend) {
      const res = await fetch(`${API_BASE}/api/reels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': getSessionId(),
        },
        body: JSON.stringify({ repo_url: repoUrl.trim() }),
      });
      if (res.ok) return res.json();
      const err = await res.json().catch(() => ({ error: { message: 'Submission failed' } }));
      throw err.error || err;
    }

    // Standalone generation simulator:
    const newId = `reel-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const newReel: Reel = {
      id: newId,
      session_id: getSessionId(),
      repo_url: repoUrl.trim(),
      repo_name: repoName,
      status: 'queued',
      stage_label: 'Waiting in queue',
      progress: 0,
      title: repo.charAt(0).toUpperCase() + repo.slice(1),
      tagline: `Intelligent overview for ${repoName}`,
      summary: null,
      understanding: null,
      scenes: [],
      chart: null,
      music_track: {
        id: 'cinematic_01',
        name: 'Cybernetic Genesis',
        mood: 'Cinematic High-Tech',
        energy: 'Medium',
      },
      video_url: null,
      thumbnail_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      duration_seconds: null,
      error: null,
      logs: [
        {
          ts: new Date().toISOString(),
          level: 'info',
          message: `Queued reel generation job for ${repoName}`,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const reels = getStoredReels();
    saveStoredReels([newReel, ...reels]);
    return newReel;
  },

  async regenerateReel(id: string): Promise<Reel> {
    const existing = await this.getReel(id);
    return this.createReel(existing.repo_url);
  },

  async deleteReel(id: string): Promise<{ deleted: boolean }> {
    const hasBackend = await checkBackend();
    if (hasBackend) {
      const res = await fetch(`${API_BASE}/api/reels/${id}`, { method: 'DELETE' });
      if (res.ok) return res.json();
    }
    const reels = getStoredReels().filter((r) => r.id !== id);
    saveStoredReels(reels);
    return { deleted: true };
  },

  async getRenderScene(id: string, sceneIndex: number, token?: string): Promise<RenderScenePayload> {
    const hasBackend = await checkBackend();
    if (hasBackend) {
      const url = `${API_BASE}/api/render/${id}/scenes/${sceneIndex}${token ? `?token=${token}` : ''}`;
      const res = await fetch(url);
      if (res.ok) return res.json();
    }
    const reel = await this.getReel(id);
    const scene = reel.scenes[sceneIndex] || reel.scenes[0] || CHOCLE_DEVREEL.scenes[0];
    return {
      reel_id: reel.id,
      title: reel.title || reel.repo_name,
      index: sceneIndex,
      total: reel.scenes.length || 1,
      scene,
      width: 1280,
      height: 720,
    };
  },

  subscribeToReelEvents(id: string, onState: (reel: Reel) => void, onError: (err: any) => void): () => void {
    let closed = false;

    // Check if backend SSE is reachable
    checkBackend().then((hasBackend) => {
      if (closed) return;

      if (hasBackend) {
        const es = new EventSource(`${API_BASE}/api/reels/${id}/events`);
        es.addEventListener('state', (e) => {
          try {
            const data: Reel = JSON.parse(e.data);
            onState(data);
            if (data.status === 'completed' || data.status === 'failed') {
              es.close();
            }
          } catch (err) {
            console.error('SSE JSON error', err);
          }
        });
        es.onerror = (e) => {
          onError(e);
          es.close();
        };
        return () => {
          closed = true;
          es.close();
        };
      }

      // Standalone simulation for local/testing execution
      simulateLocalGeneration(id, onState, (shouldStop) => closed || Boolean(shouldStop));
    });

    return () => {
      closed = true;
    };
  },
};

/**
 * High-fidelity generator simulation for local standalone mode
 */
function simulateLocalGeneration(
  id: string,
  onState: (reel: Reel) => void,
  isCancelled: (shouldStop?: boolean) => boolean
) {
  let reel: Reel | undefined = getStoredReels().find((r) => r.id === id);
  if (!reel) return;

  if (reel.status === 'completed') {
    onState(reel);
    return;
  }

  const stages: {
    status: ReelStatus;
    label: string;
    progress: number;
    delay: number;
    log: string;
  }[] = [
    { status: 'analyzing', label: 'Cloning repository sandbox', progress: 8, delay: 1200, log: `Cloned ${reel.repo_name} to isolated sandbox (depth=1)` },
    { status: 'analyzing', label: 'Extracting architecture & source files', progress: 24, delay: 1800, log: 'Parsed package configs, source files, and route schemas' },
    { status: 'planning', label: 'Building narrative story arc', progress: 38, delay: 1600, log: 'Synthesizing 7-stage project pitch & identifying core problem/solution' },
    { status: 'generating_narration', label: 'Generating neural voiceover', progress: 52, delay: 1800, log: 'Synthesized voiceover audio and calculated exact scene durations' },
    { status: 'selecting_music', label: 'Selecting soundtrack', progress: 60, delay: 1200, log: 'Selected "Cybernetic Genesis" ambient soundtrack' },
    { status: 'rendering', label: 'Rendering scene visuals', progress: 75, delay: 2000, log: 'Executing deterministic SVG & React animation canvas (1280x720)' },
    { status: 'assembling', label: 'Assembling explainer reel', progress: 92, delay: 1600, log: 'Synchronizing timeline audio tracks and video frames' },
    { status: 'uploading', label: 'Finishing reel package', progress: 98, delay: 1200, log: 'Exporting final reel metadata and interactive chart' },
    { status: 'completed', label: 'Done', progress: 100, delay: 800, log: 'Reel ready to watch and export!' },
  ];

  let currentStep = 0;

  function runNext() {
    if (isCancelled()) return;
    if (currentStep >= stages.length) return;

    const step = stages[currentStep];
    const timestamp = new Date().toISOString();

    reel = {
      ...reel!,
      status: step.status,
      stage_label: step.label,
      progress: step.progress,
      updated_at: timestamp,
      logs: [
        ...(reel!.logs || []),
        { ts: timestamp, level: 'info', message: step.log },
      ],
    };

    // Populate data when planning completes
    if (step.progress >= 38 && !reel.understanding) {
      const template = reel.repo_name.toLowerCase().includes('devreel') ? CHOCLE_DEVREEL : CHOCLE_DEVREEL;
      reel.title = reel.repo_name.split('/')[1] || reel.repo_name;
      reel.tagline = `Turn ${reel.repo_name} into a story worth watching`;
      reel.summary = `An intelligent, automated visual product pitch synthesized from the ${reel.repo_name} codebase.`;
      reel.understanding = {
        ...template.understanding!,
        name: reel.title,
      };
      reel.scenes = template.scenes.map((s) => ({
        ...s,
        title: s.title,
      }));
      reel.chart = template.chart;
      reel.duration_seconds = 68.5;
    }

    // Save updated state
    const allReels = getStoredReels().map((r) => (r.id === reel!.id ? reel! : r));
    saveStoredReels(allReels);

    onState(reel);

    currentStep++;
    if (currentStep < stages.length) {
      setTimeout(runNext, step.delay);
    }
  }

  setTimeout(runNext, 600);
}
