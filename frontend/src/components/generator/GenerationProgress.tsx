import React, { useEffect, useState } from 'react';
import type { Reel, ReelStatus } from '@/types/contract';
import {
  GitBranch,
  Search,
  BookOpen,
  Volume2,
  Music,
  Film,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface Props {
  reel: Reel;
  onRetry: () => void;
  onContinue: () => void;
  onViewCompleted: () => void;
}

const STAGES: { status: ReelStatus; label: string; icon: any; range: string }[] = [
  { status: 'queued', label: 'Queued in pipeline', icon: GitBranch, range: '0%' },
  { status: 'analyzing', label: 'Understanding the project', icon: Search, range: '3-30%' },
  { status: 'planning', label: 'Building the story arc', icon: BookOpen, range: '30-45%' },
  { status: 'generating_narration', label: 'Synthesizing voiceover narration', icon: Volume2, range: '45-58%' },
  { status: 'selecting_music', label: 'Curating soundtrack', icon: Music, range: '58-62%' },
  { status: 'rendering', label: 'Rendering deterministic scenes', icon: Film, range: '62-88%' },
  { status: 'assembling', label: 'Assembling audio & video', icon: Layers, range: '88-96%' },
  { status: 'uploading', label: 'Finalizing explainer reel', icon: Sparkles, range: '96-100%' },
];

export const GenerationProgress: React.FC<Props> = ({ reel, onRetry, onContinue, onViewCompleted }) => {
  const isFailed = reel.status === 'failed';
  const isCompleted = reel.status === 'completed';

  const getStageIndex = (status: ReelStatus) => {
    return STAGES.findIndex((s) => s.status === status);
  };

  const currentIdx = getStageIndex(reel.status);
  const currentStage = STAGES[Math.max(0, currentIdx)] ?? STAGES[0];
  const CurrentStageIcon = currentStage.icon;

  const ACTIVITY_MESSAGES: Record<ReelStatus, string[]> = {
    queued: ['Preparing the generation pipeline...', 'Getting your project ready...'],
    analyzing: [
      'Reading the project structure...',
      'Finding the pieces that make the product work...',
      'Connecting features, data, and user flows...',
    ],
    planning: [
      'Finding the story inside your codebase...',
      'Turning the project understanding into a visual narrative...',
      'Structuring the journey from problem to solution...',
    ],
    generating_narration: [
      'Giving each scene a voice...',
      'Matching narration to the story beats...',
      'Preparing the voiceover for the reel...',
    ],
    selecting_music: [
      'Finding a soundtrack that fits the story...',
      'Setting the mood for your explainer...',
    ],
    rendering: [
      'Bringing the story to life...',
      'Rendering the animated scenes...',
      'Turning the scene plan into visuals...',
    ],
    assembling: [
      'Combining scenes, narration, and music...',
      'Polishing the final sequence...',
      'Putting the finished reel together...',
    ],
    uploading: [
      'Putting the finishing touches on your reel...',
      'Preparing your finished explainer...',
    ],
    completed: ['Your DevReel is ready.'],
    failed: ['The generation needs attention.'],
  };

  const [activityIndex, setActivityIndex] = useState(0);

  useEffect(() => {
    setActivityIndex(0);
    if (isFailed || isCompleted) return;

    const messages = ACTIVITY_MESSAGES[reel.status] ?? ['Working on your DevReel...'];
    if (messages.length < 2) return;

    const timer = window.setInterval(() => {
      setActivityIndex((index) => (index + 1) % messages.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [reel.status, isFailed, isCompleted]);

  const activityMessages = ACTIVITY_MESSAGES[reel.status] ?? ['Working on your DevReel...'];
  const activityMessage = activityMessages[activityIndex % activityMessages.length];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Top Card: Progress & Current Stage */}
      <div className="neu-card p-6 md:p-8 border border-border/50 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold text-primary px-2.5 py-0.5 rounded-full neu-pressed uppercase">
                {reel.repo_name}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                ID: {reel.id.substring(0, 12)}
              </span>
            </div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              {isFailed ? 'Generation Encountered an Issue' : isCompleted ? 'Explainer Reel Ready!' : 'Synthesizing DevReel'}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {reel.stage_label || 'Processing pipeline stages...'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-3xl md:text-4xl font-black font-mono text-primary">
              {reel.progress}%
            </span>
          </div>
        </div>

        {!isFailed && !isCompleted && (
          <div className="mb-7 rounded-2xl border border-primary/15 bg-primary/[0.035] p-4 md:p-5 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-[generation-shimmer_2.8s_ease-in-out_infinite]" />
            <div className="relative flex items-center gap-4">
              <div className="relative w-11 h-11 shrink-0 rounded-2xl neu-pressed flex items-center justify-center text-primary">
                <CurrentStageIcon className="w-5 h-5" />
                <span className="absolute inset-0 rounded-2xl border border-primary/30 animate-pulse" />
                <span className="absolute -right-1 -top-1 flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce" />
                  <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce [animation-delay:120ms]" />
                  <span className="w-1 h-1 rounded-full bg-primary/30 animate-bounce [animation-delay:240ms]" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                    DevReel is working
                  </span>
                  <span className="flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary/80 animate-pulse" />
                    <span className="w-1 h-1 rounded-full bg-primary/50 animate-pulse [animation-delay:200ms]" />
                    <span className="w-1 h-1 rounded-full bg-primary/30 animate-pulse [animation-delay:400ms]" />
                  </span>
                </div>
                <p className="mt-1 text-sm md:text-[15px] font-semibold text-foreground">
                  {activityMessage}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {currentStage.label} · This can take a few minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Global Progress Bar */}
        <style>{`
          @keyframes generation-shimmer {
            0% { transform: translateX(-120%); }
            55%, 100% { transform: translateX(420%); }
          }
        `}</style>

        <div className="w-full h-3 rounded-full neu-track overflow-hidden mb-8 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isFailed ? 'bg-destructive' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, reel.progress))}%` }}
          />
        </div>

        {/* Pipeline Stage Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isStageCompleted = currentIdx > idx || isCompleted;
            const isStageActive = currentIdx === idx && !isCompleted && !isFailed;

            return (
              <div
                key={stage.status}
                className={`p-3 rounded-xl border transition-all ${
                  isStageActive
                    ? 'neu-pressed border-primary text-foreground ring-1 ring-primary/40'
                    : isStageCompleted
                    ? 'neu-flat border-primary/20 text-foreground'
                    : 'neu-flat border-border/30 text-muted-foreground opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-lg neu-pressed flex items-center justify-center ${
                    isStageActive ? 'text-primary' : isStageCompleted ? 'text-emerald-400' : 'text-muted-foreground'
                  }`}>
                    {isStageCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    0{idx + 1}
                  </span>
                </div>
                <h5 className="font-bold text-xs text-foreground line-clamp-1">{stage.label}</h5>
                <span className="text-[10px] font-mono text-muted-foreground">{stage.range}</span>
              </div>
            );
          })}
        </div>

        {/* Success Action */}
        {isCompleted && (
          <div className="mt-8 p-4 rounded-xl neu-pressed border border-primary/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full neu-flat flex items-center justify-center text-primary">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Generation Finished Successfully</h4>
                <p className="text-xs text-muted-foreground">Your 7-scene cinematic explainer is ready to view.</p>
              </div>
            </div>
            <button
              onClick={onViewCompleted}
              className="neu-btn-primary px-5 py-2.5 text-xs font-bold"
            >
              Open Reel Studio
            </button>
          </div>
        )}

        {/* Error State */}
        {isFailed && (
          <div className="mt-8 p-4 rounded-xl neu-pressed border border-destructive/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full neu-flat flex items-center justify-center text-destructive">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-destructive">
                  {reel.error?.code || 'Generation Failed'}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {reel.error?.message || 'An error occurred while analyzing the repository.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onContinue}
                className="neu-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Continue</span>
              </button>
              <button
                onClick={onRetry}
                className="neu-btn px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start over</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Activity Log Area */}
      <div className="neu-card p-5 border border-border/50">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
            <Terminal className="w-4 h-4 text-primary" />
            <span>Real-time Pipeline Activity Logs</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {reel.logs?.length || 0} events
          </span>
        </div>

        <div className="bg-background/80 rounded-xl p-3.5 font-mono text-xs max-h-56 overflow-y-auto space-y-2 border border-border/40">
          {reel.logs && reel.logs.length > 0 ? (
            reel.logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-[11px] leading-relaxed">
                <span className="text-muted-foreground/60 shrink-0 select-none">
                  [{log.ts ? new Date(log.ts).toLocaleTimeString() : '00:00:00'}]
                </span>
                <span className={`shrink-0 font-bold uppercase text-[10px] ${
                  log.level === 'error' ? 'text-destructive' : log.level === 'warn' ? 'text-amber-400' : 'text-primary'
                }`}>
                  {log.level}:
                </span>
                <span className="text-foreground/90">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground italic text-center py-4">
              Waiting for worker logs...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* Scoped animation used by the live generation indicator. */

