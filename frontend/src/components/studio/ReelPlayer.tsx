import React, { useState, useEffect, useRef } from 'react';
import type { Reel, Scene } from '@/types/contract';
import { SceneRenderer } from '../scenes/SceneRenderer';
import { audioPlayer } from '@/services/audioPlayer';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Download,
  Trash2,
  Sparkles,
  Subtitles,
  Music,
  Gauge,
  Layers,
  FileText,
  GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  reel: Reel;
  onRegenerate: () => void;
  onDelete: () => void;
  onOpenExport: () => void;
  activeTab: 'scenes' | 'graph' | 'details';
  setActiveTab: (tab: 'scenes' | 'graph' | 'details') => void;
  currentSceneIndex: number;
  setCurrentSceneIndex: (idx: number) => void;
}

export const ReelPlayer: React.FC<Props> = ({
  reel,
  onRegenerate,
  onDelete,
  onOpenExport,
  activeTab,
  setActiveTab,
  currentSceneIndex,
  setCurrentSceneIndex,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [narrationEnabled, setNarrationEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [sceneProgress, setSceneProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const scenes = reel.scenes && reel.scenes.length > 0 ? reel.scenes : [];
  const activeScene: Scene = scenes[currentSceneIndex] || scenes[0];

  // Calculate cumulative scene offsets
  const sceneDurations = scenes.map((s) => s.duration_seconds || 8);
  const totalDuration = sceneDurations.reduce((acc, d) => acc + d, 0);

  // Manage playback timer & scene progression
  useEffect(() => {
    if (!isPlaying || scenes.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      audioPlayer.stopNarration();
      return;
    }

    const sceneDuration = (activeScene.duration_seconds || 8) * (1 / playbackSpeed);
    startTimeRef.current = Date.now();
    setSceneProgress(0);

    // Speak narration if enabled
    if (narrationEnabled && activeScene.narration) {
      audioPlayer.speakNarration(
        activeScene.narration,
        () => {
          // Voice ended naturally
        },
        playbackSpeed
      );
    }

    // Progress interval (updates every 50ms)
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const pct = (elapsed / sceneDuration) * 100;

      if (pct >= 100) {
        setSceneProgress(100);
        // Move to next scene or loop
        if (currentSceneIndex < scenes.length - 1) {
          setCurrentSceneIndex(currentSceneIndex + 1);
        } else {
          setIsPlaying(false);
          toast.success('Explainer reel presentation complete!');
        }
      } else {
        setSceneProgress(pct);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentSceneIndex, playbackSpeed, narrationEnabled, activeScene, scenes.length, setCurrentSceneIndex]);

  // Handle ambient soundtrack
  useEffect(() => {
    if (isPlaying && musicEnabled && !isMuted) {
      const musicMood = typeof reel.music_track === 'string' ? reel.music_track : reel.music_track?.mood || 'Cinematic';
      audioPlayer.startSoundtrack(musicMood);
    } else {
      audioPlayer.stopSoundtrack();
    }
    return () => {
      audioPlayer.stopSoundtrack();
    };
  }, [isPlaying, musicEnabled, isMuted, reel.music_track?.mood]);

  const togglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      toast.info('Starting cinematic playback with narration & music');
    } else {
      setIsPlaying(false);
      audioPlayer.pauseAll();
    }
  };

  const handleNext = () => {
    if (currentSceneIndex < scenes.length - 1) {
      setCurrentSceneIndex(currentSceneIndex + 1);
      setSceneProgress(0);
    }
  };

  const handlePrev = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(currentSceneIndex - 1);
      setSceneProgress(0);
    }
  };

  const handleToggleMute = () => {
    const muted = audioPlayer.toggleMute();
    setIsMuted(muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioPlayer.setVolume(val);
    if (isMuted && val > 0) {
      setIsMuted(false);
      audioPlayer.toggleMute();
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen error', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="space-y-4">
      {/* Cinematic Viewport Canvas */}
      <div
        ref={containerRef}
        className="neu-card p-2 md:p-3 relative overflow-hidden rounded-2xl border border-border/60 shadow-2xl bg-black"
      >
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-background">
          {activeScene ? (
            <SceneRenderer
              scene={activeScene}
              repoUrl={reel.repo_url}
              repoName={reel.repo_name}
              progressPercent={sceneProgress}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No scenes available
            </div>
          )}

          {/* Quick overlay controls on hover */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            <div className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono font-bold text-primary border border-border/50 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>
                Scene {currentSceneIndex + 1} of {scenes.length}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Scrubber Bar with Scene Anchors */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5 w-full">
            {scenes.map((s, idx) => {
              const isPast = idx < currentSceneIndex;
              const isCur = idx === currentSceneIndex;
              return (
                <button
                  key={s.index || idx}
                  onClick={() => {
                    setCurrentSceneIndex(idx);
                    setSceneProgress(0);
                  }}
                  title={`Jump to Scene ${idx + 1}: ${s.title}`}
                  className="relative flex-1 h-2 rounded-full overflow-hidden neu-pressed group transition-all"
                >
                  <div
                    className={`h-full transition-all ${
                      isPast
                        ? 'bg-primary'
                        : isCur
                        ? 'bg-primary'
                        : 'bg-transparent group-hover:bg-primary/30'
                    }`}
                    style={{
                      width: isCur ? `${sceneProgress}%` : isPast ? '100%' : '0%',
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Studio Player Control Bar */}
        <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-foreground">
          {/* Left: Play / Pause / Skips */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentSceneIndex === 0}
              className="neu-icon-btn w-9 h-9 disabled:opacity-40"
              title="Previous Scene"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="neu-btn-primary w-11 h-11 !rounded-full flex items-center justify-center text-primary-foreground"
              title={isPlaying ? 'Pause' : 'Play Explainer'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              onClick={handleNext}
              disabled={currentSceneIndex >= scenes.length - 1}
              className="neu-icon-btn w-9 h-9 disabled:opacity-40"
              title="Next Scene"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Time Indicator */}
            <div className="text-xs font-mono text-muted-foreground ml-2 hidden sm:block">
              <span className="text-foreground font-semibold">
                {activeScene ? Math.round(((activeScene.duration_seconds || 8) * sceneProgress) / 100) : 0}s
              </span>
              {' / '}
              <span>{Math.round(totalDuration)}s Total</span>
            </div>
          </div>

          {/* Center: Audio & Speech Options */}
          <div className="flex items-center gap-2">
            {/* Audio narration speech toggle */}
            <button
              onClick={() => {
                const next = !narrationEnabled;
                setNarrationEnabled(next);
                if (!next) audioPlayer.stopNarration();
                toast.info(`Neural Voiceover ${next ? 'Enabled' : 'Disabled'}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                narrationEnabled
                  ? 'neu-pressed text-primary border border-primary/30'
                  : 'neu-flat text-muted-foreground'
              }`}
              title="Toggle AI Speech Narration"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Voiceover</span>
            </button>

            {/* Ambient soundtrack toggle */}
            <button
              onClick={() => {
                const next = !musicEnabled;
                setMusicEnabled(next);
                toast.info(`Soundtrack ${next ? 'Enabled' : 'Disabled'}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                musicEnabled
                  ? 'neu-pressed text-primary border border-primary/30'
                  : 'neu-flat text-muted-foreground'
              }`}
              title="Toggle Background Soundtrack"
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Soundtrack</span>
            </button>

            {/* Volume slider */}
            <div className="flex items-center gap-1.5 neu-flat px-2 py-1 rounded-lg">
              <button onClick={handleToggleMute} className="text-muted-foreground hover:text-foreground">
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-destructive" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 md:w-16 h-1 accent-primary cursor-pointer"
              />
            </div>
          </div>

          {/* Right: Speed, Fullscreen, Export */}
          <div className="flex items-center gap-2">
            {/* Speed selector */}
            <div className="flex items-center gap-1 neu-flat px-2 py-1 rounded-lg text-xs font-mono">
              <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
              >
                <option value="0.75" className="bg-card text-foreground">0.75x</option>
                <option value="1.0" className="bg-card text-foreground">1.0x</option>
                <option value="1.25" className="bg-card text-foreground">1.25x</option>
                <option value="1.5" className="bg-card text-foreground">1.5x</option>
              </select>
            </div>

            <button
              onClick={handleFullscreen}
              className="neu-icon-btn w-9 h-9"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenExport}
              className="neu-btn-primary py-2 px-3 text-xs flex items-center gap-1.5"
              title="Export & Download"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reel Header Info & Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 neu-card border border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full neu-pressed text-[10px] font-mono font-bold text-primary uppercase">
              {reel.repo_name}
            </span>
            <span className="text-xs text-muted-foreground">
              Duration: {Math.round(totalDuration)}s
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            {reel.title || reel.repo_name}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{reel.tagline || reel.summary}</p>
        </div>

        {/* Action Buttons: Regenerate & Delete */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={onRegenerate}
            className="neu-btn py-2 px-3 text-xs flex items-center gap-1.5"
            title="Generate a new reel with latest repository state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Regenerate</span>
          </button>

          <button
            onClick={onDelete}
            className="neu-btn py-2 px-3 text-xs text-destructive hover:text-destructive flex items-center gap-1.5"
            title="Delete this reel"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation: Storyboard, Architecture Graph, Project Details */}
      <div className="flex items-center gap-2 p-1.5 neu-flat rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab('scenes')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'scenes'
              ? 'neu-pressed text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Storyboard Track</span>
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'graph'
              ? 'neu-pressed text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Architecture Graph</span>
        </button>

        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'details'
              ? 'neu-pressed text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Deep Insights</span>
        </button>
      </div>
    </div>
  );
};
