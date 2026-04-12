import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types/agent';
import { PauseCircle, PlayCircle } from 'lucide-react';

const STATUS_COPY: Record<
  AgentStatus,
  { title: string; description: string; badge: 'success' | 'warning' | 'secondary' }
> = {
  ready: {
    title: 'Ready',
    description: 'The assigned model is available and the agent can run.',
    badge: 'success',
  },
  not_ready: {
    title: 'Needs setup',
    description: 'Assign a valid model before this agent can run.',
    badge: 'warning',
  },
  suspended: {
    title: 'Suspended',
    description: 'The agent is paused and excluded from execution.',
    badge: 'secondary',
  },
};

export function AgentStatusPanel({
  effectiveStatus,
  entityLabel = 'agent',
  isSuspended,
  onToggleSuspended,
}: {
  effectiveStatus: AgentStatus;
  entityLabel?: string;
  isSuspended: boolean;
  onToggleSuspended: () => void;
}) {
  const copy = STATUS_COPY[effectiveStatus];
  const description = copy.description.replace(/agent/g, entityLabel);

  return (
    <div className="flex flex-col gap-2 border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono-label">runtime state</span>
          <Badge variant={copy.badge}>{copy.title}</Badge>
        </div>
        <p className="mt-1 truncate font-code text-muted-foreground text-xs sm:pr-4">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggleSuspended}
        aria-pressed={isSuspended}
        className={cn(
          'inline-flex shrink-0 items-center justify-between gap-2 border px-3 py-2 text-left transition-all duration-150 sm:min-w-[180px]',
          isSuspended
            ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-200'
            : 'border-border bg-card/40 text-muted-foreground hover:border-foreground/40 hover:text-foreground',
        )}
      >
        <div className="flex items-center gap-2">
          {isSuspended ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
          <span className="font-code text-xs">
            {isSuspended ? `resume ${entityLabel}` : `pause ${entityLabel}`}
          </span>
        </div>
        <span
          className={cn(
            'inline-flex h-2.5 w-2.5 rounded-full',
            isSuspended ? 'bg-yellow-400' : 'bg-emerald-400',
          )}
        />
      </button>
    </div>
  );
}
