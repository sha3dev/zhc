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
import type {
  ProjectDetails,
  ProjectTask,
  TaskStatus,
  TaskThreadAttachment,
  TaskThreadEvent,
} from '@/types/project';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type ConfirmAction = 'run' | 'feedback' | 'deny' | null;
type AgentResponseType = 'needs_ceo_feedback' | 'ready_for_approval' | null;
type AttachmentDraft = {
  kind: 'external_url' | 'project_file';
  mediaType: string;
  title: string;
  value: string;
};

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

function getAgentResponseType(event: TaskThreadEvent | null): AgentResponseType {
  if (!event || event.kind !== 'agent_response') {
    return null;
  }

  const value = event.metadata?.responseType;
  return value === 'needs_ceo_feedback' || value === 'ready_for_approval' ? value : null;
}

function getAttachmentHref(taskId: number, attachment: TaskThreadAttachment): string {
  if (attachment.kind === 'external_url' && attachment.url) {
    return attachment.url;
  }

  return `/api/tasks/${taskId}/attachments/${attachment.id}/content`;
}

function isImageAttachment(attachment: TaskThreadAttachment): boolean {
  const mediaType = attachment.mediaType?.toLowerCase() ?? '';
  if (mediaType.startsWith('image/')) {
    return true;
  }

  const value = (attachment.path ?? attachment.url ?? '').toLowerCase();
  return ['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'].some((extension) =>
    value.endsWith(extension),
  );
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

function AttachmentComposer(props: {
  attachmentDrafts: AttachmentDraft[];
  attachmentKind: 'external_url' | 'project_file';
  attachmentMediaType: string;
  attachmentTitle: string;
  attachmentValue: string;
  onAdd: () => void;
  onKindChange: (kind: 'external_url' | 'project_file') => void;
  onMediaTypeChange: (value: string) => void;
  onRemove: (index: number) => void;
  onTitleChange: (value: string) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2 rounded border border-border/70 bg-background/50 p-3">
      <p className="mono-label">optional attachments</p>
      <div className="grid gap-2 md:grid-cols-2">
        <input
          value={props.attachmentTitle}
          onChange={(event) => props.onTitleChange(event.target.value)}
          placeholder="Attachment title"
          className="border border-border bg-background px-3 py-2 font-code text-xs"
        />
        <input
          value={props.attachmentMediaType}
          onChange={(event) => props.onMediaTypeChange(event.target.value)}
          placeholder="Media type (optional)"
          className="border border-border bg-background px-3 py-2 font-code text-xs"
        />
        <select
          value={props.attachmentKind}
          onChange={(event) =>
            props.onKindChange(event.target.value as 'external_url' | 'project_file')
          }
          className="border border-border bg-background px-3 py-2 font-code text-xs"
        >
          <option value="project_file">project file</option>
          <option value="external_url">external url</option>
        </select>
        <input
          value={props.attachmentValue}
          onChange={(event) => props.onValueChange(event.target.value)}
          placeholder={
            props.attachmentKind === 'project_file' ? 'docs/spec.md' : 'https://example.com/ref.png'
          }
          className="border border-border bg-background px-3 py-2 font-code text-xs"
        />
      </div>
      <Button type="button" variant="secondary" onClick={props.onAdd}>
        [ add attachment ]
      </Button>
      {props.attachmentDrafts.length > 0 ? (
        <div className="space-y-2">
          {props.attachmentDrafts.map((attachment, index) => (
            <div
              key={`${attachment.title}-${index}`}
              className="flex items-center justify-between gap-3 border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-mono text-foreground text-xs">{attachment.title}</p>
                <p className="truncate font-code text-2xs text-muted-foreground">
                  {attachment.value}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => props.onRemove(index)}>
                [ remove ]
              </Button>
            </div>
          ))}
        </div>
      ) : null}
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
  const [feedbackBody, setFeedbackBody] = useState('');
  const [denyBody, setDenyBody] = useState('');
  const [humanFeedbackBody, setHumanFeedbackBody] = useState('');
  const [attachmentDrafts, setAttachmentDrafts] = useState<AttachmentDraft[]>([]);
  const [attachmentKind, setAttachmentKind] = useState<'external_url' | 'project_file'>('project_file');
  const [attachmentMediaType, setAttachmentMediaType] = useState('');
  const [attachmentTitle, setAttachmentTitle] = useState('');
  const [attachmentValue, setAttachmentValue] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  const ceo = useMemo(() => agents.find((agent) => agent.isCeo) ?? null, [agents]);
  const latestEvent = thread.at(-1) ?? null;
  const latestAgentResponse = [...thread].reverse().find((event) => event.kind === 'agent_response') ?? null;
  const latestAgentResponseType = getAgentResponseType(latestAgentResponse);
  const confirmBody =
    confirmAction === 'feedback' ? feedbackBody.trim() : confirmAction === 'deny' ? denyBody.trim() : '';
  const confirmAttachments = attachmentDrafts.map((attachment) =>
    attachment.kind === 'external_url'
      ? {
          kind: 'external_url' as const,
          mediaType: attachment.mediaType.trim() || undefined,
          title: attachment.title,
          url: attachment.value,
        }
      : {
          kind: 'project_file' as const,
          mediaType: attachment.mediaType.trim() || undefined,
          path: attachment.value,
          title: attachment.title,
        },
  );

  const markTaskRunningLocally = useCallback(() => {
    setTask((current) =>
      current
        ? {
            ...current,
            canRun: false,
            runBlockedReason: 'Task cannot run while status is in_progress.',
            status: 'in_progress',
          }
        : current,
    );
  }, []);

  const load = useCallback(async (taskId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
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
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(id);
  }, [id, load]);

  useEffect(() => {
    if (!task || task.status !== 'in_progress') {
      return;
    }

    const interval = window.setInterval(() => {
      void load(String(task.id), { silent: true });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [load, task]);

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

  const postAction = useCallback(
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
        await load(String(task.id), { silent: true });
      } finally {
        setActing(false);
      }
    },
    [ceo, load, task],
  );

  const addAttachmentDraft = useCallback(() => {
    const title = attachmentTitle.trim();
    const value = attachmentValue.trim();

    if (!title || !value) {
      return;
    }

    setAttachmentDrafts((current) => [
      ...current,
      {
        kind: attachmentKind,
        mediaType: attachmentMediaType.trim(),
        title,
        value,
      },
    ]);
    setAttachmentTitle('');
    setAttachmentValue('');
    setAttachmentMediaType('');
  }, [attachmentKind, attachmentMediaType, attachmentTitle, attachmentValue]);

  const confirmRun = useCallback(async () => {
    if (!task || !ceo || !confirmAction) {
      return;
    }

    if (confirmAction === 'run') {
      markTaskRunningLocally();
      await postAction(`/tasks/${task.id}/run`, {
        authorAgentId: ceo.id,
        sandboxMode: 'workspace-write',
      });
      setConfirmAction(null);
      return;
    }

    if (confirmAction === 'feedback') {
      markTaskRunningLocally();
      await postAction(`/tasks/${task.id}/feedback`, {
        attachments: confirmAttachments,
        authorAgentId: ceo.id,
        body: confirmBody,
        sandboxMode: 'workspace-write',
      });
      setFeedbackBody('');
      setAttachmentDrafts([]);
      setConfirmAction(null);
      return;
    }

    markTaskRunningLocally();
    await postAction(`/tasks/${task.id}/deny`, {
      attachments: confirmAttachments,
      authorAgentId: ceo.id,
      body: confirmBody,
      sandboxMode: 'workspace-write',
    });
    setDenyBody('');
    setAttachmentDrafts([]);
    setConfirmAction(null);
  }, [ceo, confirmAction, confirmAttachments, confirmBody, markTaskRunningLocally, postAction, task]);

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
              {latestAgentResponseType ? <Badge variant="outline">{latestAgentResponseType}</Badge> : null}
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
                {task.assignedToAgentName ?? 'missing actor'}
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
                  <p className="font-mono text-foreground text-sm">run task</p>
                  <p className="mt-1 font-code text-muted-foreground text-xs">
                    creates a `run_request` and starts the assigned actor.
                  </p>
                  {!task.canRun && task.runBlockedReason ? (
                    <p className="mt-2 font-code text-warning text-xs">{`> ${task.runBlockedReason}`}</p>
                  ) : null}
                </div>
                <Button disabled={acting || !ceo || !task.canRun} onClick={() => setConfirmAction('run')}>
                  {acting ? '[ running... ]' : '[ run ]'}
                </Button>
              </div>

              {task.status === 'in_progress' ? (
                <div className="border border-border/70 bg-background/50 p-3">
                  <p className="font-mono text-foreground text-sm">agent working</p>
                  <p className="mt-1 font-code text-muted-foreground text-xs">
                    the assigned actor is executing right now; another run is blocked until it finishes.
                  </p>
                </div>
              ) : null}

              {task.status === 'waiting' && latestAgentResponseType === 'ready_for_approval' ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border border-border/70 bg-background/50 p-3">
                    <div>
                      <p className="font-mono text-foreground text-sm">approve delivery</p>
                      <p className="mt-1 font-code text-muted-foreground text-xs">
                        closes the task after the CEO accepts the latest agent response.
                      </p>
                    </div>
                    <Button
                      disabled={acting || !ceo}
                      onClick={() =>
                        void postAction(`/tasks/${task.id}/approve`, {
                          authorAgentId: ceo?.id,
                        })
                      }
                    >
                      [ approve ]
                    </Button>
                  </div>

                  <div className="space-y-2 border-border border-t pt-4">
                    <label htmlFor="deny-body" className="mono-label">
                      deny + rerun
                    </label>
                    <Textarea
                      id="deny-body"
                      value={denyBody}
                      onChange={(event) => setDenyBody(event.target.value)}
                      placeholder="Why is the CEO denying this delivery?"
                      rows={3}
                    />
                  <p className="font-code text-2xs text-muted-foreground">
                    {'> this denial is recorded as ceo_response and immediately starts a new run_request.'}
                  </p>
                  <AttachmentComposer
                    attachmentDrafts={attachmentDrafts}
                    attachmentKind={attachmentKind}
                    attachmentMediaType={attachmentMediaType}
                    attachmentTitle={attachmentTitle}
                    attachmentValue={attachmentValue}
                    onAdd={addAttachmentDraft}
                    onKindChange={setAttachmentKind}
                    onMediaTypeChange={setAttachmentMediaType}
                    onRemove={(index) =>
                      setAttachmentDrafts((current) =>
                        current.filter((_, currentIndex) => currentIndex !== index),
                      )
                    }
                    onTitleChange={setAttachmentTitle}
                    onValueChange={setAttachmentValue}
                  />
                  <Button
                    variant="destructive"
                    disabled={acting || !ceo || !denyBody.trim()}
                      onClick={() => setConfirmAction('deny')}
                    >
                      [ deny ]
                    </Button>
                  </div>
                </>
              ) : null}

              {task.status === 'waiting' && latestAgentResponseType === 'needs_ceo_feedback' ? (
                <div className="space-y-2 border-border border-t pt-4">
                  <label htmlFor="feedback-body" className="mono-label">
                    ceo feedback + rerun
                  </label>
                  <Textarea
                    id="feedback-body"
                    value={feedbackBody}
                    onChange={(event) => setFeedbackBody(event.target.value)}
                    placeholder="Provide the information or decision the agent requested."
                    rows={3}
                  />
                  <p className="font-code text-2xs text-muted-foreground">
                    {'> this feedback is recorded as ceo_response and immediately starts a new run_request.'}
                  </p>
                  <AttachmentComposer
                    attachmentDrafts={attachmentDrafts}
                    attachmentKind={attachmentKind}
                    attachmentMediaType={attachmentMediaType}
                    attachmentTitle={attachmentTitle}
                    attachmentValue={attachmentValue}
                    onAdd={addAttachmentDraft}
                    onKindChange={setAttachmentKind}
                    onMediaTypeChange={setAttachmentMediaType}
                    onRemove={(index) =>
                      setAttachmentDrafts((current) =>
                        current.filter((_, currentIndex) => currentIndex !== index),
                      )
                    }
                    onTitleChange={setAttachmentTitle}
                    onValueChange={setAttachmentValue}
                  />
                  <Button
                    disabled={acting || !ceo || !feedbackBody.trim()}
                    onClick={() => setConfirmAction('feedback')}
                  >
                    [ send feedback ]
                  </Button>
                </div>
              ) : null}

              {task.status === 'waiting' ? (
                <div className="space-y-2 border-border border-t pt-4">
                  <label htmlFor="human-feedback-body" className="mono-label">
                    request human feedback
                  </label>
                  <Textarea
                    id="human-feedback-body"
                    value={humanFeedbackBody}
                    onChange={(event) => setHumanFeedbackBody(event.target.value)}
                    placeholder="What does the human need to answer?"
                    rows={3}
                  />
                  <p className="font-code text-2xs text-muted-foreground">
                    {'> this creates a human_feedback_request event and sends an email to human.email.'}
                  </p>
                  <AttachmentComposer
                    attachmentDrafts={attachmentDrafts}
                    attachmentKind={attachmentKind}
                    attachmentMediaType={attachmentMediaType}
                    attachmentTitle={attachmentTitle}
                    attachmentValue={attachmentValue}
                    onAdd={addAttachmentDraft}
                    onKindChange={setAttachmentKind}
                    onMediaTypeChange={setAttachmentMediaType}
                    onRemove={(index) =>
                      setAttachmentDrafts((current) =>
                        current.filter((_, currentIndex) => currentIndex !== index),
                      )
                    }
                    onTitleChange={setAttachmentTitle}
                    onValueChange={setAttachmentValue}
                  />
                  <Button
                    variant="secondary"
                    disabled={acting || !ceo || !humanFeedbackBody.trim()}
                    onClick={() =>
                      void postAction(`/tasks/${task.id}/human-feedback-request`, {
                        attachments: confirmAttachments,
                        authorAgentId: ceo?.id,
                        body: humanFeedbackBody.trim(),
                      }).then(() => {
                        setHumanFeedbackBody('');
                        setAttachmentDrafts([]);
                      })
                    }
                  >
                    [ request human feedback ]
                  </Button>
                </div>
              ) : null}

              {task.status === 'waiting' && latestEvent?.kind === 'human_feedback_request' ? (
                <div className="border border-border/70 bg-background/50 p-3">
                  <p className="font-mono text-foreground text-sm">waiting for human response</p>
                  <p className="mt-1 font-code text-muted-foreground text-xs">
                    the latest thread event is a human feedback request. inbound email reply handling is not implemented yet.
                  </p>
                </div>
              ) : null}
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
                      {event.metadata?.responseType ? (
                        <Badge variant="secondary">{String(event.metadata.responseType)}</Badge>
                      ) : null}
                      <span className="font-mono text-foreground text-sm">{event.authorAgentName}</span>
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
                    {event.metadata?.summary ? (
                      <div className="mt-3 border border-border/70 bg-background/50 px-3 py-2">
                        <p className="mono-label">summary</p>
                        <p className="mt-1 whitespace-pre-wrap font-code text-muted-foreground text-xs">
                          {String(event.metadata.summary)}
                        </p>
                      </div>
                    ) : null}
                    {event.attachments.length > 0 ? (
                      <div className="mt-3 space-y-3 border border-border/70 bg-background/50 px-3 py-3">
                        <p className="mono-label">attachments</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {event.attachments.map((attachment) => {
                            const href = getAttachmentHref(event.taskId, attachment);
                            const image = isImageAttachment(attachment);

                            return (
                              <a
                                key={attachment.id}
                                href={href}
                                target={attachment.kind === 'external_url' ? '_blank' : undefined}
                                rel={attachment.kind === 'external_url' ? 'noreferrer' : undefined}
                                className="block border border-border bg-card/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-mono text-foreground text-sm">{attachment.title}</p>
                                  <Badge variant="outline">{attachment.kind}</Badge>
                                </div>
                                <p className="mt-1 break-all font-code text-2xs text-muted-foreground">
                                  {attachment.path ?? attachment.url ?? 'attachment'}
                                </p>
                                {image ? (
                                  <img
                                    src={href}
                                    alt={attachment.title}
                                    className="mt-3 max-h-56 w-full rounded border border-border object-cover"
                                  />
                                ) : null}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="h-auto max-w-lg">
          <DialogHeader>
            <DialogTitle label="CONFIRM RUN" />
            <DialogDescription>
              {confirmAction === 'run'
                ? 'this will start task execution with the assigned actor.'
                : 'this will record the CEO response and immediately start a new execution.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex-none">
            <div className="space-y-3 border border-border/70 bg-background/50 p-4">
              <p className="mono-label">task</p>
              <p className="font-mono text-foreground text-sm">{task?.title ?? '—'}</p>
              <p className="mono-label">agent</p>
              <p className="font-mono text-foreground text-sm">
                {task?.assignedToAgentName ?? 'missing actor'}
              </p>
              <p className="mono-label">sandbox</p>
              <p className="font-mono text-foreground text-sm">workspace-write</p>
              <p className="mono-label">working_directory</p>
              <p className="break-all font-mono text-foreground text-sm">
                {project?.workingDirectory ?? '—'}
              </p>
              <p className="font-code text-warning text-xs">
                {'> execution may modify files or run commands in the workspace. review before continuing.'}
              </p>
              {confirmAction !== 'run' ? (
                <>
                  <p className="mono-label">ceo_response</p>
                  <p className="whitespace-pre-wrap font-code text-muted-foreground text-xs">
                    {confirmBody}
                  </p>
                  {attachmentDrafts.length > 0 ? (
                    <>
                      <p className="mono-label">attachments</p>
                      <div className="space-y-1">
                        {attachmentDrafts.map((attachment, index) => (
                          <p key={`${attachment.title}-${index}`} className="font-code text-muted-foreground text-xs">
                            {`${attachment.kind}: ${attachment.title} -> ${attachment.value}`}
                          </p>
                        ))}
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmAction(null)} disabled={acting}>
              cancel
            </Button>
            <Button
              variant={confirmAction === 'deny' ? 'destructive' : 'default'}
              disabled={acting || !ceo || (confirmAction !== 'run' && !confirmBody)}
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
