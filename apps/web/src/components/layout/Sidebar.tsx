import { fetchJson } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ProjectTask } from '@/types/project';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'dashboard', index: '01' },
  { to: '/projects', label: 'projects', index: '02' },
  { to: '/agents', label: 'agents', index: '03' },
  { to: '/experts', label: 'experts', index: '04' },
  { to: '/executions', label: 'executions', index: '05' },
  { to: '/mails', label: 'mails', index: '06' },
  { to: '/files', label: 'files', index: '07' },
  { to: '/settings', label: 'settings', index: '08' },
];

interface ListTasksResponse {
  items: ProjectTask[];
  total: number;
}

export default function Sidebar() {
  const [time, setTime] = useState('');
  const [runningTasks, setRunningTasks] = useState<ProjectTask[]>([]);
  const [runningTotal, setRunningTotal] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          year: 'numeric',
          month: 'short',
          day: '2-digit',
        }),
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetchJson<ListTasksResponse>('/tasks?status=in_progress&limit=3');
        setRunningTasks(response.items);
        setRunningTotal(response.total);
      } catch {
        setRunningTasks([]);
        setRunningTotal(0);
      }
    };

    void load();
    const id = setInterval(() => {
      void load();
    }, 3000);

    return () => clearInterval(id);
  }, []);

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/projects' && location.pathname.startsWith('/projects/')) ||
    (path === '/agents' && location.pathname.startsWith('/agents/')) ||
    (path === '/experts' && location.pathname.startsWith('/experts/')) ||
    (path === '/executions' && location.pathname.startsWith('/executions/'));

  return (
    <aside
      className={cn(
        'relative flex h-screen shrink-0 flex-col justify-between overflow-hidden',
        'w-[220px] border-border border-r bg-card',
      )}
    >
      {/* Scan line overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.015]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(55,247,18,1) 2px, rgba(55,247,18,1) 3px)',
        }}
      />

      <div className="relative z-10">
        {/* Brand */}
        <div className="border-border border-b px-4 py-4">
          <div className="flex items-center gap-1">
            <span
              className="font-bold font-mono text-primary text-xs"
              style={{ textShadow: 'var(--glow-primary)' }}
            >
              agent_orchestrator
            </span>
            <span className="animate-cursor-blink font-mono text-primary text-xs">_</span>
          </div>
          <p className="mt-0.5 font-code text-2xs text-muted-foreground uppercase tracking-widest">
            control surface v1.0
          </p>
        </div>

        {/* Nav */}
        <nav aria-label="Primary" className="space-y-0.5 px-3 py-3">
          <p className="mono-label mb-2 px-1">nav.routes</p>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className={cn(
                'flex w-full items-center gap-2 px-2 py-1.5',
                'font-mono text-xs transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                isActive(item.to)
                  ? 'border border-primary/30 bg-primary/5 text-primary'
                  : 'border border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
              style={
                isActive(item.to) ? { boxShadow: 'inset 0 0 8px rgba(55,247,18,0.08)' } : undefined
              }
            >
              <span className="font-code text-2xs text-muted-foreground">{item.index}</span>
              <span
                className={cn(isActive(item.to) && 'text-primary')}
                style={isActive(item.to) ? { textShadow: 'var(--glow-primary-sm)' } : undefined}
              >
                {isActive(item.to) ? `> ${item.label}` : `  ${item.label}`}
              </span>
            </button>
          ))}
        </nav>

        <div className="mx-3 mt-2 border border-border bg-background/40 p-3">
          <p className="mono-label">runtime.work</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'inline-block h-2 w-2',
                runningTotal > 0 ? 'animate-pulse bg-info' : 'bg-muted-foreground/40',
              )}
              style={runningTotal > 0 ? { boxShadow: '0 0 8px rgba(0,166,244,0.55)' } : undefined}
            />
            <span
              className={cn(
                'font-mono text-2xs',
                runningTotal > 0 ? 'text-info' : 'text-muted-foreground',
              )}
            >
              {runningTotal > 0 ? `${runningTotal} active` : 'idle'}
            </span>
          </div>
          {runningTasks[0] ? (
            <button
              type="button"
              onClick={() => navigate(`/tasks/${runningTasks[0]!.id}`)}
              className="mt-2 block w-full truncate text-left font-code text-2xs text-muted-foreground transition-colors hover:text-info"
            >
              {`> #${runningTasks[0].id} ${runningTasks[0].title}`}
            </button>
          ) : (
            <p className="mt-2 font-code text-2xs text-muted-foreground">{'> no active task'}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 space-y-2 border-border border-t px-4 py-3">
        <div>
          <p className="mono-label">runtime.clock</p>
          <p className="mt-0.5 font-mono text-foreground text-xs tabular-nums">{time}</p>
        </div>
        <div>
          <p className="mono-label">system.status</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5"
              style={{ background: 'hsl(var(--primary))', boxShadow: 'var(--glow-primary-sm)' }}
            />
            <span className="font-mono text-2xs text-primary">online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
