import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { Reel, ReelSummary } from '@/types/contract';
import {
  Film,
  Plus,
  Play,
  RotateCcw,
  Trash2,
  Clock,
  Search,
  Sparkles,
  Github,
} from 'lucide-react';
import { toast } from 'sonner';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState<ReelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReels = async () => {
    try {
      const res = await api.getReels();
      setReels(res.reels);
    } catch (err) {
      console.error('Failed to load reels', err);
      toast.error('Could not load reels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this reel?')) return;
    try {
      setDeletingId(id);
      await api.deleteReel(id);
      setReels((prev) => prev.filter((r) => r.id !== id));
      toast.success('Reel deleted successfully');
    } catch {
      toast.error('Failed to delete reel');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRegenerate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      toast.info('Initiating regeneration pipeline...');
      const newReel = await api.regenerateReel(id);
      navigate(`/new?reelId=${newReel.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate reel');
    }
  };

  const filteredReels = reels.filter((r) => {
    const matchesSearch =
      r.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'completed') return r.status === 'completed';
    if (statusFilter === 'in_progress') return r.status !== 'completed' && r.status !== 'failed';
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      {/* Hero Presentation Banner */}
      <div className="neu-card p-8 md:p-12 relative overflow-hidden border border-border/50">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full neu-pressed text-xs font-mono font-bold text-primary mb-4 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Codebase to Explainer Video</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight mb-4">
            Turn your code into a story worth watching.
          </h1>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8">
            DevReel inspects your GitHub repository, extracts system mechanics, and generates a cinematic 7-scene animated explainer with synchronized narration and background music.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link to="/new" className="neu-btn-primary flex items-center gap-2 text-sm font-bold py-3 px-6">
              <Plus className="w-4 h-4" />
              <span>Create New Reel</span>
            </Link>

            {reels.length > 0 && (
              <button
                onClick={() => navigate(`/reel/${reels[0].id}`)}
                className="neu-btn flex items-center gap-2 text-sm font-semibold py-3 px-5"
              >
                <Play className="w-4 h-4 text-primary" />
                <span>Watch Featured Demo ({reels[0].title || reels[0].repo_name})</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Highlights Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 pt-8 border-t border-border/40 relative z-10">
          <div className="neu-flat p-4 rounded-xl border border-border/40">
            <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-1">Generated Reels</span>
            <span className="text-2xl font-black text-foreground font-mono">{reels.length}</span>
          </div>
          <div className="neu-flat p-4 rounded-xl border border-border/40">
            <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-1">Average Duration</span>
            <span className="text-2xl font-black text-foreground font-mono">60s</span>
          </div>
          <div className="neu-flat p-4 rounded-xl border border-border/40">
            <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-1">Scene Structure</span>
            <span className="text-2xl font-black text-primary font-mono">7 Scenes</span>
          </div>
          <div className="neu-flat p-4 rounded-xl border border-border/40">
            <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-1">Evidence Grounded</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">100%</span>
          </div>
        </div>
      </div>

      {/* Library Controls: Search & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Reels Library</h2>
            <p className="text-xs text-muted-foreground">Browse and manage previously generated explainers</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search reels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="neu-input pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 neu-flat p-1 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'all' ? 'neu-pressed text-primary font-bold' : 'text-muted-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'completed' ? 'neu-pressed text-primary font-bold' : 'text-muted-foreground'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'in_progress' ? 'neu-pressed text-primary font-bold' : 'text-muted-foreground'
                }`}
              >
                In Progress
              </button>
            </div>
          </div>
        </div>

        {/* Reels Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="neu-card h-72 animate-pulse" />
            ))}
          </div>
        ) : filteredReels.length === 0 ? (
          <div className="neu-card p-12 text-center border border-border/50 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl neu-pressed flex items-center justify-center text-muted-foreground mx-auto mb-4">
              <Film className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">No Reels Found</h3>
            <p className="text-xs text-muted-foreground mb-6">
              {searchQuery ? 'Try adjusting your search query.' : 'Generate your first cinematic explainer from any GitHub repository.'}
            </p>
            <Link to="/new" className="neu-btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-4 font-bold">
              <Plus className="w-4 h-4" />
              <span>Create Your First Reel</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReels.map((r) => {
              const isCompleted = r.status === 'completed';
              const isFailed = r.status === 'failed';

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    if (isCompleted) {
                      navigate(`/reel/${r.id}`);
                    } else {
                      navigate(`/new?reelId=${r.id}`);
                    }
                  }}
                  className="neu-card p-0 rounded-2xl overflow-hidden border border-border/50 hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  {/* Thumbnail Banner */}
                  <div className="relative aspect-video w-full bg-card overflow-hidden">
                    {r.thumbnail_url ? (
                      <img
                        src={r.thumbnail_url}
                        alt={r.title || r.repo_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground">
                        <Film className="w-10 h-10 opacity-30" />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 backdrop-blur-md shadow-sm ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isFailed
                            ? 'bg-destructive/20 text-destructive border border-destructive/30'
                            : 'bg-primary/20 text-primary border border-primary/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-400' : isFailed ? 'bg-destructive' : 'bg-primary animate-pulse'}`} />
                        {r.status}
                      </span>
                    </div>

                    {/* Duration badge */}
                    {r.duration_seconds && (
                      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded neu-flat bg-background/80 backdrop-blur-md text-[10px] font-mono text-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        <span>{Math.round(r.duration_seconds)}s</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 font-mono">
                        <Github className="w-3.5 h-3.5" />
                        <span className="truncate">{r.repo_name}</span>
                      </div>
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {r.title || r.repo_name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {r.tagline || r.summary || 'Cinematic explainer generated from codebase topology.'}
                      </p>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleRegenerate(r.id, e)}
                          title="Regenerate Reel"
                          className="w-7 h-7 rounded-lg neu-flat flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(r.id, e)}
                          disabled={deletingId === r.id}
                          title="Delete Reel"
                          className="w-7 h-7 rounded-lg neu-flat flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 h-7 rounded-lg neu-btn-primary flex items-center justify-center text-primary-foreground">
                          <Play className="w-3 h-3 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
