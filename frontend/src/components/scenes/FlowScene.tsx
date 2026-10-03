import React from 'react';
import type { Scene } from '@/types/contract';
import { GitFork, Cpu, Layers, Database, Globe, User, Terminal, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  scene: Scene;
}

const getKindIcon = (kind: string) => {
  switch (kind) {
    case 'actor':
      return <User className="w-4 h-4 text-emerald-400" />;
    case 'ui':
      return <Terminal className="w-4 h-4 text-cyan-400" />;
    case 'service':
      return <Layers className="w-4 h-4 text-indigo-400" />;
    case 'ai':
      return <Cpu className="w-4 h-4 text-fuchsia-400" />;
    case 'database':
      return <Database className="w-4 h-4 text-amber-400" />;
    case 'external':
      return <Globe className="w-4 h-4 text-rose-400" />;
    default:
      return <GitFork className="w-4 h-4 text-primary" />;
  }
};

const getKindBadge = (kind: string) => {
  switch (kind) {
    case 'actor':
      return 'border-emerald-500/30 text-emerald-300';
    case 'ui':
      return 'border-cyan-500/30 text-cyan-300';
    case 'service':
      return 'border-indigo-500/30 text-indigo-300';
    case 'ai':
      return 'border-fuchsia-500/30 text-fuchsia-300';
    case 'database':
      return 'border-amber-500/30 text-amber-300';
    case 'external':
      return 'border-rose-500/30 text-rose-300';
    default:
      return 'border-primary/30 text-primary';
  }
};

export const FlowScene: React.FC<Props> = ({ scene }) => {
  const nodes = scene.nodes && scene.nodes.length > 0
    ? scene.nodes
    : [
        { id: 'client', label: 'User Request', kind: 'actor' as const },
        { id: 'gateway', label: 'API Gateway', kind: 'service' as const },
        { id: 'ai', label: 'Story AI', kind: 'ai' as const },
        { id: 'db', label: 'Persistence', kind: 'database' as const },
      ];

  const connections = scene.connections && scene.connections.length > 0
    ? scene.connections
    : [
        { from: 'client', to: 'gateway', label: 'HTTP / API' },
        { from: 'gateway', to: 'ai', label: 'Context' },
        { from: 'ai', to: 'db', label: 'Artifacts' },
      ];

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 md:p-12 bg-gradient-to-br from-background via-card to-background text-foreground overflow-hidden select-none">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center text-primary">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-primary">Scene 03</span>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{scene.title}</h3>
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full neu-flat text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Interactive Architecture Flow
        </div>
      </motion.div>

      {/* Headline */}
      <div className="z-10 mt-2 mb-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight max-w-2xl">
          {scene.headline}
        </h2>
      </div>

      {/* Flow Diagram Stage */}
      <div className="my-auto z-10 relative w-full py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 items-center">
          {nodes.map((node, idx) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + idx * 0.12 }}
              className="neu-card p-4 flex flex-col items-center text-center relative group hover:border-primary/50 transition-all border border-border/50"
            >
              {/* Node index */}
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background/90 text-[10px] font-mono border border-border shadow-sm">
                0{idx + 1}
              </div>

              {/* Icon */}
              <div className="w-11 h-11 rounded-xl neu-pressed flex items-center justify-center mb-3 mt-1">
                {getKindIcon(node.kind)}
              </div>

              {/* Title & Kind */}
              <h4 className="font-bold text-xs md:text-sm text-foreground line-clamp-1 mb-1">
                {node.label}
              </h4>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${getKindBadge(node.kind)}`}>
                {node.kind}
              </span>

              {/* Flow connector indicator if not last */}
              {idx < nodes.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-card border border-primary/40 items-center justify-center text-primary shadow-sm">
                  <ArrowRight className="w-3 h-3 animate-pulse" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Connections overview summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 flex flex-wrap gap-2 justify-center"
        >
          {connections.slice(0, 4).map((c, i) => (
            <div
              key={i}
              className="neu-flat px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground flex items-center gap-1.5 border border-border/40"
            >
              <span className="font-semibold text-foreground">{c.from}</span>
              <span className="text-primary font-mono">→</span>
              <span className="font-semibold text-foreground">{c.to}</span>
              <span className="text-muted-foreground/70 font-mono text-[10px]">({c.label})</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Footer bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-between text-xs text-muted-foreground z-10 pt-4 border-t border-border/40"
      >
        <span>Grounded in repository architecture</span>
        <div className="flex items-center gap-1 text-primary font-medium">
          <span>Explore key features</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </motion.div>
    </div>
  );
};
