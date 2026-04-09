import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchJson } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AgentSummary, ListAgentsResponse } from '@/types/agent';
import type { ExecutionSummary, ListExecutionsResponse } from '@/types/execution';
import type { ListModelsResponse } from '@/types/model';
import { ArrowRight, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(2)}s`;
}

export default function Executions() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [executions, setExecutions] = useState<ExecutionSummary[]>([]);
  const [models, setModels] = useState<Array<{ cliId: string; model: string }>>([]);
  const [agentId, setAgentId] = useState('all');
  const [operationKey, setOperationKey] = useState('all');
  const [cliId, setCliId] = useState('all');
  const [model, setModel] = useState('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const operationOptions = useMemo(
    () => Array.from(new Set(executions.map((execution) => execution.operationKey))).sort(),
    [executions],
  );
  const cliOptions = useMemo(
    () => Array.from(new Set(models.map((entry) => entry.cliId))).sort(),
    [models],
  );
  const modelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          models
            .filter((entry) => cliId === 'all' || entry.cliId === cliId)
            .map((entry) => entry.model),
        ),
      ).sort(),
    [cliId, models],
  );

  const load = async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (agentId !== 'all') params.set('agentId', agentId);
      if (operationKey !== 'all') params.set('operationKey', operationKey);
      if (cliId !== 'all') params.set('cliId', cliId);
      if (model !== 'all') params.set('model', model);
      if (search.trim()) params.set('search', search.trim());

      const [executionResponse, agentResponse, modelResponse] = await Promise.all([
        fetchJson<ListExecutionsResponse>(`/executions?${params.toString()}`),
        fetchJson<ListAgentsResponse>('/agents?limit=100'),
        fetchJson<ListModelsResponse>('/models'),
      ]);

      setExecutions(executionResponse.items);
      setAgents(agentResponse.items);
      setModels(modelResponse.items.map((item) => ({ cliId: item.cliId, model: item.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load executions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, [agentId, operationKey, cliId, model, search]);

  return (
    <div
      className="relative min-h-full space-y-6 p-4 sm:space-y-8 sm:p-6"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(55,247,18,0.018) 28px, rgba(55,247,18,0.018) 29px)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <SectionHeader label="EXECUTIONS" />
          <h1 className="font-mono text-xl font-bold text-foreground sm:text-3xl">
            executions
            <span
              className="ml-1 animate-cursor-blink text-primary"
              style={{ textShadow: 'var(--glow-primary)' }}
            >
              |
            </span>
          </h1>
          <p className="hidden font-code text-xs text-muted-foreground sm:block">
            agent_orchestrator :: execution log index
          </p>
        </div>

        <Button size="sm" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw className={`mr-1.5 h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'refreshing…' : 'refresh'}
        </Button>
      </div>

      {error && (
        <div className="border border-border bg-card px-4 py-3">
          <p className="font-code text-xs text-destructive">{`> error: ${error}`}</p>
        </div>
      )}

      <div className="border border-border bg-card p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-2">
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={String(agent.id)}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select value={operationKey} onValueChange={setOperationKey}>
              <SelectTrigger>
                <SelectValue placeholder="operation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all operations</SelectItem>
                {operationOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select
              value={cliId}
              onValueChange={(value) => {
                setCliId(value);
                if (
                  value !== 'all' &&
                  model !== 'all' &&
                  !models.some((entry) => entry.cliId === value && entry.model === model)
                ) {
                  setModel('all');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="cli" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all cli</SelectItem>
                {cliOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all models</SelectItem>
                {modelOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="search prompt / response"
              className="pl-8 font-mono text-xs"
              onKeyDown={(event) => {
                if (event.key === 'Enter') setSearch(searchDraft);
              }}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setSearch(searchDraft)}>
            apply_filters
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="border border-border bg-card p-5">
              <div className="h-4 w-40 animate-skeleton bg-muted" />
              <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)_140px]">
                <div className="h-24 animate-skeleton bg-muted" />
                <div className="h-24 animate-skeleton bg-muted" />
                <div className="h-24 animate-skeleton bg-muted" />
                <div className="h-24 animate-skeleton bg-muted" />
              </div>
            </div>
          ))
        ) : executions.length === 0 ? (
          <div className="border border-border bg-card px-6 py-16 text-center">
            <p className="font-code text-xs text-muted-foreground">{'> no executions found'}</p>
          </div>
        ) : (
          executions.map((execution, index) => (
            <button
              key={execution.id}
              type="button"
              onClick={() => navigate(`/executions/${execution.id}`)}
              className="block w-full border border-border bg-card p-5 text-left transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{execution.operationKey}</Badge>
                    <Badge variant="secondary">{execution.cliId}</Badge>
                    <Badge variant="outline">{execution.model}</Badge>
                  </div>
                  <div>
                    <h2 className="font-mono text-sm font-bold text-foreground sm:text-base">
                      {execution.agentName}
                    </h2>
                    <p className="mt-1 font-code text-2xs text-muted-foreground">
                      {formatDate(execution.executedAt)} · {formatDuration(execution.durationMs)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 font-code text-2xs uppercase tracking-widest text-primary">
                  open detail
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-2">
                  <p className="mono-label">prompt preview</p>
                  <div className="min-h-[120px] border border-border bg-background/70 px-4 py-3">
                    <p className="font-code text-xs leading-6 text-muted-foreground">
                      {execution.promptPreview || '—'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="mono-label">response preview</p>
                  <div className="min-h-[120px] border border-border bg-background/70 px-4 py-3">
                    <p className="font-code text-xs leading-6 text-muted-foreground">
                      {execution.responsePreview || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
