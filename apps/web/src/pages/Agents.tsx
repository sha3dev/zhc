import { AgentCeoBadge } from '@/components/agents/AgentCeoBadge';
import { AgentStatusPanel } from '@/components/agents/AgentStatusPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lock, Plus, Search, Trash2 } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
const MarkdownEditor = lazy(() =>
  import('@/components/ui/markdown-editor').then((m) => ({ default: m.MarkdownEditor })),
);
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SectionHeader } from '@/components/ui/section-header';
import { Separator } from '@/components/ui/separator';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  deriveAgentStatusFromSuspension,
  getAgentStatusLabel,
  getAgentStatusVariant,
  groupAvailableModels,
} from '@/lib/agents';
import { fetchJson } from '@/lib/api';
import type { AgentSummary, CreateAgentInput } from '@/types/agent';
import { useNavigate } from 'react-router-dom';

const CLI_LABELS: Record<string, string> = {
  claude_code: 'Claude Code',
  codex: 'Codex',
  gemini_cli: 'Gemini CLI',
  kilo: 'Kilo Code',
  opencode: 'OpenCode',
};

interface AgentForm {
  name: string;
  subagentMd: string;
  modelCliId: string;
  model: string;
  isSuspended: boolean;
}
const BLANK: AgentForm = {
  name: '',
  subagentMd: '',
  modelCliId: '',
  model: '',
  isSuspended: false,
};

function validate(f: AgentForm): string {
  if (!f.name) return 'Agent name is required.';
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(f.name))
    return 'Name can only contain letters, numbers, spaces, hyphens, and underscores.';
  if (!f.subagentMd || f.subagentMd.trim().length < 50)
    return 'Definition must be at least 50 characters.';
  return '';
}

