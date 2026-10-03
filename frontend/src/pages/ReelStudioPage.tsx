import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { Reel } from '@/types/contract';
import { ReelPlayer } from '@/components/studio/ReelPlayer';
import { StoryboardInspector } from '@/components/studio/StoryboardInspector';
import { ArchitectureGraph } from '@/components/studio/ArchitectureGraph';
import { ProjectDetails } from '@/components/studio/ProjectDetails';
import { ExportModal } from '@/components/studio/ExportModal';
import { ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const ReelStudioPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [reel, setReel] = useState<Reel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scenes' | 'graph' | 'details'>('scenes');
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    api
      .getReel(id)
      .then((data) => {
        setReel(data);
        setCurrentSceneIndex(0);
      })
      .catch((err) => {
        console.error('Failed to load reel', err);
        toast.error('Could not find reel');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleRegenerate = async () => {
    if (!reel) return;
    try {
      toast.info('Regenerating reel with latest code context...');
      const newReel = await api.regenerateReel(reel.id);
      navigate(`/new?reelId=${newReel.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Regeneration failed');
    }
  };

  const handleDelete = async () => {
    if (!reel) return;
    if (!confirm('Are you sure you want to delete this reel?')) return;
    try {
      await api.deleteReel(reel.id);
      toast.success('Reel deleted');
      navigate('/');
    } catch {
      toast.error('Failed to delete reel');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Sparkles className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Loading DevReel Studio workspace...</p>
      </div>
    );
  }

  if (!reel) {
    return (
      <div className="container mx-auto px-4 py-20 text-center neu-card max-w-md">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground mb-1">Reel Not Found</h3>
        <p className="text-xs text-muted-foreground mb-6">The requested reel does not exist or was deleted.</p>
        <button onClick={() => navigate('/')} className="neu-btn text-xs py-2 px-4">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const activeScene = reel.scenes?.[currentSceneIndex];
  const activeNodeIds = activeScene?.nodes?.map((n) => n.id) || [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Back button link */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground neu-flat px-3 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Library</span>
        </button>
      </div>

      {/* Main Studio Viewport & Player */}
      <ReelPlayer
        reel={reel}
        onRegenerate={handleRegenerate}
        onDelete={handleDelete}
        onOpenExport={() => setIsExportOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentSceneIndex={currentSceneIndex}
        setCurrentSceneIndex={setCurrentSceneIndex}
      />

      {/* Tab Panels */}
      <div className="mt-8">
        {activeTab === 'scenes' && (
          <StoryboardInspector
            scenes={reel.scenes || []}
            currentSceneIndex={currentSceneIndex}
            onSelectScene={(idx) => setCurrentSceneIndex(idx)}
          />
        )}

        {activeTab === 'graph' && (
          <ArchitectureGraph
            chart={reel.chart}
            understanding={reel.understanding}
            activeSceneNodeIds={activeNodeIds}
          />
        )}

        {activeTab === 'details' && <ProjectDetails reel={reel} />}
      </div>

      {/* Export Modal */}
      <ExportModal
        reel={reel}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
