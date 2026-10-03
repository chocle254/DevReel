import React from 'react';
import { Film, Github, Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-border/40 bg-card/40 py-8 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg neu-pressed flex items-center justify-center text-primary">
            <Film className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-foreground">DevReel</span>
            <span className="mx-2">•</span>
            <span>« Turn your code into a story worth watching »</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/chocle254/DevReel"
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary transition-colors flex items-center gap-1.5 font-medium"
          >
            <Github className="w-3.5 h-3.5" />
            <span>chocle254/DevReel</span>
          </a>
          <span>•</span>
          <span className="flex items-center gap-1 text-[11px]">
            Built with deterministic React & Playwright animation engine
          </span>
        </div>
      </div>
    </footer>
  );
};
