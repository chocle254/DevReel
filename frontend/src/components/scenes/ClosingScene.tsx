import React from 'react';
import type { Scene } from '@/types/contract';
import { Film, Github, Sparkles, ArrowRight, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  scene: Scene;
  repoUrl?: string;
  repoName?: string;
}

export const ClosingScene: React.FC<Props> = ({ scene, repoUrl, repoName }) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 md:p-14 bg-gradient-to-br from-background via-card to-background text-foreground overflow-hidden select-none">
      {/* Dynamic ambient lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center text-primary">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">Final Scene</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{scene.title}</h3>
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full neu-flat text-xs font-semibold text-primary flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          The Pitch
        </div>
      </motion.div>

      {/* Center Cinematic Callout */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="my-auto text-center z-10 max-w-2xl mx-auto flex flex-col items-center"
      >
        <span className="px-3 py-1 rounded-full neu-pressed text-[11px] font-mono font-bold text-primary uppercase tracking-widest mb-4">
          « Turn your code into a story worth watching »
        </span>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-foreground mb-4">
          {scene.headline}
        </h1>

        <p className="text-sm md:text-base text-muted-foreground font-medium mb-8 leading-relaxed max-w-lg">
          Code tells computers what a product does. A README tells developers what a product does. DevReel tells everyone else.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="neu-btn-primary flex items-center gap-2.5 text-sm"
            >
              <Github className="w-4 h-4" />
              <span>Explore on GitHub</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
          <div className="neu-flat px-4 py-2.5 rounded-lg text-xs font-semibold text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Built with DevReel</span>
          </div>
        </div>
      </motion.div>

      {/* Footer bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-between text-xs text-muted-foreground z-10 pt-4 border-t border-border/40"
      >
        <div className="flex items-center gap-2">
          <span>Project:</span>
          <span className="font-semibold text-foreground font-mono">{repoName || 'DevReel'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-primary font-medium">
          <span>Cinematic Explainer Complete</span>
          <Heart className="w-3.5 h-3.5 fill-primary text-primary" />
        </div>
      </motion.div>
    </div>
  );
};
