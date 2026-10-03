import React, { useState } from 'react';
import type { ProjectChart, ChartNode, ProjectUnderstanding } from '@/types/contract';
import { Layers, Database, Cpu, Globe, User, Terminal, FileCode, CheckCircle2 } from 'lucide-react';

interface Props {
  chart: ProjectChart | null;
  understanding?: ProjectUnderstanding | null;
  activeSceneNodeIds?: string[];
}

export const ArchitectureGraph: React.FC<Props> = ({ chart, understanding, activeSceneNodeIds = [] }) => {
  const [selectedNode, setSelectedNode] = useState<ChartNode | null>(null);

  if (!chart || !chart.nodes || chart.nodes.length === 0) {
    return (
      <div className="p-8 text-center neu-card">
        <p className="text-sm text-muted-foreground">No architectural relationships extracted for this project.</p>
      </div>
    );
  }

  const getNodeIcon = (kind: string) => {
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
        return <Layers className="w-4 h-4 text-primary" />;
    }
  };

  const getEvidenceForNode = (label: string) => {
    if (!understanding) return [];
    const lower = label.toLowerCase();
    const tech = understanding.technology.find(
      (t) => t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase())
    );
    if (tech && tech.evidence) return tech.evidence;
    const feat = understanding.features.find(
      (f) => f.name.toLowerCase().includes(lower) || lower.includes(f.name.toLowerCase())
    );
    if (feat && feat.evidence) return feat.evidence;
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Visual node network */}
      <div className="neu-card p-6 border border-border/50 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-bold text-foreground">Interactive Component Topology</h4>
            <p className="text-xs text-muted-foreground">Click any node to inspect role, category, and file evidence</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>{chart.nodes.length} Nodes</span>
            <span>•</span>
            <span>{chart.edges.length} Connections</span>
          </div>
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 my-4">
          {chart.nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isHighlighted = activeSceneNodeIds.includes(node.id);

            return (
              <button
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`p-3.5 rounded-xl text-left transition-all relative ${
                  isSelected
                    ? 'neu-pressed border border-primary text-foreground scale-[1.02]'
                    : isHighlighted
                    ? 'neu-flat border border-primary/40 text-foreground ring-1 ring-primary/30'
                    : 'neu-flat border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg neu-pressed flex items-center justify-center">
                    {getNodeIcon(node.kind)}
                  </div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded neu-flat border border-border/40">
                    {node.kind}
                  </span>
                </div>
                <h5 className="font-bold text-xs text-foreground truncate">{node.label}</h5>
                <span className="text-[10px] text-muted-foreground font-mono">id: {node.id}</span>
              </button>
            );
          })}
        </div>

        {/* Flow Connections list */}
        <div className="mt-6 pt-4 border-t border-border/40">
          <span className="text-xs font-mono font-semibold uppercase text-muted-foreground mb-3 block">
            Data & Dependency Connections
          </span>
          <div className="flex flex-wrap gap-2">
            {chart.edges.map((edge, idx) => (
              <div
                key={idx}
                className="neu-flat px-3 py-1.5 rounded-lg text-xs text-muted-foreground flex items-center gap-1.5"
              >
                <span className="font-semibold text-foreground">{edge.from}</span>
                <span className="text-primary font-mono font-bold">→</span>
                <span className="font-semibold text-foreground">{edge.to}</span>
                <span className="text-[10px] text-muted-foreground/80 font-mono">({edge.label})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Node Details Drawer/Card */}
      {selectedNode && (
        <div className="neu-card p-5 border border-primary/30 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center">
                {getNodeIcon(selectedNode.kind)}
              </div>
              <div>
                <h4 className="font-bold text-base text-foreground">{selectedNode.label}</h4>
                <span className="text-xs font-mono text-primary uppercase">Category: {selectedNode.kind}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-muted-foreground hover:text-foreground neu-flat px-2.5 py-1 rounded-lg"
            >
              Close
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Architecture Role:</span>
              <p className="text-xs text-foreground">
                Acts as a key <span className="font-mono text-primary">{selectedNode.kind}</span> in the system data pipeline.
              </p>
            </div>

            {/* Evidence in repository */}
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-1.5 flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5 text-primary" />
                <span>Verified Repository Evidence:</span>
              </span>
              {getEvidenceForNode(selectedNode.label).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {getEvidenceForNode(selectedNode.label).map((file, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-background/80 border border-primary/20 text-[11px] font-mono text-primary flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      {file}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Identified via codebase topology analysis.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
