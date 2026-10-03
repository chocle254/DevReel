import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Film, Plus, Github, Sparkles, BookOpen } from 'lucide-react';
import { getSessionId } from '@/services/api';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const sessionId = getSessionId();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl neu-pressed flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-foreground">DevReel</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary">
                v1.0
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground block -mt-1 font-mono">
              Code to Cinematic Pitch
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 neu-flat p-1 rounded-xl">
          <Link
            to="/"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              location.pathname === '/'
                ? 'neu-pressed text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/new"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              location.pathname === '/new'
                ? 'neu-pressed text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Reel
          </Link>
        </nav>

        {/* Right Actions: Session Pill + New Reel Button + GitHub Link */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full neu-pressed text-[11px] font-mono text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Session:</span>
            <span className="text-foreground">{sessionId.substring(0, 10)}...</span>
          </div>

          <a
            href="https://github.com/chocle254/DevReel"
            target="_blank"
            rel="noreferrer"
            className="neu-icon-btn w-9 h-9"
            title="View chocle254/DevReel on GitHub"
          >
            <Github className="w-4 h-4" />
          </a>

          <Link
            to="/new"
            className="neu-btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Reel</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
