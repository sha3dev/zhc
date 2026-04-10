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
import { formatDate } from '@/lib/utils';
import type { ListProjectsResponse, ProjectStatus, ProjectSummary } from '@/types/project';
import { FolderPlus, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [brief, setBrief] = useState('');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [search]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJson<ListProjectsResponse>(`/projects?${buildQuery()}`);
      setProjects(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void loadProjects(), 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search, loadProjects]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!brief.trim()) {
      setFormError('Project brief is required.');
      return;
    }

    setCreating(true);
    setFormError('');
    try {
      const created = await fetchJson<{ id: number }>('/projects', {
        body: JSON.stringify({ brief }),
        method: 'POST',
      });
      setShowCreate(false);
      setBrief('');
      setNotice('> project created and planned.');
      setTimeout(() => setNotice(''), 3000);
      await loadProjects();
      navigate(`/projects/${created.id}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Unable to create project.');
    } finally {
      setCreating(false);
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
          <SectionHeader label="PROJECTS" />
          <h1 className="font-bold font-mono text-foreground text-xl sm:text-2xl">
            projects
            <span
              className="ml-1 animate-cursor-blink text-primary"
              style={{ textShadow: 'var(--glow-primary)' }}
            >
              |
            </span>
          </h1>
          <p className="hidden font-code text-muted-foreground text-xs sm:block">
            {'$ list --projects --planning-artifacts'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setBrief('');
            setFormError('');
            setShowCreate(true);
          }}
          className="mt-1 flex shrink-0 items-center gap-1.5 border border-primary px-3 py-1.5 font-mono text-primary text-xs tracking-widest transition-all duration-150 hover:bg-primary/10 active:scale-[0.96] sm:px-4"
          style={{ boxShadow: '0 0 6px rgba(55,247,18,0.2)' }}
        >
          <FolderPlus className="h-3 w-3" />
          <span className="hidden sm:inline">[ ADD PROJECT ]</span>
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

      <div className="flex flex-col gap-1">
        <Label htmlFor="search-projects">search.query</Label>
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-2 h-3 w-3 text-muted-foreground" />
          <Input
            id="search-projects"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="name, source brief or CEO definition"
            className="pl-6"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="cursor-default hover:bg-transparent">
              <TableHead>project</TableHead>
              <TableHead>status</TableHead>
              <TableHead>tasks</TableHead>
              <TableHead>owner</TableHead>
              <TableHead>updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => <TableRowSkeleton key={index} cols={5} />)
            ) : projects.length === 0 ? (
              <TableRow className="cursor-default hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="py-10 text-center font-code text-muted-foreground text-xs"
                >
                  {'> no projects match the current filters.'}
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project, index) => (
                <TableRow
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="animate-row-enter"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell className="space-y-1">
                    <div className="font-bold font-mono text-foreground text-xs">
                      {project.name}
                    </div>
                    <div className="font-code text-2xs text-muted-foreground">
                      {project.slug} :: {project.sourceBrief.slice(0, 96)}
                      {project.sourceBrief.length > 96 ? '…' : ''}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getProjectStatusVariant(project.status)}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-code text-muted-foreground text-xs">
                    {project.completedTaskCount}/{project.taskCount}
                  </TableCell>
                  <TableCell className="font-code text-muted-foreground text-xs">
                    {project.ownerAgentName ?? 'n/a'}
                  </TableCell>
                  <TableCell className="font-code text-muted-foreground text-xs">
                    {formatDate(project.updatedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            setFormError('');
          }
        }}
      >
        <DialogContent className="h-auto max-w-xl">
          <DialogHeader>
            <DialogTitle label="ADD PROJECT" />
            <DialogDescription>
              Write a short project brief. The CEO will expand it into a buildable definition and
              assign the initial task graph automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <DialogBody className="flex-none gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-brief">project brief</Label>
                <Textarea
                  id="project-brief"
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder="Example: Web app called Daily CrossFit that gives users a new CrossFit workout each day of the year."
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
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? '[ planning... ]' : '[ CREATE PROJECT ]'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
