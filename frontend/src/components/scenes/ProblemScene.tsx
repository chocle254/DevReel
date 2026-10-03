import React from 'react';
import type { Scene } from '@/types/contract';
import { AlertTriangle, Flame, ShieldAlert, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  scene: Scene;
}

export const ProblemScene: React.FC<Props> = ({ scene }) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between p-10 md:p-14 bg-gradient-to-br from-background via-card to-background text-foreground overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-destructive/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center text-destructive">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-destructive/90">Scene 01</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{scene.title}</h3>
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full neu-flat text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive animate-ping" />
          Pain Point Analysis
        </div>
      </motion.div>

      {/* Main Core Headline */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="my-auto z-10"
      >
        <div className="max-w-3xl">
          <span className="inline-block text-xs uppercase tracking-widest font-mono text-muted-foreground mb-2">
            The Bottleneck
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-foreground mb-4">
            {scene.headline}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground font-medium">
            Great engineering is lost in translation when repositories can’t be understood in under 60 seconds.
          </p>
        </div>

        {/* Pain points grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
          {scene.items.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + idx * 0.15 }}
              className="neu-card border border-destructive/20 relative group hover:border-destructive/40 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg neu-pressed shrink-0 flex items-center justify-center text-destructive/80 font-mono text-sm font-bold">
                  0{idx + 1}
                </div>
                <div>
                  <h4 className="font-bold text-base text-foreground mb-1 flex items-center gap-1.5">
                    {item.label}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
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
          <ShieldAlert className="w-4 h-4 text-destructive/70" />
          <span>Friction in Developer Discovery</span>
        </div>
        <div className="flex items-center gap-1 text-primary font-medium">
          <span>A solution is needed</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </motion.div>
    </div>
  );
};
