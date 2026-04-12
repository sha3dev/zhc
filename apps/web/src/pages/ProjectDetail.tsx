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
import { Label } from '@/components/ui/label';
import { MarkdownViewer } from '@/components/ui/markdown-viewer';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchJson } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AgentSummary, ListAgentsResponse } from '@/types/agent';
import type { ProjectDetails, ProjectStatus, ProjectTask, TaskStatus } from '@/types/project';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function getProjectStatusVariant(status: ProjectStatus) {
  switch (status) {
    case 'ready':
    case 'completed':
      return 'success' as const;
    case 'planning':
    case 'on_hold':
      return 'warning' as const;
    case 'in_progress':
      return 'info' as const;
    case 'cancelled':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

function getTaskStatusVariant(status: TaskStatus) {
  switch (status) {
    case 'completed':
      return 'success' as const;
    case 'in_progress':
    case 'waiting':
      return 'info' as const;
    case 'failed':
    case 'cancelled':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-64" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-2.5 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((index) => (
          <div key={index} className="border border-border p-4">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function dependencyTitles(task: ProjectTask, taskTitleById: Map<number, string>) {
  if (task.dependsOnTaskIds.length === 0) {
    return 'none';
  }

  return task.dependsOnTaskIds
    .map((dependencyId) => taskTitleById.get(dependencyId) ?? `missing task #${dependencyId}`)
    .join(', ');
}

export default function ProjectDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [runningTask, setRunningTask] = useState(false);
  const [confirmRunTask, setConfirmRunTask] = useState<ProjectTask | null>(null);

  const ceo = useMemo(() => agents.find((agent) => agent.isCeo) ?? null, [agents]);

  const loadProject = useCallback(async (projectId: string) => {
    setLoading(true);
    setError('');
    setProject(null);
    try {
      const [projectData, agentData] = await Promise.all([
        fetchJson<ProjectDetails>(`/projects/${projectId}`),
        fetchJson<ListAgentsResponse>('/agents?limit=100'),
      ]);
      setProject(projectData);
      setAgents(agentData.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load project.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProject(id);
  }, [id, loadProject]);

  const taskTitleById = useMemo(
    () => new Map(project?.tasks.map((task) => [task.id, task.title]) ?? []),
    [project],
  );

  const executeTask = useCallback(async () => {
    if (!ceo || !confirmRunTask) {
      return;
    }

    setRunningTask(true);
    setError('');
    try {
      await fetchJson(`/tasks/${confirmRunTask.id}/run`, {
        body: JSON.stringify({
          authorAgentId: ceo.id,
          sandboxMode: 'workspace-write',
        }),
        method: 'POST',
      });
      await loadProject(id);
      navigate(`/tasks/${confirmRunTask.id}`);
      setConfirmRunTask(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to execute task.');
    } finally {
      setRunningTask(false);
    }
  }, [ceo, confirmRunTask, id, loadProject]);

  return (
    <div
      className="relative flex min-h-full flex-col gap-5 p-4 sm:p-6"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(55,247,18,0.018) 28px, rgba(55,247,18,0.018) 29px)',
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="-ml-1">
          <ArrowLeft className="mr-1.5 h-3 w-3" />
          {'< back'}
        </Button>
        {!loading && project ? (
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
            [ delete project ]
          </Button>
        ) : null}
      </div>

      {error && (
        <div className="shrink-0 animate-toast border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-destructive text-xs">
          {`> error: ${error}`}
        </div>
      )}

      {loading && <ProjectDetailSkeleton />}

      {!loading && project && (
        <div className="flex min-h-0 flex-1 flex-col gap-5">
          <div className="shrink-0">
            <SectionHeader label="PROJECT DETAIL" />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="break-words font-bold font-mono text-foreground text-xl sm:text-2xl">
                {project.name}
                <span
                  className="ml-1 animate-cursor-blink text-primary"
                  style={{ textShadow: 'var(--glow-primary)' }}
                >
                  |
                </span>
              </h1>
              <Badge variant={getProjectStatusVariant(project.status)}>{project.status}</Badge>
              {project.activeTaskId ? (
                <Badge variant="secondary">{`active task #${project.activeTaskId}`}</Badge>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <span className="font-code text-2xs text-muted-foreground">
                slug <span className="text-foreground">{project.slug}</span>
              </span>
              <span className="font-code text-2xs text-muted-foreground">
                owner <span className="text-foreground">{project.ownerAgentName ?? 'n/a'}</span>
              </span>
              <span className="font-code text-2xs text-muted-foreground">
                created <span className="text-foreground">{formatDate(project.createdAt)}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
            <div className="border border-border bg-card p-4">
              <p className="mono-label">task.count</p>
              <p className="mt-2 font-mono text-foreground text-lg">
                {project.completedTaskCount}/{project.taskCount}
              </p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mono-label">creator</p>
              <p className="mt-2 font-code text-foreground text-xs">{project.createdBy}</p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mono-label">planning.execution</p>
              <p className="mt-2 font-code text-foreground text-xs">
                {project.planningExecutionId ? `#${project.planningExecutionId}` : 'n/a'}
              </p>
            </div>
            <div className="border border-border bg-card p-4">
              <p className="mono-label">active.path</p>
              <p className="mt-2 font-code text-foreground text-xs">
                {project.activePathIds.length > 0 ? project.activePathIds.join(' -> ') : 'none'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="border border-border bg-card p-4">
              <Label>source brief</Label>
              <div className="mt-3">
                <MarkdownViewer value={project.sourceBrief} minHeight="160px" />
              </div>
            </div>
            <div className="border border-border bg-card p-4">
              <Label>CEO definition brief</Label>
              <div className="mt-3">
                <MarkdownViewer value={project.definitionBrief || 'n/a'} minHeight="160px" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="border border-border bg-card p-4">
              <Label>working directory</Label>
              <p className="mt-3 break-all font-code text-muted-foreground text-xs leading-relaxed">
                {project.workingDirectory}
              </p>
            </div>
            <div className="border border-border bg-card p-4">
              <Label>support artifacts</Label>
              <div className="mt-3 space-y-2">
                {project.artifacts.length === 0 ? (
                  <p className="font-code text-muted-foreground text-xs">n/a</p>
                ) : (
                  project.artifacts.map((artifact) => (
                    <div key={artifact.path} className="border border-border/70 px-3 py-2">
                      <p className="font-mono text-foreground text-xs">{artifact.title}</p>
                      <p className="mt-1 font-code text-2xs text-muted-foreground">
                        {artifact.path}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto border border-border bg-card">
            <div className="border-border border-b px-4 py-3">
              <SectionHeader label="TASK TREE / ACTIVE PATH" />
            </div>
            {project.tasks.length === 0 ? (
              <div className="py-10 text-center font-code text-muted-foreground text-xs">
                {'> no tasks generated yet.'}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {project.tasks.map((task) => {
                  const isActivePath = project.activePathIds.includes(task.id);
                  const isFocused = project.activeTaskId === task.id;

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className={`block w-full px-4 py-4 text-left transition-colors duration-150 hover:bg-primary/5 ${
                        isFocused ? 'bg-primary/8' : isActivePath ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-code text-2xs text-muted-foreground">
                                {String(task.sort).padStart(2, '0')}
                              </span>
                              <h3 className="font-bold font-mono text-foreground text-sm">
                                {task.title}
                              </h3>
                              {isFocused ? <Badge variant="secondary">current focus</Badge> : null}
                              {isActivePath && !isFocused ? (
                                <Badge variant="outline">active path</Badge>
                              ) : null}
                              {task.hasDependencyRisk ? (
                                <Badge variant="warning">at risk</Badge>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 font-code text-2xs text-muted-foreground">
                              <span>
                                assignee{' '}
                                <span className="text-foreground">
                                  {task.assignedToAgentName ?? 'missing actor'}
                                </span>
                              </span>
                              <span>
                                cycle <span className="text-foreground">{task.reviewCycle}</span>
                              </span>
                              <span>
                                task_id <span className="text-foreground">#{task.id}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={getTaskStatusVariant(task.status)}>{task.status}</Badge>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={runningTask || !ceo || !task.canRun}
                              title={
                                task.canRun
                                  ? 'Run task'
                                  : (task.runBlockedReason ?? 'Task cannot run')
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                setConfirmRunTask(task);
                              }}
                            >
                              {runningTask ? '[ running... ]' : '[ run ]'}
                            </Button>
                          </div>
                        </div>

                        <div className="border border-border/70 bg-background/50 px-3 py-3">
                          <p className="whitespace-pre-wrap font-code text-muted-foreground text-xs leading-relaxed">
                            {task.description.split('\n')[0]}
                          </p>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                          <p className="mono-label pt-1">depends_on</p>
                          <p className="font-code text-muted-foreground text-xs">
                            {dependencyTitles(task, taskTitleById)}
                          </p>
                        </div>

                        {!task.canRun && task.runBlockedReason ? (
                          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                            <p className="mono-label pt-1">run_status</p>
                            <p className="font-code text-warning text-xs">{`> ${task.runBlockedReason}`}</p>
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={confirmRunTask !== null}
        onOpenChange={(open) => {
          if (!open && !runningTask) setConfirmRunTask(null);
        }}
      >
        <DialogContent className="h-auto max-w-lg">
          <DialogHeader>
            <DialogTitle label="CONFIRM RUN" />
            <DialogDescription>
              this will start execution with the assigned agent.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex-none">
            <div className="space-y-3 border border-border/70 bg-background/50 p-4">
              <p className="mono-label">task</p>
              <p className="font-mono text-foreground text-sm">{confirmRunTask?.title ?? '—'}</p>
              <p className="mono-label">agent</p>
              <p className="font-mono text-foreground text-sm">
                {confirmRunTask?.assignedToAgentName ?? 'missing actor'}
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
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRunTask(null)} disabled={runningTask}>
              cancel
            </Button>
            <Button
              disabled={runningTask || !ceo || !confirmRunTask?.canRun}
              onClick={() => void executeTask()}
            >
              {runningTask ? '[ running... ]' : '[ confirm ]'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setShowDelete(false);
        }}
      >
        <DialogContent className="h-auto max-w-sm">
          <DialogHeader>
            <DialogTitle label="DELETE PROJECT" />
            <DialogDescription>this action is irreversible.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex-none">
            <p className="font-code text-muted-foreground text-xs">
              {'> remove '}
              <strong className="text-foreground">{project?.name}</strong>
              {
                ' and all associated tasks, planning execution, support files, and project directory.'
              }
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDelete(false)} disabled={deleting}>
              cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!project) return;
                setDeleting(true);
                setError('');
                try {
                  await fetchJson(`/projects/${project.id}`, { method: 'DELETE' });
                  navigate('/projects');
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Unable to delete project.');
                } finally {
                  setDeleting(false);
                  setShowDelete(false);
                }
              }}
            >
              {deleting ? '[ deleting... ]' : '[ DELETE ]'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
