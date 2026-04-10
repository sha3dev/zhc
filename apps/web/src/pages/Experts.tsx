import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '@/components/ui/section-header';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { fetchJson } from '@/lib/api';
import type { AgentSummary } from '@/types/agent';
import { Plus, Search, Trash2, WandSparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ExpertDraft {
  name: string;
  subagentMd: string;
}

export default function Experts() {
  const navigate = useNavigate();
  const [experts, setExperts] = useState<AgentSummary[]>([]);
  const [ceoReady, setCeoReady] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [formError, setFormError] = useState('');
  const [expertToDelete, setExpertToDelete] = useState<AgentSummary | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (search) params.set('search', search);
    return params.toString();
  }, [search]);

  const loadExperts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [expertsData, agentsData] = await Promise.all([
        fetchJson<{ items: AgentSummary[] }>(`/experts?${buildQuery()}`),
        fetchJson<{ items: AgentSummary[] }>('/agents?limit=100'),
      ]);
      setExperts(expertsData.items);
      setCeoReady(agentsData.items.some((agent) => agent.isCeo && agent.status === 'ready'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load experts.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    loadExperts();
  }, [loadExperts]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => loadExperts(), 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search, loadExperts]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draftPrompt.trim()) {
      setFormError('Please describe the expert you want to create.');
      return;
    }

    setDrafting(true);
    setFormError('');
    try {
      const draft = await fetchJson<ExpertDraft>('/experts/draft', {
        body: JSON.stringify({ brief: draftPrompt }),
        method: 'POST',
      });

      const created = await fetchJson<AgentSummary>('/experts', {
        body: JSON.stringify({
          name: draft.name,
          subagentMd: draft.subagentMd,
        }),
        method: 'POST',
      });

      setShowPrompt(false);
      setDraftPrompt('');
      setNotice('> expert created.');
      setTimeout(() => setNotice(''), 3000);
      await loadExperts();
      navigate(`/experts/${created.id}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Unable to create expert.');
    } finally {
      setDrafting(false);
    }
  };

  const handleDelete = async () => {
    if (!expertToDelete) return;
    try {
      await fetchJson(`/experts/${expertToDelete.id}`, { method: 'DELETE' });
      setShowDelete(false);
      setExpertToDelete(null);
      setNotice('> expert deleted.');
      setTimeout(() => setNotice(''), 3000);
      await loadExperts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete expert.');
    }
  };

  return (
    <div
      className="relative min-h-full space-y-5 p-4 sm:space-y-6 sm:p-6"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(55,247,18,0.018) 28px, rgba(55,247,18,0.018) 29px)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <SectionHeader label="EXPERT REGISTRY" />
          <h1 className="font-bold font-mono text-foreground text-xl sm:text-2xl">
            experts
            <span
              className="ml-1 animate-cursor-blink text-primary"
              style={{ textShadow: 'var(--glow-primary)' }}
            >
              |
            </span>
          </h1>
          <p className="hidden font-code text-muted-foreground text-xs sm:block">
            {'$ list --experts --external-advisors'}
          </p>
        </div>
        <button
          type="button"
          disabled={!ceoReady}
          onClick={() => {
            if (!ceoReady) return;
            setDraftPrompt('');
            setFormError('');
            setShowPrompt(true);
          }}
          className="mt-1 flex shrink-0 items-center gap-1.5 border border-primary px-3 py-1.5 font-mono text-primary text-xs tracking-widest transition-all duration-150 hover:bg-primary/10 active:scale-[0.96] disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent sm:px-4"
          style={ceoReady ? { boxShadow: '0 0 6px rgba(55,247,18,0.2)' } : undefined}
          title={ceoReady ? 'Add expert' : 'The CEO must be ready before experts can be added'}
        >
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">[ ADD EXPERT ]</span>
          <span className="sm:hidden">[ NEW ]</span>
        </button>
      </div>

      {notice && (
        <div className="animate-toast border border-primary/40 bg-primary/5 px-3 py-2 font-mono text-primary text-xs">
          {notice}
        </div>
      )}
      {error && (
        <div className="animate-toast border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-destructive text-xs">
          {`> error: ${error}`}
        </div>
      )}
      {!ceoReady && !error && (
        <div className="animate-toast border border-warning/40 bg-warning/5 px-3 py-2 font-mono text-warning text-xs">
          {'> the CEO must be ready before experts can be added.'}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <Label htmlFor="search-experts">search.query</Label>
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-2 h-3 w-3 text-muted-foreground" />
          <Input
            id="search-experts"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="name or definition content"
            className="pl-6"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="cursor-default hover:bg-transparent">
              <TableHead>name</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => <TableRowSkeleton key={index} cols={2} />)
            ) : experts.length === 0 ? (
              <TableRow className="cursor-default hover:bg-transparent">
                <TableCell
                  colSpan={2}
                  className="py-10 text-center font-code text-muted-foreground text-xs"
                >
                  {'> no experts match the current filters.'}
                </TableCell>
              </TableRow>
            ) : (
              experts.map((expert, index) => (
                <TableRow
                  key={expert.id}
                  onClick={() => navigate(`/experts/${expert.id}`)}
                  className="animate-row-enter"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <span className="font-bold font-mono text-foreground text-xs">
                      [xp] {expert.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpertToDelete(expert);
                        setShowDelete(true);
                      }}
                      className="h-6 w-6 text-muted-foreground hover:border-transparent hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={showPrompt}
        onOpenChange={(open) => {
          if (!open) {
            setShowPrompt(false);
            setFormError('');
          }
        }}
      >
        <DialogContent className="h-auto max-w-xl">
          <DialogHeader>
            <DialogTitle label="ADD EXPERT" />
            <DialogDescription>
              Write a short brief. The platform will generate the expert profile and open it
              directly.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <DialogBody className="flex-none gap-4">
              <div className="border border-primary/20 bg-primary/5 px-3 py-2">
                <div className="flex items-start gap-2">
                  <WandSparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="space-y-1">
                    <p className="font-code text-2xs text-primary uppercase tracking-widest">
                      auto generation
                    </p>
                    <p className="font-code text-muted-foreground text-xs leading-relaxed">
                      The brief is converted into an expert `name` and `subagent_md`, then saved
                      immediately.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expert-brief">expert brief</Label>
                <Textarea
                  id="expert-brief"
                  value={draftPrompt}
                  onChange={(event) => setDraftPrompt(event.target.value)}
                  placeholder="Example: Veteran operator with deep expertise in enterprise SaaS pricing, packaging, and annual contract negotiations."
                  className="min-h-[132px] font-code leading-relaxed"
                />
                <p className="font-code text-2xs text-muted-foreground">
                  Keep it short. One or two sentences is enough.
                </p>
              </div>
              {formError && (
                <div className="animate-toast border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-destructive text-xs">
                  {`> error: ${formError}`}
                </div>
              )}
            </DialogBody>
            <DialogFooter className="justify-between">
              <Button type="button" variant="ghost" onClick={() => setShowPrompt(false)}>
                cancel
              </Button>
              <Button type="submit" disabled={drafting}>
                {drafting ? '[ generating... ]' : '[ CREATE EXPERT ]'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDelete}
        onOpenChange={(open) => {
          if (!open) setShowDelete(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle label="DELETE EXPERT" />
            <DialogDescription>this action is irreversible.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="font-code text-muted-foreground text-xs">
              {'> remove '}
              <strong className="text-foreground">{expertToDelete?.name}</strong>
              {' from expert registry.'}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDelete(false)}>
              cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              [ DELETE ]
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