export default function Agents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [models, setModels] = useState<
    Array<{ name: string; displayName: string | null; cliId: string; value: string }>
  >([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AgentForm>(BLANK);
  const [formError, setFormError] = useState('');
  const [agentToDelete, setAgentToDelete] = useState<AgentSummary | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const availableModelKeys = new Set(models.map((model) => model.value));
  const modelGroups = groupAvailableModels(models, CLI_LABELS, form.modelCliId, form.model);
  const effectiveStatus = deriveAgentStatusFromSuspension(
    form.modelCliId,
    form.model,
    form.isSuspended,
    availableModelKeys,
  );

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams({ limit: '100' });
    if (search) p.set('search', search);
    if (filterStatus) p.set('status', filterStatus);
    return p.toString();
  }, [search, filterStatus]);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJson<{ items: AgentSummary[] }>(`/agents?${buildQuery()}`);
      setAgents(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load agents.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadModels = useCallback(async () => {
    try {
      const data = await fetchJson<{
        items: Array<{ name: string; displayName: string | null; cliId: string; value: string }>;
      }>('/models');
      setModels(data.items);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadAgents();
    loadModels();
  }, [loadAgents, loadModels]);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => loadAgents(), 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search, filterStatus, loadAgents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: CreateAgentInput = {
        modelCliId: form.model ? form.modelCliId : null,
        name: form.name,
        subagentMd: form.subagentMd,
        model: form.model || null,
        status: effectiveStatus as CreateAgentInput['status'],
      };
      await fetchJson('/agents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowCreate(false);
      setForm(BLANK);
      setNotice('> agent created.');
      setTimeout(() => setNotice(''), 3000);
      await loadAgents();
    } catch (e) {
      const data =
        e instanceof Error && 'details' in e
          ? (e as { details?: { fieldErrors?: Record<string, string[]> }; message: string }).details
          : undefined;
      if (data?.fieldErrors) {
        const d = Object.values(data.fieldErrors as Record<string, string[]>)
          .flat()
          .join(' ');
        setFormError(d || 'Unable to create agent.');
      } else {
        setFormError(e instanceof Error ? e.message : 'Unable to create agent.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!agentToDelete) return;
    try {
      await fetchJson(`/agents/${agentToDelete.id}`, { method: 'DELETE' });
      setShowDelete(false);
      setAgentToDelete(null);
      setNotice('> agent deleted.');
      setTimeout(() => setNotice(''), 3000);
      await loadAgents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete agent.');
    }
  };

  return (
    <div
      className="relative min-h-full p-4 sm:p-6 space-y-5 sm:space-y-6"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(55,247,18,0.018) 28px, rgba(55,247,18,0.018) 29px)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <SectionHeader label="AGENT REGISTRY" />
          <h1 className="font-mono text-xl sm:text-2xl font-bold text-foreground">
            agents
            <span
              className="text-primary animate-cursor-blink ml-1"
              style={{ textShadow: 'var(--glow-primary)' }}
            >
              |
            </span>
          </h1>
          <p className="font-code text-xs text-muted-foreground hidden sm:block">
            {'$ list --registry --all'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(BLANK);
            setFormError('');
            setShowCreate(true);
          }}
          className="shrink-0 mt-1 border border-primary text-primary font-mono text-xs px-3 sm:px-4 py-1.5 tracking-widest transition-all duration-150 hover:bg-primary/10 active:scale-[0.96] flex items-center gap-1.5"
          style={{ boxShadow: '0 0 6px rgba(55,247,18,0.2)' }}
        >
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">[ CREATE AGENT ]</span>
          <span className="sm:hidden">[ NEW ]</span>
        </button>
      </div>

      {/* Notices */}
      {notice && (
        <div className="border border-primary/40 bg-primary/5 px-3 py-2 font-mono text-xs text-primary animate-toast">
          {notice}
        </div>
      )}
      {error && (
        <div className="border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive animate-toast">{`> error: ${error}`}</div>
      )}

      {/* Toolbar — stacks on mobile */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <Label htmlFor="search">search.query</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              id="search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="name or definition content"
              className="pl-6"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:w-36">
          <Label htmlFor="status-filter">status.filter</Label>
          <Select
            value={filterStatus || 'all'}
            onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}
          >
            <SelectTrigger id="status-filter" className="h-7 font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">all</SelectItem>
              <SelectItem value="ready">{getAgentStatusLabel('ready')}</SelectItem>
              <SelectItem value="not_ready">{getAgentStatusLabel('not_ready')}</SelectItem>
              <SelectItem value="suspended">{getAgentStatusLabel('suspended')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent cursor-default">
              <TableHead>name</TableHead>
              <TableHead className="hidden sm:table-cell">model</TableHead>
              <TableHead>status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
            ) : agents.length === 0 ? (
              <TableRow className="hover:bg-transparent cursor-default">
                <TableCell
                  colSpan={4}
                  className="text-center font-code text-xs text-muted-foreground py-10"
                >
                  {'> no agents match the current filters.'}
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent, i) => (
                <TableRow
                  key={agent.id}
                  onClick={() => navigate(`/agents/${agent.id}`)}
                  className="animate-row-enter"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {agent.isCeo && <AgentCeoBadge />}
                      <span className="font-mono text-xs font-bold text-foreground">
                        {agent.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-code text-xs text-muted-foreground hidden sm:table-cell">
                    {agent.model && agent.modelCliId ? (
                      `${CLI_LABELS[agent.modelCliId] ?? agent.modelCliId} · ${agent.model}`
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getAgentStatusVariant(agent.status)}>
                      {getAgentStatusLabel(agent.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {agent.isCeo ? (
                      <div className="flex h-6 w-6 items-center justify-center text-warning">
                        <Lock className="h-3 w-3" />
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAgentToDelete(agent);
                          setShowDelete(true);
                        }}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:border-transparent"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(o) => {
          if (!o) {
            setShowCreate(false);
            setFormError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle label="AGENT EDITOR" />
            <DialogDescription>initialize a new agent in the registry.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <DialogBody>
              <div>
                <p className="mono-label mb-3">{'> identity'}</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="c-name">name</Label>
                    <Input
                      id="c-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.trim() }))}
                      placeholder="frontend-developer"
                    />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="mono-label mb-3">{'> runtime'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="c-model">model</Label>
                    <Select
                      value={
                        form.model && form.modelCliId ? `${form.modelCliId}:${form.model}` : 'none'
                      }
                      onValueChange={(v) => {
                        if (v === 'none') {
                          setForm((f) => ({ ...f, model: '', modelCliId: '' }));
                          return;
                        }
                        const separator = v.indexOf(':');
                        const modelCliId = separator >= 0 ? v.slice(0, separator) : '';
                        const model = separator >= 0 ? v.slice(separator + 1) : v;
                        setForm((f) => ({ ...f, model, modelCliId }));
                      }}
                    >
                      <SelectTrigger id="c-model" className="h-7 font-mono text-xs">
                        <SelectValue placeholder="select model" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[min(90vw,32rem)]">
                        <SelectItem value="none">select model</SelectItem>
                        {modelGroups.map((group) => (
                          <SelectGroup key={group.cliId}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.models.map((model) => (
                              <SelectItem key={`${group.cliId}:${model.name}`} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3">
                  <AgentStatusPanel
                    effectiveStatus={effectiveStatus}
                    isSuspended={form.isSuspended}
                    onToggleSuspended={() =>
                      setForm((current) => ({ ...current, isSuspended: !current.isSuspended }))
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="flex flex-col flex-1 min-h-0 gap-1">
                <p className="mono-label">{'> definition'}</p>
                <Suspense
                  fallback={
                    <div className="flex-1 border border-input animate-skeleton min-h-[200px]" />
                  }
                >
                  <MarkdownEditor
                    value={form.subagentMd}
                    onChange={(v) => setForm((f) => ({ ...f, subagentMd: v }))}
                    placeholder={
                      '# Frontend Developer\n\n## Identity\nYou implement clear and fast interfaces.\n\n## Personality\n- Performance-conscious\n- Accessible-first\n- Pragmatic'
                    }
                    fill
                  />
                </Suspense>
              </div>
              {formError && (
                <div className="border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive animate-toast">
                  {`> error: ${formError}`}
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowCreate(false);
                  setFormError('');
                }}
              >
                cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '[ saving... ]' : '[ INITIALIZE AGENT ]'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={showDelete}
        onOpenChange={(o) => {
          if (!o) setShowDelete(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle label="DELETE PROTOCOL" />
            <DialogDescription>this action is irreversible.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="font-code text-xs text-muted-foreground">
              {'> remove '}
              <strong className="text-foreground">{agentToDelete?.name}</strong>
              {' from registry.'}
            </p>
            <p className="font-code text-xs text-muted-foreground mt-1">
              {'> agent will be permanently removed from the registry.'}
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
