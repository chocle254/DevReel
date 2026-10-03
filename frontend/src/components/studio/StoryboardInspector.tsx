import React from 'react';
import type { Scene } from '@/types/contract';
import { Play, Clock, Volume2, Sparkles, AlertTriangle, GitFork, Star, Cpu, TrendingUp, Film } from 'lucide-react';

interface Props {
  scenes: Scene[];
  currentSceneIndex: number;
  onSelectScene: (index: number) => void;
}

const getSceneIcon = (type: string) => {
  switch (type) {
    case 'problem':
      return <AlertTriangle className="w-4 h-4 text-destructive" />;
    case 'solution':
      return <Sparkles className="w-4 h-4 text-primary" />;
    case 'flow':
      return <GitFork className="w-4 h-4 text-cyan-400" />;
    case 'feature':
      return <Star className="w-4 h-4 text-amber-400" />;
    case 'technology':
      return <Cpu className="w-4 h-4 text-indigo-400" />;
    case 'impact':
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    case 'closing':
      return <Film className="w-4 h-4 text-fuchsia-400" />;
    default:
      return <Sparkles className="w-4 h-4 text-primary" />;
  }
};

export const StoryboardInspector: React.FC<Props> = ({
  scenes,
  currentSceneIndex,
  onSelectScene,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div>
          <h4 className="text-sm font-bold text-foreground">7-Scene Storyboard Track</h4>
          <p className="text-xs text-muted-foreground">Select a scene to jump and inspect narrative parameters</p>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 neu-flat rounded-full text-primary">
          {scenes.length} Scenes
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {scenes.map((scene, idx) => {
          const isActive = idx === currentSceneIndex;

          return (
            <div
              key={scene.index || idx}
              onClick={() => onSelectScene(idx)}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${
                isActive
                  ? 'neu-pressed border-primary text-foreground ring-1 ring-primary/40'
                  : 'neu-flat border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg neu-pressed flex items-center justify-center">
                    {getSceneIcon(scene.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-primary tracking-wider">
                      Scene 0{idx + 1} • {scene.type}
                    </span>
                    <h5 className="font-bold text-xs md:text-sm text-foreground line-clamp-1">
                      {scene.title}
                    </h5>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground neu-flat px-2 py-0.5 rounded">
                  <Clock className="w-3 h-3" />
                  <span>{scene.duration_seconds}s</span>
                </div>
              </div>

              {/* Headline */}
              <p className="text-xs font-medium text-foreground line-clamp-1 mb-2">
                "{scene.headline}"
              </p>

              {/* Narration voiceover preview */}
              <div className="bg-background/50 p-2.5 rounded-lg border border-border/30 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                <Volume2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="line-clamp-2 italic">{scene.narration}</p>
              </div>

              {/* Status active banner */}
              {isActive && (
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-primary font-bold">
                  <span className="flex items-center gap-1">
                    <Play className="w-3 h-3 fill-primary" />
                    CURRENTLY PLAYING
                  </span>
                  <span className="font-mono">T = {scene.duration_seconds}s</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
