import { Badge } from '@/components/ui/badge';
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
import { MarkdownViewer } from '@/components/ui/markdown-viewer';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { fetchJson } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AgentSummary, ListAgentsResponse } from '@/types/agent';
import type { ProjectDetails, ProjectTask, TaskStatus, TaskThreadEvent } from '@/types/project';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function getTaskStatusVariant(status: TaskStatus) {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'assigned':
    case 'in_progress':
    case 'awaiting_review':
    case 'reopened':
      return 'info' as const;
    case 'blocked':
    case 'changes_requested':
      return 'warning' as const;
    case 'failed':
    case 'cancelled':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

function TaskDetailSkeleton() {
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
      <Skeleton className="h-60 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export default function TaskDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<ProjectTask | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [thread, setThread] = useState<TaskThreadEvent[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [requestChangesBody, setRequestChangesBody] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | 'run' | 'request_changes'>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  const ceo = useMemo(() => agents.find((agent) => agent.isCeo) ?? null, [agents]);
  const confirmBody = confirmAction === 'request_changes' ? requestChangesBody.trim() : '';
  const canRequestChanges = task ? ['awaiting_review', 'completed'].includes(task.status) : false;

  const load = useCallback(async (taskId: string) => {
    setLoading(true);
    setError('');
    try {
      const taskData = await fetchJson<ProjectTask>(`/tasks/${taskId}`);
      const [projectData, threadData, agentData] = await Promise.all([
        fetchJson<ProjectDetails>(`/projects/${taskData.projectId}`),
        fetchJson<TaskThreadEvent[]>(`/tasks/${taskId}/thread`),
        fetchJson<ListAgentsResponse>('/agents?limit=100'),
      ]);

      setTask(taskData);
      setProject(projectData);
      setThread(threadData);
      setAgents(agentData.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load task.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(id);
  }, [id, load]);

  const renderDependencies = (dependsOnTaskIds: number[]) => {
    if (dependsOnTaskIds.length === 0) {
      return '—';
    }

    const taskTitleById = new Map(
      project?.tasks.map((projectTask) => [projectTask.id, projectTask.title]) ?? [],
    );

    return dependsOnTaskIds
      .map((dependencyId) => taskTitleById.get(dependencyId) ?? `missing task #${dependencyId}`)
      .join(', ');
  };

  const runAction = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      if (!task || !ceo) {
        setError('CEO agent is required to perform workflow actions.');
        return;
      }

      setActing(true);
      setError('');
      try {
        await fetchJson(path, {
          body: JSON.stringify(body),
          method: 'POST',
        });
        await load(String(task.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Task action failed.');
      } finally {
        setActing(false);
      }
    },
    [ceo, load, task],
  );

  const confirmRun = useCallback(async () => {
    if (!task || !ceo || !confirmAction) {
      return;
    }

    if (confirmAction === 'run') {
      await runAction(`/tasks/${task.id}/run`, {
        authorAgentId: ceo.id,
        sandboxMode: 'workspace-write',
      });
      setConfirmAction(null);
      return;
    }

    await runAction(`/tasks/${task.id}/request-changes`, {
      authorAgentId: ceo.id,
      body: confirmBody,
      sandboxMode: 'workspace-write',
    });
    setRequestChangesBody('');
    setConfirmAction(null);
  }, [ceo, confirmAction, confirmBody, runAction, task]);

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
            onClick={() => (project ? navigate(`/projects/${project.id}`) : navigate('/projects'))}
            className="-ml-2"
          >
            <ArrowLeft className="mr-1.5 h-3 w-3" />
            {'< back'}
          </Button>
          <SectionHeader label="TASK OPERATIONS" />
          <h1 className="font-bold font-mono text-foreground text-xl sm:text-3xl">
            task
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

      {loading && <TaskDetailSkeleton />}

      {!loading && task && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={getTaskStatusVariant(task.status)}>{task.status}</Badge>
              {task.hasDependencyRisk ? <Badge variant="warning">dependency risk</Badge> : null}
              {project ? <Badge variant="secondary">{project.name}</Badge> : null}
              <Badge variant="outline">review cycle {task.reviewCycle}</Badge>
              <Badge variant="outline">reopens {task.reopenCount}</Badge>
            </div>
            <div className="space-y-1">
              <h2 className="font-mono text-foreground text-lg sm:text-2xl">{task.title}</h2>
              <p className="font-code text-muted-foreground text-xs">task #{task.id}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="border border-border bg-card p-4">
              <p className="mono-label">assignee</p>
              <p className="mt-2 font-mono text-foreground text-sm">
                {task.assignedToAgentName ?? 'unassigned'}
              </p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mono-label">depends_on</p>
              <p className="mt-2 font-mono text-foreground text-sm">
                {renderDependencies(task.dependsOnTaskIds)}
              </p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mono-label">last_execution</p>
              {task.lastExecutionId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 mt-1"
                  onClick={() => navigate(`/executions/${task.lastExecutionId}`)}
                >
                  {`> execution #${task.lastExecutionId}`}
                </Button>
              ) : (
                <p className="mt-2 font-mono text-muted-foreground text-sm">none</p>
              )}
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mono-label">created_at</p>
              <p className="mt-2 font-mono text-foreground text-sm">{formatDate(task.createdAt)}</p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mono-label">updated_at</p>
              <p className="mt-2 font-mono text-foreground text-sm">{formatDate(task.updatedAt)}</p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mono-label">completed_at</p>
              <p className="mt-2 font-mono text-foreground text-sm">
                {task.completedAt ? formatDate(task.completedAt) : '—'}
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <SectionHeader label="TASK BRIEF" />
            <MarkdownViewer value={task.description} minHeight="280px" />
          </section>

          <section className="space-y-4">
            <div className="space-y-3 border border-border bg-card p-4">
              <SectionHeader label="CEO ACTIONS" />
              <div className="flex flex-wrap items-center justify-between gap-3 border border-border/70 bg-background/50 p-3">
                <div>
                  <p className="font-mono text-foreground text-sm">execute assigned task</p>
                  <p className="mt-1 font-code text-muted-foreground text-xs">
                    runs the `execute-task` command with the current task brief and thread context.
                  </p>
                  {!task.canRun && task.runBlockedReason ? (
                    <p className="mt-2 font-code text-warning text-xs">{`> ${task.runBlockedReason}`}</p>
                  ) : null}
                </div>
                <Button
                  disabled={acting || !ceo || !task.canRun}
                  onClick={() => setConfirmAction('run')}
                >
                  {acting ? '[ running... ]' : '[ run ]'}
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border border-border/70 bg-background/50 p-3">
                <div>
                  <p className="font-mono text-foreground text-sm">approve latest delivery</p>
                  <p className="mt-1 font-code text-muted-foreground text-xs">
                    closes the task after the CEO accepts the agent output.
                  </p>
                </div>
                <Button
                  disabled={acting || !ceo || task.status !== 'awaiting_review'}
                  onClick={() =>
                    void runAction(`/tasks/${task.id}/approve`, {
                      authorAgentId: ceo?.id,
                    })
                  }
                >
                  [ approve ]
                </Button>
              </div>

              <div className="space-y-2 border-border border-t pt-4">
                <label htmlFor="request-changes-body" className="mono-label">
                  request changes + rerun
                </label>
                <Textarea
                  id="request-changes-body"
                  value={requestChangesBody}
                  onChange={(event) => setRequestChangesBody(event.target.value)}
                  placeholder="What should the agent change before the next iteration?"
                  rows={3}
                />
                <p className="font-code text-2xs text-muted-foreground">
                  {
                    '> this feedback is recorded as CEO instruction and immediately starts a new execution cycle.'
                  }
                </p>
                <Button
                  variant="destructive"
                  disabled={acting || !ceo || !requestChangesBody.trim() || !canRequestChanges}
                  onClick={() => setConfirmAction('request_changes')}
                >
                  [ request changes ]
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader label="TASK THREAD" />
            <div className="space-y-3">
              {thread.length === 0 ? (
                <div className="border border-border bg-card p-4 font-code text-muted-foreground text-xs">
                  {'> no thread activity yet'}
                </div>
              ) : (
                thread.map((event) => (
                  <div key={event.id} className="border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{event.kind}</Badge>
                      <span className="font-mono text-foreground text-sm">
                        {event.authorAgentName}
                      </span>
                      <span className="font-code text-2xs text-muted-foreground">
                        {formatDate(event.createdAt)}
                      </span>
                      {event.executionId ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-1 h-auto px-1 py-0"
                          onClick={() => navigate(`/executions/${event.executionId}`)}
                        >
                          {`execution #${event.executionId}`}
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 whitespace-pre-wrap font-code text-muted-foreground text-xs leading-relaxed">
                      {event.body}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent className="h-auto max-w-lg">
          <DialogHeader>
            <DialogTitle label="CONFIRM RUN" />
            <DialogDescription>
              {confirmAction === 'request_changes'
                ? 'this will send CEO feedback to the agent and start a new execution immediately.'
                : 'this will start task execution with the assigned agent.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex-none">
            <div className="space-y-3 border border-border/70 bg-background/50 p-4">
              <p className="mono-label">task</p>
              <p className="font-mono text-foreground text-sm">{task?.title ?? '—'}</p>
              <p className="mono-label">agent</p>
              <p className="font-mono text-foreground text-sm">
                {task?.assignedToAgentName ?? 'unassigned'}
              </p>
              <p className="mono-label">sandbox</p>
              <p className="font-mono text-foreground text-sm">workspace-write</p>
              <p className="mono-label">working_directory</p>
              <p className="break-all font-mono text-foreground text-sm">
                {project?.workingDirectory ?? '—'}
              </p>
              <p className="font-code text-warning text-xs">
                {
                  '> execution may modify files or run commands in the workspace. review before continuing.'
                }
              </p>
              {confirmAction === 'request_changes' ? (
                <>
                  <p className="mono-label">ceo_feedback</p>
                  <p className="whitespace-pre-wrap font-code text-muted-foreground text-xs">
                    {confirmBody}
                  </p>
                </>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmAction(null)} disabled={acting}>
              cancel
            </Button>
            <Button
              variant={confirmAction === 'request_changes' ? 'destructive' : 'default'}
              disabled={acting || !ceo || (confirmAction === 'request_changes' && !confirmBody)}
              onClick={() => {
                void confirmRun();
              }}
            >
              {acting ? '[ running... ]' : '[ confirm ]'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
