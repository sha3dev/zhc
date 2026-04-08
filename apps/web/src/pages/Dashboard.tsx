import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { ModelRowSkeleton, StatCardSkeleton, TableRowSkeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAgentStatusLabel } from '@/lib/agents';
import { fetchJson } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AgentStats, AgentSummary } from '@/types/agent';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function GlowStat({
  value,
  color = 'primary',
}: {
  value: string | number;
  color?: 'primary' | 'success' | 'warning' | 'info';
}) {
  const styles = {
    primary: { color: 'hsl(var(--primary))', shadow: '0 0 10px rgba(55,247,18,0.45)' },
    success: { color: 'hsl(var(--success))', shadow: '0 0 10px rgba(0,166,61,0.45)' },
    warning: { color: 'hsl(var(--warning))', shadow: '0 0 10px rgba(254,153,0,0.45)' },
    info: { color: 'hsl(var(--info))', shadow: '0 0 10px rgba(0,166,244,0.45)' },
  } as const;
  return (
    <p
      className="font-mono text-4xl font-bold tabular-nums transition-all duration-500"
      style={{ color: styles[color].color, textShadow: styles[color].shadow }}
    >
      {value}
    </p>
  );
}

function SegmentBar({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex gap-px mt-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 transition-all duration-500"
          style={
            i < filled
              ? { background: 'hsl(var(--primary))', boxShadow: '0 0 3px rgba(55,247,18,0.3)' }
              : { background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }
          }
        />
      ))}
    </div>
  );
}

function ModelBar({ model, count, max }: { model: string; count: number; max: number }) {
  const filled = max > 0 ? Math.round((count / max) * 20) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-code text-xs text-muted-foreground truncate">{`$ ${model}`}</span>
        <span
          className="font-mono text-xs tabular-nums shrink-0"
          style={{ color: 'hsl(var(--primary))', textShadow: 'var(--glow-primary-sm)' }}
        >
          {count}
        </span>
      </div>
      <SegmentBar filled={filled} total={20} />
    </div>
  );
}

function statusVariant(s: string): 'success' | 'warning' | 'secondary' {
  if (s === 'ready') return 'success';
  if (s === 'not_ready') return 'warning';
  return 'secondary';
}

const STAT_CONFIGS = [
  { key: 'total', label: 'total.agents', color: 'primary' as const },
  { key: 'ready', label: 'ready.agents', color: 'success' as const },
  { key: 'not_ready', label: 'not_ready.agents', color: 'warning' as const },
  { key: 'depth', label: 'hierarchy.depth', color: 'info' as const },
];

