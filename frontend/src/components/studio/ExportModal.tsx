import React, { useState } from 'react';
import type { Reel } from '@/types/contract';
import { api } from '@/services/api';
import { Download, FileJson, Copy, Check, Share2, Film, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  reel: Reel;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<Props> = ({ reel, isOpen, onClose }) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    const fullScript = reel.scenes
      .map((s, i) => `[Scene ${i + 1}: ${s.title}]\n"${s.narration}"`)
      .join('\n\n');
    navigator.clipboard.writeText(fullScript);
    setCopiedScript(true);
    toast.success('Pitch script copied to clipboard!');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Reel share link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadJson = () => {
    const exportData = {
      project: reel.repo_name,
      title: reel.title,
      tagline: reel.tagline,
      summary: reel.summary,
      scenes: reel.scenes,
      understanding: reel.understanding,
      chart: reel.chart,
      exported_at: new Date().toISOString(),
      generator: 'DevReel AI Explainer',
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reel.repo_name.replace('/', '-')}-devreel-storyboard.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Storyboard JSON downloaded!');
  };

  const handleExportVideo = () => {
    if (reel.status !== 'completed') {
      toast.error('The final MP4 is not ready yet.');
      return;
    }

    setIsExportingVideo(true);
    try {
      const url = api.getVideoUrl(reel.id, reel);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reel.repo_name.replace('/', '-')}-explainer.mp4`;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.click();
      toast.success('DevReel explainer video download started!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not prepare the video download.');
    } finally {
      setIsExportingVideo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="neu-card w-full max-w-lg p-6 border border-border/50 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full neu-pressed flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center text-primary">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Export & Share DevReel</h3>
            <p className="text-xs text-muted-foreground">Download presentation media or extract storyboard assets</p>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Video Download */}
          <div className="p-4 rounded-xl neu-flat border border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg neu-pressed flex items-center justify-center text-primary">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Full Explainer Video</h4>
                <span className="text-[11px] text-muted-foreground">MP4 • 1280x720 • Synced Audio</span>
              </div>
            </div>
            <button
              onClick={handleExportVideo}
              disabled={isExportingVideo}
              className="neu-btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5"
            >
              {isExportingVideo ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4</span>
                </>
              )}
            </button>
          </div>

          {/* Storyboard JSON */}
          <div className="p-4 rounded-xl neu-flat border border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg neu-pressed flex items-center justify-center text-indigo-400">
                <FileJson className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Storyboard Data Schema</h4>
                <span className="text-[11px] text-muted-foreground">Full JSON scene specifications & chart</span>
              </div>
            </div>
            <button
              onClick={handleDownloadJson}
              className="neu-btn text-xs flex items-center gap-1.5 py-2 px-3.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>

          {/* Copy Script */}
          <div className="p-4 rounded-xl neu-flat border border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg neu-pressed flex items-center justify-center text-emerald-400">
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Voiceover Pitch Script</h4>
                <span className="text-[11px] text-muted-foreground">Copy all 7 scene narrations as plain text</span>
              </div>
            </div>
            <button
              onClick={handleCopyScript}
              className="neu-btn text-xs flex items-center gap-1.5 py-2 px-3.5"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Copied!' : 'Copy Script'}</span>
            </button>
          </div>

          {/* Share Link */}
          <div className="p-4 rounded-xl neu-flat border border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg neu-pressed flex items-center justify-center text-cyan-400">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Share Interactive Reel</h4>
                <span className="text-[11px] text-muted-foreground">Copy direct web studio URL</span>
              </div>
            </div>
            <button
              onClick={handleCopyLink}
              className="neu-btn text-xs flex items-center gap-1.5 py-2 px-3.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
