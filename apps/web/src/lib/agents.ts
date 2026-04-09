import type { AgentStatus } from '@/types/agent';
import type { Model } from '@/types/model';

export const AGENT_STATUS_OPTIONS: AgentStatus[] = ['not_ready', 'ready', 'suspended'];

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  not_ready: 'not ready',
  ready: 'ready',
  suspended: 'suspended',
};

export function getAgentStatusLabel(status: AgentStatus): string {
  return AGENT_STATUS_LABELS[status];
}

export function getAgentStatusVariant(status: AgentStatus): 'success' | 'warning' | 'secondary' {
  if (status === 'ready') return 'success';
  if (status === 'not_ready') return 'warning';
  return 'secondary';
}

export function deriveAgentStatus(
  modelCliId: string,
  model: string,
  currentStatus: AgentStatus,
  availableModelKeys: Set<string>,
): AgentStatus {
  if (!model || !modelCliId) return 'not_ready';
  if (currentStatus === 'suspended') return 'suspended';
  return availableModelKeys.has(`${modelCliId}:${model}`) ? 'ready' : 'not_ready';
}

export function deriveAgentStatusFromSuspension(
  modelCliId: string,
  model: string,
  isSuspended: boolean,
  availableModelKeys: Set<string>,
): AgentStatus {
  if (isSuspended) return 'suspended';
  if (!model || !modelCliId) return 'not_ready';
  return availableModelKeys.has(`${modelCliId}:${model}`) ? 'ready' : 'not_ready';
}

export interface ModelGroup {
  cliId: string;
  label: string;
  models: Array<{
    name: string;
    label: string;
    value: string;
  }>;
}

export function groupAvailableModels(
  models: Model[],
  cliLabels: Record<string, string>,
  currentModelCliId?: string | null,
  currentModel?: string | null,
): ModelGroup[] {
  const grouped = models.reduce<Record<string, Model[]>>((acc, model) => {
    if (!acc[model.cliId]) acc[model.cliId] = [];
    acc[model.cliId].push(model);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([cliId, group]) => ({
    cliId,
    label: cliLabels[cliId] ?? cliId,
    models: group.map((model) => ({
      name: model.name,
      label: model.displayName ?? model.name,
      value: model.value,
    })),
  }));

  if (
    currentModel &&
    currentModelCliId &&
    !models.some((model) => model.cliId === currentModelCliId && model.name === currentModel)
  ) {
    sections.unshift({
      cliId: 'current',
      label: 'Current Assignment',
      models: [
        {
          name: currentModel,
          label: `${cliLabels[currentModelCliId] ?? currentModelCliId} · ${currentModel} (unavailable)`,
          value: `${currentModelCliId}:${currentModel}`,
        },
      ],
    });
  }

  return sections;
}
