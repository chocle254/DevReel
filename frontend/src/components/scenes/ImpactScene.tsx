import React from 'react';
import type { Scene } from '@/types/contract';
import { TrendingUp, Award, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  scene: Scene;
}

export const ImpactScene: React.FC<Props> = ({ scene }) => {
  const items = scene.items && scene.items.length > 0
    ? scene.items
    : [
        { label: '10x Faster Demos', detail: 'Turn code into an engaging pitch in minutes without hiring videographers.' },
        { label: 'Higher Comprehension', detail: 'Judges and investors grasp your architecture in 60 seconds.' },
        { label: '100% Fact-Checked', detail: 'Every claim links directly to genuine files within your repository.' },
      ];

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 md:p-12 bg-gradient-to-br from-background via-card to-background text-foreground overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute top-1/4 -right-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center text-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">Scene 06</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{scene.title}</h3>
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full neu-flat text-xs font-semibold text-foreground flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Measurable Value
        </div>
      </motion.div>

      {/* Headline */}
      <div className="z-10 mt-2 mb-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight max-w-2xl">
          {scene.headline}
        </h2>
      </div>

      {/* Impact Stats Grid */}
      <div className="my-auto z-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 + idx * 0.15 }}
            className="neu-card p-6 flex flex-col justify-between border border-border/50 hover:border-primary/50 transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold text-primary px-2.5 py-1 rounded-md neu-pressed">
                METRIC 0{idx + 1}
              </span>
              <CheckCircle className="w-4 h-4 text-primary/80" />
            </div>

            <div>
              <h3 className="text-xl md:text-2xl font-black text-foreground mb-2">
                {item.label}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                {item.detail}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-border/30 flex items-center text-[10px] text-primary font-semibold">
              <span>VERIFIED EVIDENCE</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-between text-xs text-muted-foreground z-10 pt-4 border-t border-border/40"
      >
        <span>Grounded in code facts</span>
        <div className="flex items-center gap-1 text-primary font-medium">
          <span>The closing pitch</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </motion.div>
    </div>
  );
};
