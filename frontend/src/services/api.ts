import type { Reel, ReelSummary, RenderScenePayload } from '../types/contract';

const STORAGE_SESSION_KEY = 'devreel_session_id';

function safeGetStorage(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || '').replace(/\\/$/, '');

function requireApiBase(): string {
  if (!API_BASE) {
    throw new Error('DevReel backend URL is not configured. Set VITE_API_URL.');
  }
  return API_BASE;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Request failed');
  }
  return 'Request failed';
}

async function parseApiError(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  const error = body?.error;
  if (error) {
    throw {
      code: error.code || 'request_failed',
      message: error.message || `Request failed with HTTP ${response.status}`,
      user_solvable: Boolean(error.user_solvable),
    };
  }
  throw new Error(`Request failed with HTTP ${response.status}`);
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';

  const existing = safeGetStorage(STORAGE_SESSION_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sess_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

  safeSetStorage(STORAGE_SESSION_KEY, id);
  return id;
}

export const api = {
  async getHealth(): Promise<{ status: string }> {
    const res = await fetch(`${requireApiBase()}/api/health`);
    if (!res.ok) return parseApiError(res);
    return res.json();
  },

  async getReels(): Promise<{ reels: ReelSummary[] }> {
    const res = await fetch(`${requireApiBase()}/api/reels`, {
      headers: { 'X-Session-Id': getSessionId() },
    });
    if (!res.ok) return parseApiError(res);
    return res.json();
  },

  async getReel(id: string): Promise<Reel> {
    const res = await fetch(`${requireApiBase()}/api/reels/${encodeURIComponent(id)}`);
    if (!res.ok) return parseApiError(res);
    return res.json();
  },

  async createReel(repoUrl: string): Promise<Reel> {
    const normalized = repoUrl.trim();
    const urlPattern = /^https?:\\/\\/(www\\.)?github\\.com\\/[\\w.-]+\\/[\\w.-]+(?:\\/)?$/i;
    if (!urlPattern.test(normalized)) {
      throw {
        code: 'invalid_url',
        message: 'Please provide a valid public GitHub repository URL (e.g. https://github.com/owner/repository).',
        user_solvable: true,
      };
    }

    const res = await fetch(`${requireApiBase()}/api/reels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': getSessionId(),
      },
      body: JSON.stringify({ repo_url: normalized }),
    });

    if (!res.ok) return parseApiError(res);
    return res.json();
  },

  async regenerateReel(id: string): Promise<Reel> {
    const res = await fetch(`${requireApiBase()}/api/reels/${encodeURIComponent(id)}/regenerate`, {
      method: 'POST',
    });
    if (!res.ok) return parseApiError(res);
    return res.json();
  },

  async deleteReel(id: string): Promise<{ deleted: boolean }> {
    const res = await fetch(`${requireApiBase()}/api/reels/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return parseApiError(res);
    return res.json();
  },

  getVideoUrl(id: string, reel?: Reel): string {
    if (reel?.video_url) return reel.video_url;
    return `${requireApiBase()}/api/reels/${encodeURIComponent(id)}/video`;
  },

  getThumbnailUrl(id: string, reel?: Reel): string {
    if (reel?.thumbnail_url) return reel.thumbnail_url;
    return `${requireApiBase()}/api/reels/${encodeURIComponent(id)}/thumbnail`;
  },

  async getRenderScene(id: string, sceneIndex: number, token?: string): Promise<RenderScenePayload> {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    const res = await fetch(
      `${requireApiBase()}/api/render/${encodeURIComponent(id)}/scenes/${sceneIndex}${query}`,
    );
    if (!res.ok) return parseApiError(res);
    return res.json();
  },

  subscribeToReelEvents(
    id: string,
    onState: (reel: Reel) => void,
    onError: (error: unknown) => void,
  ): () => void {
    const base = requireApiBase();
    const eventSource = new EventSource(
      `${base}/api/reels/${encodeURIComponent(id)}/events`,
    );
    let closed = false;

    const close = () => {
      if (closed) return;
      closed = true;
      eventSource.close();
    };

    eventSource.addEventListener('state', (event) => {
      try {
        const reel = JSON.parse((event as MessageEvent).data) as Reel;
        onState(reel);

        if (reel.status === 'completed' || reel.status === 'failed') {
          close();
        }
      } catch (error) {
        onError(error);
      }
    });

    eventSource.onerror = () => {
      if (!closed) {
        onError(new Error('Generation progress connection was interrupted.'));
        close();
      }
    };

    return close;
  },
};

export function formatApiError(error: unknown): string {
  return getErrorMessage(error);
}
