import React, { useEffect, useRef } from 'react';
import type { Scene } from '@/types/contract';
import { ProblemScene } from './ProblemScene';
import { SolutionScene } from './SolutionScene';
import { FlowScene } from './FlowScene';
import { FeatureScene } from './FeatureScene';
import { TechnologyScene } from './TechnologyScene';
import { ImpactScene } from './ImpactScene';
import { ClosingScene } from './ClosingScene';

interface SceneRendererProps {
  scene: Scene;
  repoUrl?: string;
  repoName?: string;
  progressPercent?: number; // 0 to 100 for current scene progress
  isCapturing?: boolean; // For Playwright capture mode
  onReady?: () => void;
}

export const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  repoUrl,
  repoName,
  progressPercent = 0,
  isCapturing = false,
  onReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // When scene loads and renders initial frame:
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        (window as any).__DEVREEL_READY__ = true;
      }
      if (onReady) onReady();
    }, 150);

    return () => clearTimeout(timer);
  }, [scene.index, onReady]);

  const renderSceneContent = () => {
    switch (scene.type) {
      case 'problem':
        return <ProblemScene scene={scene} />;
      case 'solution':
        return <SolutionScene scene={scene} />;
      case 'flow':
        return <FlowScene scene={scene} />;
      case 'feature':
        return <FeatureScene scene={scene} />;
      case 'technology':
        return <TechnologyScene scene={scene} />;
      case 'impact':
        return <ImpactScene scene={scene} />;
      case 'closing':
        return <ClosingScene scene={scene} repoUrl={repoUrl} repoName={repoName} />;
      default:
        return <FeatureScene scene={scene} />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-background text-foreground ${
        isCapturing ? 'cursor-none select-none' : ''
      }`}
      style={{
        width: isCapturing ? '1280px' : '100%',
        height: isCapturing ? '720px' : '100%',
        aspectRatio: '16 / 9',
      }}
    >
      {/* The Scene Canvas */}
      {renderSceneContent()}

      {/* Subtitles Overlay if Narration exists */}
      {scene.narration && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-2xl w-[90%] z-30 pointer-events-none">
          <div className="bg-background/85 backdrop-blur-md px-4 py-2 rounded-xl border border-border/50 text-center shadow-lg">
            <p className="text-xs md:text-sm font-medium text-foreground tracking-wide leading-relaxed">
              "{scene.narration}"
            </p>
          </div>
        </div>
      )}

      {/* Scene Progress Bar */}
      {progressPercent !== undefined && progressPercent > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-border/30 z-30">
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
};
