import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'dashboard', index: '01' },
  { to: '/agents', label: 'agents', index: '02' },
  { to: '/experts', label: 'experts', index: '03' },
  { to: '/executions', label: 'executions', index: '04' },
  { to: '/mails', label: 'mails', index: '05' },
  { to: '/settings', label: 'settings', index: '06' },
];

export default function Sidebar() {
  const [time, setTime] = useState('');
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

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === '/agents' && location.pathname.startsWith('/agents/')) ||
    (path === '/experts' && location.pathname.startsWith('/experts/')) ||
    (path === '/executions' && location.pathname.startsWith('/executions/'));

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col justify-between overflow-hidden shrink-0',
        'w-[220px] border-r border-border bg-card',
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
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-1">
            <span
              className="font-mono text-xs text-primary font-bold"
              style={{ textShadow: 'var(--glow-primary)' }}
            >
              agent_orchestrator
            </span>
            <span className="font-mono text-xs text-primary animate-cursor-blink">_</span>
          </div>
          <p className="mt-0.5 font-code text-2xs uppercase tracking-widest text-muted-foreground">
            control surface v1.0
          </p>
        </div>

        {/* Nav */}
        <nav aria-label="Primary" className="py-3 px-3 space-y-0.5">
          <p className="mono-label px-1 mb-2">nav.routes</p>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5',
                'font-mono text-xs transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                isActive(item.to)
                  ? 'text-primary border border-primary/30 bg-primary/5'
                  : 'text-muted-foreground border border-transparent hover:text-foreground hover:border-border',
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
      </div>

      {/* Footer */}
      <div className="relative z-10 px-4 py-3 border-t border-border space-y-2">
        <div>
          <p className="mono-label">runtime.clock</p>
          <p className="font-mono text-xs text-foreground mt-0.5 tabular-nums">{time}</p>
        </div>
        <div>
          <p className="mono-label">system.status</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="inline-block w-1.5 h-1.5"
              style={{ background: 'hsl(var(--primary))', boxShadow: 'var(--glow-primary-sm)' }}
            />
            <span className="font-mono text-2xs text-primary">online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
