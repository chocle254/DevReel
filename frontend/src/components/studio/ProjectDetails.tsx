import React from 'react';
import type { Reel } from '@/types/contract';
import { FileCode, CheckCircle2, Target, Lightbulb, AlertTriangle, Layers, Github, ExternalLink } from 'lucide-react';

interface Props {
  reel: Reel;
}

export const ProjectDetails: React.FC<Props> = ({ reel }) => {
  const understanding = reel.understanding;

  if (!understanding) {
    return (
      <div className="neu-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Project details will be available once analysis completes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="neu-card p-6 border border-border/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <h3 className="text-xl font-bold text-foreground">{understanding.name}</h3>
            <p className="text-xs md:text-sm text-primary font-medium mt-0.5">{understanding.one_liner}</p>
          </div>
          <a
            href={reel.repo_url}
            target="_blank"
            rel="noreferrer"
            className="neu-btn flex items-center gap-2 text-xs self-start md:self-auto"
          >
            <Github className="w-3.5 h-3.5" />
            <span>{reel.repo_name}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Problem vs Solution Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <div className="p-4 rounded-xl neu-flat border border-destructive/20">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-destructive mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>The Problem</span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {understanding.problem}
            </p>
          </div>

          <div className="p-4 rounded-xl neu-flat border border-primary/20">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
              <Lightbulb className="w-4 h-4" />
              <span>The Solution</span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {understanding.solution}
            </p>
          </div>
        </div>

        {/* Target Users */}
        {understanding.target_users && understanding.target_users.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border/40">
            <span className="text-xs font-mono font-semibold uppercase text-muted-foreground flex items-center gap-1.5 mb-2.5">
              <Target className="w-3.5 h-3.5 text-primary" />
              Target Audience
            </span>
            <div className="flex flex-wrap gap-2">
              {understanding.target_users.map((user, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full neu-flat text-xs font-medium text-foreground border border-border/50"
                >
                  {user}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Extracted Architecture & Tech Stack */}
      <div className="neu-card p-6 border border-border/50">
        <h4 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span>Extracted Architecture & Evidence</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {understanding.technology.map((tech, idx) => (
            <div key={idx} className="p-4 rounded-xl neu-flat border border-border/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h5 className="font-bold text-sm text-foreground">{tech.name}</h5>
                  <span className="text-[10px] font-mono text-primary px-2 py-0.5 rounded neu-pressed">
                    {tech.role}
                  </span>
                </div>
              </div>

              {tech.evidence && tech.evidence.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                  <FileCode className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">{tech.evidence.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Features Grounded In Files */}
      <div className="neu-card p-6 border border-border/50">
        <h4 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span>Key Verified Features</span>
        </h4>

        <div className="space-y-3">
          {understanding.features.map((feat, idx) => (
            <div key={idx} className="p-3.5 rounded-xl neu-flat border border-border/40 flex items-start gap-3">
              <span className="w-6 h-6 rounded-md neu-pressed flex items-center justify-center font-mono text-xs font-bold text-primary shrink-0">
                0{idx + 1}
              </span>
              <div className="flex-1">
                <h5 className="font-bold text-xs md:text-sm text-foreground mb-0.5">{feat.name}</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.description}</p>
                {feat.evidence && feat.evidence.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-primary">
                    <FileCode className="w-3 h-3" />
                    <span>Evidence: {feat.evidence.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
