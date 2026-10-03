import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { RenderScenePayload } from '@/types/contract';
import { SceneRenderer } from '@/components/scenes/SceneRenderer';

/**
 * Headless Render Route for Playwright Frame Capture (Section 5 of Contract)
 * URL: /render/:reelId/:sceneIndex?token=...
 * Renders full-viewport at exactly 1280x720, no app navigation, solid background.
 * Sets `window.__DEVREEL_READY__ = true` when fonts, images, and scene are ready.
 */
export const RenderRoutePage: React.FC = () => {
  const { reelId, sceneIndex } = useParams<{ reelId: string; sceneIndex: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || undefined;

  const [payload, setPayload] = useState<RenderScenePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reelId) {
      setError('Missing reel_id parameter');
      return;
    }

    const sIndex = parseInt(sceneIndex || '0', 10);

    api
      .getRenderScene(reelId, sIndex, token)
      .then((data) => {
        setPayload(data);
      })
      .catch((err) => {
        console.error('Render token/scene fetch error', err);
        setError('403 Invalid or expired render token');
      });
  }, [reelId, sceneIndex, token]);

  if (error) {
    return (
      <div
        style={{ width: '1280px', height: '720px' }}
        className="flex items-center justify-center bg-black text-red-500 font-mono text-lg p-8"
      >
        [DevReel Render Engine Error] {error}
      </div>
    );
  }

  if (!payload) {
    return (
      <div
        style={{ width: '1280px', height: '720px' }}
        className="flex items-center justify-center bg-black text-zinc-600 font-mono text-sm"
      >
        Initializing deterministic scene canvas...
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${payload.width || 1280}px`,
        height: `${payload.height || 720}px`,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0A0B10',
      }}
    >
      <SceneRenderer
        scene={payload.scene}
        isCapturing={true}
        onReady={() => {
          if (typeof window !== 'undefined') {
            (window as any).__DEVREEL_READY__ = true;
          }
        }}
      />
    </div>
  );
};
