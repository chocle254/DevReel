import React, { useState } from 'react';
import { Github, Sparkles, ArrowRight, Wand2, AlertCircle } from 'lucide-react';

interface Props {
  onSubmit: (repoUrl: string) => Promise<void>;
  isLoading: boolean;
}

const SAMPLE_REPOS = [
  { name: 'chocle254/DevReel', url: 'https://github.com/chocle254/DevReel', label: 'DevReel (Original)' },
  { name: 'supabase/supabase', url: 'https://github.com/supabase/supabase', label: 'Supabase BaaS' },
  { name: 'facebook/react', url: 'https://github.com/facebook/react', label: 'React Core' },
  { name: 'shadcn/ui', url: 'https://github.com/shadcn-ui/ui', label: 'shadcn/ui Library' },
];

export const NewReelForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = repoUrl.trim();
    if (!trimmed) {
      setValidationError('Please enter a GitHub repository URL.');
      return;
    }

    const urlPattern = /^https?:\/\/(www\.)?github\.com\/([\w.-]+)\/([\w.-]+)(\/)?$/i;
    if (!urlPattern.test(trimmed)) {
      setValidationError('Please enter a valid GitHub URL, e.g. https://github.com/owner/repo');
      return;
    }

    onSubmit(trimmed);
  };

  const handleSelectSample = (url: string) => {
    setRepoUrl(url);
    setValidationError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto neu-card p-6 md:p-8 border border-border/50 relative overflow-hidden">
      <div className="relative z-10 text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl neu-pressed text-primary mb-3">
          <Wand2 className="w-7 h-7" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
          Create New DevReel
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Provide any public GitHub repository. DevReel inspects the source code and crafts an animated, cinematic product pitch.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
            <span>GitHub Repository URL</span>
            <span className="text-[11px] text-primary lowercase">public repos only</span>
          </label>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Github className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="https://github.com/owner/repository"
              disabled={isLoading}
              className="neu-input pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground font-mono"
            />
          </div>

          {validationError && (
            <div className="mt-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Quick Sample Repositories */}
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground block mb-2">
            Try a featured repository:
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_REPOS.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => handleSelectSample(sample.url)}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  repoUrl === sample.url
                    ? 'neu-pressed text-primary border border-primary/40'
                    : 'neu-flat text-muted-foreground hover:text-foreground'
                }`}
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="neu-btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold group"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Initializing Codebase Analysis...</span>
              </>
            ) : (
              <>
                <span>Generate Cinematic Reel</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