export default function Dashboard() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [recentAgents, setRecent] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [s, a] = await Promise.all([
        fetchJson<AgentStats>('/agents/stats'),
        fetchJson<{ items: AgentSummary[] }>('/agents?limit=8'),
      ]);
      setStats(s);
      setRecent(a.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statValues = stats
    ? [
        stats.totalAgents,
        stats.agentsByStatus?.ready ?? 0,
        (stats.agentsByStatus?.not_ready ?? 0) + (stats.agentsByStatus?.suspended ?? 0),
        stats.maxDepth,
      ]
    : [0, 0, 0, 0];

  const modelEntries = stats
    ? Object.entries(stats.agentsByModel)
        .filter(([, n]) => n > 0)
        .sort(([, a], [, b]) => b - a)
    : [];
  const maxModel = modelEntries.length ? Math.max(...modelEntries.map(([, n]) => n)) : 1;

  return (
    <div
      className="relative min-h-screen p-4 sm:p-6 space-y-6 sm:space-y-8"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(55,247,18,0.018) 28px, rgba(55,247,18,0.018) 29px)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <SectionHeader label="DASHBOARD" />
          <h1 className="font-mono text-xl sm:text-2xl font-bold text-foreground">
            dashboard
            <span
              className="text-primary animate-cursor-blink ml-1"
              style={{ textShadow: 'var(--glow-primary)' }}
            >
              |
            </span>
          </h1>
          <p className="font-code text-xs text-muted-foreground hidden sm:block">
            agent_orchestrator :: control surface
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing || loading}
          className="shrink-0 mt-1"
        >
          <RefreshCw
            className={`h-3 w-3 mr-1.5 transition-transform duration-500 ${refreshing ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">refresh</span>
        </Button>
      </div>

      {error && (
        <div className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive font-mono animate-toast">
          {`> error: ${error}`}
        </div>
      )}

      {/* Stats — 1 col mobile, 2 col sm, 4 col lg */}
      <div className="space-y-3">
        <SectionHeader label="SYSTEM METRICS" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {loading
            ? STAT_CONFIGS.map((s) => <StatCardSkeleton key={s.key} />)
            : STAT_CONFIGS.map((s, i) => (
                <div
                  key={s.key}
                  className="border border-border bg-card p-4 space-y-2 animate-page-enter"
                  style={{
                    animationDelay: `${i * 50}ms`,
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
                  }}
                >
                  <p className="mono-label">{s.label}</p>
                  <GlowStat value={statValues[i]} color={s.color} />
                </div>
              ))}
        </div>
      </div>

      {/* Model distribution + topology — 1 col mobile, 3 col lg */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 border border-border bg-card p-4 sm:p-5 space-y-4">
          <SectionHeader label="MODEL DISTRIBUTION" />
          {loading ? (
            <div className="space-y-3.5 pt-1">
              {['w-full', 'w-4/5', 'w-full', 'w-3/4'].map((w, i) => (
                <ModelRowSkeleton key={i} width={w} />
              ))}
            </div>
          ) : modelEntries.length === 0 ? (
            <p className="font-code text-xs text-muted-foreground pt-1">{'> no data'}</p>
          ) : (
            <div className="space-y-3.5 pt-1">
              {modelEntries.map(([model, count], i) => (
                <div
                  key={model}
                  className="animate-page-enter"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <ModelBar model={model} count={count} max={maxModel} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-border bg-card p-4 sm:p-5 space-y-4">
          <SectionHeader label="TOPOLOGY" />
          {loading ? (
            <div className="space-y-5 pt-1">
              <div className="space-y-2">
                <div className="animate-skeleton h-2.5 w-24" />
                <div className="animate-skeleton h-8 w-10" />
                <div className="animate-skeleton h-1.5 w-full" />
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="animate-skeleton h-2.5 w-24" />
                <div className="animate-skeleton h-8 w-10" />
                <div className="animate-skeleton h-1.5 w-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-5 pt-1">
              <div>
                <p className="mono-label">top_level.agents</p>
                <p
                  className="font-mono text-3xl font-bold mt-1 tabular-nums"
                  style={{ color: 'hsl(var(--primary))', textShadow: 'var(--glow-primary)' }}
                >
                  {stats?.topLevelAgents ?? 0}
                </p>
                <SegmentBar
                  filled={stats?.topLevelAgents ?? 0}
                  total={Math.max(10, stats?.topLevelAgents ?? 10)}
                />
              </div>
              <div className="border-t border-border pt-4">
                <p className="mono-label">max_depth.levels</p>
                <p
                  className="font-mono text-3xl font-bold mt-1 tabular-nums"
                  style={{ color: 'hsl(var(--info))', textShadow: '0 0 8px rgba(0,166,244,0.4)' }}
                >
                  {stats?.maxDepth ?? 0}
                </p>
                <SegmentBar
                  filled={stats?.maxDepth ?? 0}
                  total={Math.max(8, stats?.maxDepth ?? 8)}
                />
              </div>
              <button
                type="button"
                onClick={() => navigate('/agents')}
                className="w-full border border-primary/40 text-primary font-mono text-xs py-1.5 tracking-widest transition-all duration-200 hover:bg-primary/5 hover:border-primary active:scale-[0.97]"
                style={{ boxShadow: '0 0 4px rgba(55,247,18,0.15)' }}
              >
                [ VIEW REGISTRY ]
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent agents */}
      <div className="space-y-3">
        <SectionHeader label="AGENT REGISTRY — RECENT" />
        <div className="border border-border bg-card">
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent cursor-default">
                    <TableHead>name</TableHead>
                    <TableHead className="hidden sm:table-cell">model</TableHead>
                    <TableHead>status</TableHead>
                    <TableHead className="hidden md:table-cell">created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={4} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : recentAgents.length === 0 ? (
            <div className="px-4 sm:px-5 py-8 space-y-2 animate-page-enter">
              <p className="font-code text-xs text-muted-foreground">{'> no agents registered.'}</p>
              <button
                type="button"
                onClick={() => navigate('/agents')}
                className="font-mono text-xs text-primary hover:underline transition-colors duration-200 active:opacity-70"
                style={{ textShadow: 'var(--glow-primary-sm)' }}
              >
                {'$ create first agent_'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent cursor-default">
                    <TableHead>name</TableHead>
                    <TableHead className="hidden sm:table-cell">model</TableHead>
                    <TableHead>status</TableHead>
                    <TableHead className="hidden md:table-cell">created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAgents.map((agent, i) => (
                    <TableRow
                      key={agent.id}
                      onClick={() => navigate(`/agents/${agent.id}`)}
                      className="animate-row-enter"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-foreground">{`[::] ${agent.name}`}</span>
                      </TableCell>
                      <TableCell className="font-code text-xs text-muted-foreground hidden sm:table-cell">
                        {agent.model ?? <span className="opacity-40">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(agent.status)}>
                          {getAgentStatusLabel(agent.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-code text-xs text-muted-foreground tabular-nums hidden md:table-cell">
                        {formatDate(agent.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {recentAgents.length > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <button
                type="button"
                onClick={() => navigate('/agents')}
                className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors duration-200 tracking-widest active:opacity-70"
              >
                {'> view all agents →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
