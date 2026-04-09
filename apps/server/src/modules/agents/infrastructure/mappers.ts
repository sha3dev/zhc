import type { Agent, AgentRecord, AgentSummary } from '../domain/agent.js';

export function toAgent(record: AgentRecord): Agent {
  return {
    createdAt: record.agn_created_at,
    id: record.agn_id,
    isCeo: record.agn_is_ceo,
    kind: record.agn_kind,
    key: record.agn_key,
    modelCliId: record.agn_model_cli,
    model: record.agn_model,
    name: record.agn_name,
    subagentMd: record.agn_subagent_md,
    status: record.agn_status,
    updatedAt: record.agn_updated_at,
  };
}

export function toAgentSummary(agent: Agent): AgentSummary {
  return {
    id: agent.id,
    isCeo: agent.isCeo,
    kind: agent.kind,
    key: agent.key,
    modelCliId: agent.modelCliId,
    model: agent.model,
    name: agent.name,
    status: agent.status,
  };
}

export function extractRoleFromDefinition(subagentMd: string): string | null {
  const roleMatch = subagentMd.match(/#+\s*Role\s*\n+(.+)/i);
  return roleMatch?.[1]?.trim() ?? null;
}
