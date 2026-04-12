import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarkdownViewer } from '@/components/ui/markdown-viewer';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchJson } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { ExecutionDetails } from '@/types/execution';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(2)}s`;
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? 'null';
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="border border-border bg-card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-5 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export default function ExecutionDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<ExecutionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (executionId: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJson<ExecutionDetails>(`/executions/${executionId}`);
      setExecution(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load execution.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(id);
  }, [id, load]);

  return (
    <div
      className="relative min-h-full space-y-6 p-4 sm:space-y-8 sm:p-6"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(55,247,18,0.018) 28px, rgba(55,247,18,0.018) 29px)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/executions')}
            className="-ml-2"
          >
            <ArrowLeft className="mr-1.5 h-3 w-3" />
            {'< back to executions'}
          </Button>
          <SectionHeader label="EXECUTION DETAIL" />
          <h1 className="font-bold font-mono text-foreground text-xl sm:text-3xl">
            execution
            <span
              className="ml-1 animate-cursor-blink text-primary"
              style={{ textShadow: 'var(--glow-primary)' }}
            >
              |
            </span>
          </h1>
        </div>
      </div>

      {error && (
        <div className="border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="font-code text-destructive text-xs">{`> error: ${error}`}</p>
        </div>
      )}

      {loading && <DetailSkeleton />}

      {!loading && execution && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>{execution.operationKey}</Badge>
              <Badge variant="secondary">{execution.cliId}</Badge>
              <Badge variant="outline">{execution.model}</Badge>
            </div>
            <div className="space-y-1">
              <h2 className="font-mono text-foreground text-lg sm:text-2xl">
                {execution.agentName}
              </h2>
              <p className="font-code text-muted-foreground text-xs">execution #{execution.id}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="border border-border bg-card p-4">
              <p className="mono-label">executed_at</p>
              <p className="mt-2 font-mono text-foreground text-sm">
                {formatDate(execution.executedAt)}
              </p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mono-label">duration</p>
              <p className="mt-2 font-mono text-foreground text-sm">
                {formatDuration(execution.durationMs)}
              </p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mono-label">sandbox</p>
              <p className="mt-2 font-mono text-foreground text-sm">{execution.sandboxMode}</p>
            </div>
            <div className="border border-border bg-card p-4 md:col-span-2 xl:col-span-1">
              <p className="mono-label">prompt_path</p>
              <p className="mt-2 break-all font-mono text-foreground text-sm">
                {execution.promptPath}
              </p>
            </div>
            <div className="border border-border bg-card p-4 md:col-span-2">
              <p className="mono-label">working_directory</p>
              <p className="mt-2 break-all font-mono text-foreground text-sm">
                {execution.workingDirectory}
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <SectionHeader label="USER INPUT" />
            <MarkdownViewer value={execution.userInput} minHeight="140px" />
          </section>

          <section className="space-y-3">
            <SectionHeader label="COMPOSED PROMPT" />
            <MarkdownViewer value={execution.composedPrompt} minHeight="520px" />
          </section>

          <section className="space-y-3">
            <SectionHeader label="PROMPT BLOCKS" />
            <div className="space-y-4">
              {execution.promptBlocks.map((block) => (
                <div key={`${block.kind}:${block.key}`} className="border border-border bg-card">
                  <div className="flex flex-wrap items-center gap-2 border-border border-b px-4 py-3">
                    <Badge variant="secondary">{block.kind}</Badge>
                    <span className="font-mono text-foreground text-xs">{block.title}</span>
                    <span className="font-code text-2xs text-muted-foreground">{block.key}</span>
                  </div>
                  <div className="p-4">
                    <MarkdownViewer value={block.content} minHeight="180px" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader label="RAW OUTPUT" />
            <MarkdownViewer value={execution.rawOutput} minHeight="420px" />
          </section>

          {execution.validationError && (
            <section className="space-y-3">
              <SectionHeader label="VALIDATION ERROR" />
              <div className="border border-destructive/40 bg-destructive/5 px-4 py-3">
                <p className="font-code text-destructive text-xs">{execution.validationError}</p>
              </div>
            </section>
          )}

          {execution.context !== null && (
            <section className="space-y-3">
              <SectionHeader label="CONTEXT JSON" />
              <MarkdownViewer
                value={`\`\`\`json\n${formatJson(execution.context)}\n\`\`\``}
                minHeight="220px"
              />
            </section>
          )}

          {execution.parsedOutput !== null && (
            <section className="space-y-3">
              <SectionHeader label="PARSED OUTPUT" />
              <MarkdownViewer
                value={`\`\`\`json\n${formatJson(execution.parsedOutput)}\n\`\`\``}
                minHeight="220px"
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
