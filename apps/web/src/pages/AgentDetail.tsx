import { AgentCeoBadge } from '@/components/agents/AgentCeoBadge';
import { AgentStatusPanel } from '@/components/agents/AgentStatusPanel';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { deriveAgentStatusFromSuspension, groupAvailableModels } from '@/lib/agents';
import { fetchJson } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AgentDetails, AgentStatus } from '@/types/agent';
import type { Model } from '@/types/model';
import { ArrowLeft, Check, Crown } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const MarkdownEditor = lazy(() =>
  import('@/components/ui/markdown-editor').then((m) => ({ default: m.MarkdownEditor })),
);

const CLI_LABELS: Record<string, string> = {
  claude_code: 'Claude Code',
  codex: 'Codex',
  gemini_cli: 'Gemini CLI',
  kilo: 'Kilo Code',
  opencode: 'OpenCode',
};

function validate(f: { name: string; subagentMd: string }): string {
  if (!f.name) return 'Agent name is required.';
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(f.name))
    return 'Name can only contain letters, numbers, spaces, hyphens, and underscores.';
  if (!f.subagentMd || f.subagentMd.trim().length < 50)
    return 'Definition must be at least 50 characters.';
  return '';
}

function AgentDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-64" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-2.5 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex-1 border border-border">
        <div className="space-y-2 p-4">
          {[80, 60, 90, 50, 70].map((w) => (
            <Skeleton key={w} className="h-2.5" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AgentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '',
    subagentMd: '',
    modelCliId: '',
    model: '',
    isSuspended: false,
  });

  const loadAgent = useCallback(async (agentId: string) => {
    setLoading(true);
    setError('');
    setAgent(null);
    try {
      const data = await fetchJson<AgentDetails>(`/agents/${agentId}`);
      setAgent(data);
      setForm({
        name: data.name,
        subagentMd: data.subagentMd,
        modelCliId: data.modelCliId ?? '',
        model: data.model ?? '',
        isSuspended: data.status === 'suspended',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load agent.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const data = await fetchJson<{ items: Model[] }>('/models');
      setModels(data.items);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadAgent(id);
    loadModels();
  }, [id, loadAgent, loadModels]);

  const availableModelKeys = useMemo(() => new Set(models.map((model) => model.value)), [models]);
  const modelGroups = useMemo(
    () => groupAvailableModels(models, CLI_LABELS, form.modelCliId, form.model),
    [models, form.model, form.modelCliId],
  );

  const handleModelChange = (value: string) => {
    if (value === 'none') {
      setForm((f) => ({ ...f, model: '', modelCliId: '' }));
      return;
    }
    const separator = value.indexOf(':');
    const modelCliId = separator >= 0 ? value.slice(0, separator) : '';
    const model = separator >= 0 ? value.slice(separator + 1) : value;
    setForm((f) => ({ ...f, model, modelCliId }));
  };

  const effectiveStatus: AgentStatus = useMemo(
    () =>
      deriveAgentStatusFromSuspension(
        form.modelCliId,
        form.model,
        form.isSuspended,
        availableModelKeys,
      ),
    [availableModelKeys, form.isSuspended, form.model, form.modelCliId],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        modelCliId: form.model ? form.modelCliId : null,
        name: form.name,
        subagentMd: form.subagentMd,
        model: form.model || null,
        status: effectiveStatus,
      };
      await fetchJson(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
      await loadAgent(id);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    try {
      await fetchJson(`/agents/${agent.id}`, { method: 'DELETE' });
      navigate('/agents');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete.');
    }
  };

  return (
    <div
      className="relative flex min-h-full flex-col gap-5 p-4 sm:p-6"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(55,247,18,0.018) 28px, rgba(55,247,18,0.018) 29px)',
      }}
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/agents')} className="-ml-1">
          <ArrowLeft className="mr-1.5 h-3 w-3" />
          {'< back'}
        </Button>
        {!loading && agent && (
          <div className="flex items-center gap-2">
            {saveOk && (
              <span className="flex animate-toast items-center gap-1 font-code text-2xs text-primary">
                <Check className="h-3 w-3" /> saved
              </span>
            )}
            {!agent.isCeo && (
              <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
                [ delete ]
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? '[ saving... ]' : '[ SAVE ]'}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="shrink-0 animate-toast border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-destructive text-xs">
          {`> error: ${error}`}
        </div>
      )}

      {loading && <AgentDetailSkeleton />}

      {!loading && agent && (
        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col gap-5">
          {/* Title + read-only meta chips */}
          <div className="shrink-0">
            <SectionHeader label="AGENT DETAIL" />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {agent.isCeo && <AgentCeoBadge />}
              <h1 className="break-words font-bold font-mono text-foreground text-xl sm:text-2xl">
                {agent.name}
                <span
                  className="ml-1 animate-cursor-blink text-primary"
                  style={{ textShadow: 'var(--glow-primary)' }}
                >
                  |
                </span>
              </h1>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <span className="font-code text-2xs text-muted-foreground">
                created <span className="text-foreground">{formatDate(agent.createdAt)}</span>
              </span>
              {(agent.manages?.length ?? 0) > 0 && (
                <span className="font-code text-2xs text-muted-foreground">
                  manages{' '}
                  <span className="text-primary" style={{ textShadow: 'var(--glow-primary-sm)' }}>
                    {agent.manages.length}
                  </span>{' '}
                  agent{agent.manages.length !== 1 ? 's' : ''}
                </span>
              )}
              <span className="font-code text-2xs text-muted-foreground">
                role <span className="text-foreground">{agent.isCeo ? 'CEO' : 'specialist'}</span>
              </span>
              {agent.isCeo && (
                <span className="inline-flex items-center gap-1 font-code text-2xs text-yellow-300">
                  <Crown className="h-3 w-3" />
                  protected from deletion
                </span>
              )}
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1 lg:col-span-2">
              <Label htmlFor="name">name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="model">
                model
                {!form.model && (
                  <span className="ml-1.5 font-code text-2xs text-warning">unassigned</span>
                )}
              </Label>
              <Select
                value={form.model && form.modelCliId ? `${form.modelCliId}:${form.model}` : 'none'}
                onValueChange={handleModelChange}
              >
                <SelectTrigger id="model" className="h-7 font-mono text-xs">
                  <SelectValue placeholder="select model" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(90vw,32rem)]">
                  <SelectItem value="none">— unassigned —</SelectItem>
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

          <div className="shrink-0">
            <AgentStatusPanel
              effectiveStatus={effectiveStatus}
              isSuspended={form.isSuspended}
              onToggleSuspended={() =>
                setForm((current) => ({ ...current, isSuspended: !current.isSuspended }))
              }
            />
          </div>

          {/* Direct reports */}
          {(agent.manages?.length ?? 0) > 0 && (
            <div className="shrink-0 space-y-3 border border-border bg-card p-4">
              <p className="mono-label">{'> direct_reports'}</p>
              <div className="flex flex-wrap gap-1.5">
                {agent.manages.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => navigate(`/agents/${child.id}`)}
                    className="border border-border px-2 py-0.5 font-mono text-foreground text-xs transition-all duration-150 hover:border-primary hover:text-primary active:scale-95"
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Separator className="shrink-0" />

          {/* Definition editor */}
          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <SectionHeader label="DEFINITION" />
            <Suspense
              fallback={
                <div className="min-h-[200px] flex-1 animate-skeleton border border-input" />
              }
            >
              <MarkdownEditor
                value={form.subagentMd}
                onChange={(v) => setForm((f) => ({ ...f, subagentMd: v }))}
                fill
              />
            </Suspense>
          </div>

          {formError && (
            <div className="shrink-0 animate-toast border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-destructive text-xs">
              {`> error: ${formError}`}
            </div>
          )}
        </form>
      )}

      {/* Delete Dialog */}
      <Dialog
        open={showDelete}
        onOpenChange={(o) => {
          if (!o) setShowDelete(false);
        }}
      >
        <DialogContent className="h-auto max-w-sm">
          <DialogHeader>
            <DialogTitle label="DELETE PROTOCOL" />
            <DialogDescription>this action is irreversible.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex-none">
            <p className="font-code text-muted-foreground text-xs">
              {'> remove '}
              <strong className="text-foreground">{agent?.name}</strong>
              {' from registry.'}
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
