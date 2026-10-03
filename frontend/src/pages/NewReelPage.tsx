import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { Reel } from '@/types/contract';
import { NewReelForm } from '@/components/generator/NewReelForm';
import { GenerationProgress } from '@/components/generator/GenerationProgress';
import { toast } from 'sonner';

export const NewReelPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingReelId = searchParams.get('reelId');

  const [activeReel, setActiveReel] = useState<Reel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If a reelId is provided in URL query, resume monitoring that job
  useEffect(() => {
    if (!existingReelId) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    api
      .getReel(existingReelId)
      .then((reel) => {
        if (cancelled) return;
        setActiveReel(reel);

        if (reel.status === 'completed') {
          navigate(`/reel/${reel.id}`);
          return;
        }

        if (reel.status !== 'failed') {
          unsubscribe = startListening(reel.id);
        }
      })
      .catch((err) => {
        console.error('Failed to load existing reel', err);
        toast.error(err?.message || 'Could not resume reel generation');
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [existingReelId, navigate]);

  const startListening = (reelId: string) => {
    const unsub = api.subscribeToReelEvents(
      reelId,
      (updatedReel) => {
        setActiveReel(updatedReel);
        if (updatedReel.status === 'completed') {
          toast.success('Generation finished! Opening Reel Studio...');
          setTimeout(() => {
            navigate(`/reel/${updatedReel.id}`);
          }, 1200);
        }
      },
      (err) => {
        console.error('SSE connection event error', err);
      }
    );
    return unsub;
  };

  const handleStartGeneration = async (repoUrl: string) => {
    try {
      setIsSubmitting(true);
      const newReel = await api.createReel(repoUrl);
      setActiveReel(newReel);
      toast.info('Repository queued for analysis');
      startListening(newReel.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start generation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (activeReel) {
      handleStartGeneration(activeReel.repo_url);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      {!activeReel ? (
        <NewReelForm onSubmit={handleStartGeneration} isLoading={isSubmitting} />
      ) : (
        <GenerationProgress
          reel={activeReel}
          onRetry={handleRetry}
          onViewCompleted={() => navigate(`/reel/${activeReel.id}`)}
        />
      )}
    </div>
  );
};
