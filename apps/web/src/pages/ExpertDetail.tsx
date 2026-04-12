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
import { Skeleton } from '@/components/ui/skeleton';
import { fetchJson } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AgentDetails } from '@/types/agent';
import { ArrowLeft, Check } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const MarkdownEditor = lazy(() =>
  import('@/components/ui/markdown-editor').then((m) => ({ default: m.MarkdownEditor })),
);

function validate(form: { name: string; subagentMd: string }): string {
  if (!form.name) return 'Expert name is required.';
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(form.name))
    return 'Name can only contain letters, numbers, spaces, hyphens, and underscores.';
  if (!form.subagentMd || form.subagentMd.trim().length < 50)
    return 'Definition must be at least 50 characters.';
  return '';
}

function ExpertDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-64" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-2.5 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2].map((index) => (
          <div key={index} className="flex flex-col gap-1">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
      <div className="border border-border p-4">
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="mt-3 h-4 w-56" />
      </div>
      <div className="flex-1 border border-border">
        <div className="space-y-2 p-4">
          {[80, 60, 90, 50, 70].map((width) => (
            <Skeleton key={width} className="h-2.5" style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ExpertDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [expert, setExpert] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '',
    subagentMd: '',
  });

  const loadExpert = useCallback(async (expertId: string) => {
    setLoading(true);
    setError('');
    setExpert(null);
    try {
      const data = await fetchJson<AgentDetails>(`/experts/${expertId}`);
      setExpert(data);
      setForm({
        name: data.name,
        subagentMd: data.subagentMd,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load expert.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpert(id);
  }, [id, loadExpert]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await fetchJson(`/experts/${id}`, {
        body: JSON.stringify({
          name: form.name,
          subagentMd: form.subagentMd,
        }),
        method: 'PUT',
      });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
      await loadExpert(id);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expert) return;
    try {
      await fetchJson(`/experts/${expert.id}`, { method: 'DELETE' });
      navigate('/experts');
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
      <div className="flex shrink-0 items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/experts')} className="-ml-1">
          <ArrowLeft className="mr-1.5 h-3 w-3" />
          {'< back'}
        </Button>
        {!loading && expert && (
          <div className="flex items-center gap-2">
            {saveOk && (
              <span className="flex animate-toast items-center gap-1 font-code text-2xs text-primary">
                <Check className="h-3 w-3" /> saved
              </span>
            )}
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
              [ delete ]
            </Button>
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

      {loading && <ExpertDetailSkeleton />}

      {!loading && expert && (
        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col gap-5">
          <div className="shrink-0">
            <SectionHeader label="EXPERT DETAIL" />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="break-words font-bold font-mono text-foreground text-xl sm:text-2xl">
                [xp] {expert.name}
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
                created <span className="text-foreground">{formatDate(expert.createdAt)}</span>
              </span>
              <span className="font-code text-2xs text-muted-foreground">
                role <span className="text-foreground">expert advisor</span>
              </span>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-1 gap-3">
            <div className="flex flex-col gap-1 sm:max-w-md">
              <Label htmlFor="expert-name-detail">name</Label>
              <Input
                id="expert-name-detail"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <SectionHeader label="SUBAGENT_MD" />
            <Suspense
              fallback={
                <div className="min-h-[200px] flex-1 animate-skeleton border border-input" />
              }
            >
              <MarkdownEditor
                value={form.subagentMd}
                onChange={(value) => setForm((current) => ({ ...current, subagentMd: value }))}
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

      <Dialog
        open={showDelete}
        onOpenChange={(open) => {
          if (!open) setShowDelete(false);
        }}
      >
        <DialogContent className="h-auto max-w-sm">
          <DialogHeader>
            <DialogTitle label="DELETE EXPERT" />
            <DialogDescription>this action is irreversible.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex-none">
            <p className="font-code text-muted-foreground text-xs">
              {'> remove '}
              <strong className="text-foreground">{expert?.name}</strong>
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
