import React from 'react';
import type { Scene } from '@/types/contract';
import { Cpu, Terminal, Database, Server, Wrench, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  scene: Scene;
}

const getTechIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('react') || n.includes('next') || n.includes('frontend') || n.includes('ui')) {
    return <Terminal className="w-5 h-5 text-cyan-400" />;
  }
  if (n.includes('sql') || n.includes('postgre') || n.includes('db') || n.includes('b2') || n.includes('storage')) {
    return <Database className="w-5 h-5 text-amber-400" />;
  }
  if (n.includes('fastapi') || n.includes('python') || n.includes('node') || n.includes('server') || n.includes('backend')) {
    return <Server className="w-5 h-5 text-indigo-400" />;
  }
  if (n.includes('ai') || n.includes('model') || n.includes('llm') || n.includes('nvidia') || n.includes('tts')) {
    return <Cpu className="w-5 h-5 text-fuchsia-400" />;
  }
  return <Wrench className="w-5 h-5 text-primary" />;
};

export const TechnologyScene: React.FC<Props> = ({ scene }) => {
  const items = scene.items && scene.items.length > 0
    ? scene.items
    : [
        { label: 'React + TypeScript', detail: 'Deterministic Scene Animation Engine' },
        { label: 'FastAPI Backend', detail: 'Repository scanner and AI story orchestrator' },
        { label: 'Playwright Capture', detail: 'Fixed 1280x720 headless browser frame recording' },
        { label: 'FFmpeg Assembler', detail: 'Multi-scene video concatenation and audio ducking' },
      ];

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 md:p-12 bg-gradient-to-br from-background via-card to-background text-foreground overflow-hidden select-none">
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center text-primary">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">Scene 05</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{scene.title}</h3>
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full neu-flat text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Full-Stack Blueprint
        </div>
      </motion.div>

      {/* Headline */}
      <div className="z-10 mt-2 mb-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight max-w-2xl">
          {scene.headline}
        </h2>
      </div>

      {/* Tech Grid */}
      <div className="my-auto z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
            className="neu-card p-5 flex flex-col justify-between border border-border/50 hover:border-primary/50 transition-all group"
          >
            <div>
              <div className="w-12 h-12 rounded-xl neu-pressed flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                {getTechIcon(item.label)}
              </div>
              <h4 className="font-bold text-sm md:text-base text-foreground mb-1">
                {item.label}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.detail}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>COMPONENT</span>
              <span className="text-primary font-bold">READY</span>
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
        <span>Engineered for reliability & scale</span>
        <div className="flex items-center gap-1 text-primary font-medium">
          <span>Inspect real impact</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </motion.div>
    </div>
  );
};
