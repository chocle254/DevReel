import React from 'react';
import type { Scene } from '@/types/contract';
import { Sparkles, CheckCircle2, Zap, ArrowRight, Lightbulb } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  scene: Scene;
}

export const SolutionScene: React.FC<Props> = ({ scene }) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between p-10 md:p-14 bg-gradient-to-br from-background via-card to-background text-foreground overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-10 w-80 h-80 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center text-primary">
            <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">Scene 02</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{scene.title}</h3>
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full neu-flat text-xs font-semibold text-primary flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          The Breakthrough
        </div>
      </motion.div>

      {/* Main Core Headline & Pillars */}
      <div className="my-auto z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="md:col-span-7"
        >
          <span className="inline-block text-xs uppercase tracking-widest font-mono text-primary font-bold mb-2">
            The Concept
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-foreground mb-5">
            {scene.headline}
          </h1>
          <p className="text-base text-muted-foreground font-medium mb-6 leading-relaxed">
            Automatic codebase comprehension meets deterministic visual choreography. Turn raw files into cinematic, audience-ready product reels without video editing.
          </p>

          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-2 rounded-xl neu-flat text-xs font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Zero Video Editing</span>
            </div>
            <div className="px-4 py-2 rounded-xl neu-flat text-xs font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Grounded in Code Evidence</span>
            </div>
          </div>
        </motion.div>

        {/* Feature / transformation cards */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="md:col-span-5 flex flex-col gap-4"
        >
          {scene.items.length > 0 ? (
            scene.items.map((item, idx) => (
              <div key={idx} className="neu-card border border-primary/20 relative">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg neu-pressed shrink-0 flex items-center justify-center text-primary">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground mb-1">{item.label}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="neu-card border border-primary/30 p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Code → Story → Animated Reel</span>
              </div>
              <p className="text-xs text-muted-foreground">
                DevReel inspects routes, APIs, and dependencies to construct a structured pitch that makes the hardest technical concepts instantly clear.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-between text-xs text-muted-foreground z-10 pt-4 border-t border-border/40"
      >
        <span>Transforming repositories into narratives</span>
        <div className="flex items-center gap-1 text-primary font-medium">
          <span>See architecture flow</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </motion.div>
    </div>
  );
};
