import type { Agent, AgentRecord, AgentSummary } from '../domain/agent.js';

export function toAgent(record: AgentRecord): Agent {
  return {
    createdAt: record.agn_created_at,
    id: record.agn_id,
    isCeo: record.agn_is_ceo,
    key: record.agn_key,
    modelCliId: record.agn_model_cli,
    model: record.agn_model,
    name: record.agn_name,
    soul: record.agn_soul,
    status: record.agn_status,
    updatedAt: record.agn_updated_at,
  };
}

export function toAgentSummary(agent: Agent): AgentSummary {
  return {
    id: agent.id,
    isCeo: agent.isCeo,
    key: agent.key,
    modelCliId: agent.modelCliId,
    model: agent.model,
    name: agent.name,
    status: agent.status,
  };
}

export function extractRoleFromSoul(soul: string): string | null {
  const roleMatch = soul.match(/#+\s*Role\s*\n+(.+)/i);
  return roleMatch?.[1]?.trim() ?? null;
}
