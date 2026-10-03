import React from 'react';
import type { Scene } from '@/types/contract';
import { Star, ShieldCheck, Zap, Layers, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  scene: Scene;
}

const icons = [Star, Zap, Layers, ShieldCheck];

export const FeatureScene: React.FC<Props> = ({ scene }) => {
  const items = scene.items && scene.items.length > 0
    ? scene.items
    : [
        { label: 'Single-Input Workflow', detail: 'Feed any public GitHub URL and receive a structured story.' },
        { label: 'Deterministic Visuals', detail: 'Precise SVG animations without unstable video hallucinations.' },
        { label: 'Evidence Grounded', detail: 'Every architectural claim links directly back to codebase files.' },
        { label: 'Instant Video Export', detail: 'Download ready-to-pitch MP4s for hackathons and demo days.' },
      ];

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 md:p-12 bg-gradient-to-br from-background via-card to-background text-foreground overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute top-10 right-10 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">Scene 04</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{scene.title}</h3>
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full neu-flat text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
          Core Pillars
        </div>
      </motion.div>

      {/* Headline */}
      <div className="z-10 mt-2 mb-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight max-w-2xl">
          {scene.headline}
        </h2>
      </div>

      {/* Features Bento Grid */}
      <div className="my-auto z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.slice(0, 4).map((item, idx) => {
          const Icon = icons[idx % icons.length];
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + idx * 0.12 }}
              className="neu-card p-5 relative border border-border/50 hover:border-primary/40 transition-all flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl neu-pressed shrink-0 flex items-center justify-center text-primary">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-base text-foreground">{item.label}</h4>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 neu-flat rounded">
                    0{idx + 1}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-between text-xs text-muted-foreground z-10 pt-4 border-t border-border/40"
      >
        <span>Engineered for impact</span>
        <div className="flex items-center gap-1 text-primary font-medium">
          <span>View technology stack</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </motion.div>
    </div>
  );
};
