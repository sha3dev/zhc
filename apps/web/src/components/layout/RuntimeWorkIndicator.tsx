import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchJson } from '@/lib/api';
import type { ProjectTask } from '@/types/project';
import { Activity, AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ListTasksResponse {
  items: ProjectTask[];
  limit: number;
  offset: number;
  total: number;
}

export default function RuntimeWorkIndicator() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetchJson<ListTasksResponse>('/tasks?status=in_progress&limit=5');
      setTasks(response.items);
      setTotal(response.total);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to inspect running tasks.');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, 3000);

    const onFocus = () => {
      void load();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const running = total > 0;
  const primaryTask = tasks[0] ?? null;

  return (
    <div
      className={`shrink-0 border-b px-3 py-2 sm:px-4 ${
        running
          ? 'border-info/40 bg-info/8'
          : error
            ? 'border-warning/40 bg-warning/5'
            : 'border-border bg-card/80'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {error ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
          ) : (
            <Activity
              className={`h-3.5 w-3.5 shrink-0 ${running ? 'animate-pulse text-info' : 'text-muted-foreground'}`}
            />
          )}
          <div className="min-w-0">
            <p className={`font-mono text-xs ${running ? 'text-info' : 'text-muted-foreground'}`}>
              {error
                ? 'runtime visibility degraded'
                : running
                  ? `${total} agent${total === 1 ? '' : 's'} working`
                  : 'no agents working'}
            </p>
            <p className="truncate font-code text-2xs text-muted-foreground">
              {error
                ? `> ${error}`
                : primaryTask
                  ? `> ${primaryTask.assignedToAgentName ?? 'agent'} executing task #${primaryTask.id}: ${primaryTask.title}`
                  : '> runtime idle'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={running ? 'info' : 'outline'}>{running ? 'busy' : 'idle'}</Badge>
          {primaryTask ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 py-0 font-mono text-2xs"
              onClick={() => navigate(`/tasks/${primaryTask.id}`)}
            >
              view task
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
