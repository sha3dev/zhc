import { z } from 'zod';

// Model names come from the `model` table / available models list.
// NULL means the user has not yet assigned a model to this agent.
// Use GET /api/models to obtain the current list of available models.
export const agentModelCliIdSchema = z.string().trim().min(1).max(100);
export type AgentModelCliId = string;
export const agentModelSchema = z.string().min(1).max(100);
export type AgentModel = string;

// ready:     model is assigned and currently available
// not_ready: no model assigned, or the assigned model is no longer available
// suspended: user has temporarily paused this agent
export const agentStatuses = ['ready', 'not_ready', 'suspended'] as const;
export const agentStatusSchema = z.enum(agentStatuses);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const agentKinds = ['ceo', 'specialist'] as const;
export const agentKindSchema = z.enum(agentKinds);
export type AgentKind = z.infer<typeof agentKindSchema>;

export interface Agent {
  createdAt: Date;
  id: number;
  isCeo: boolean;
  kind: AgentKind;
  key: string;
  modelCliId: AgentModelCliId | null;
  model: AgentModel | null;
  name: string;
  subagentMd: string;
  status: AgentStatus;
  updatedAt: Date;
}

export interface AgentDetails extends Agent {
  manages: AgentSummary[];
}

export interface AgentSummary {
  id: number;
  isCeo: boolean;
  kind: AgentKind;
  key: string;
  modelCliId: AgentModelCliId | null;
  model: AgentModel | null;
  name: string;
  status: AgentStatus;
}

export interface AgentMemorySummary {
  id: number;
  isCeo: boolean;
  kind: AgentKind;
  key: string;
  modelCliId: AgentModelCliId | null;
  model: AgentModel | null;
  name: string;
  role: string | null;
  status: AgentStatus;
}

export interface AgentHierarchyNode {
  children: AgentHierarchyNode[];
  id: number;
  kind: AgentKind;
  name: string;
  role: string | null;
  status: AgentStatus;
}

export interface AgentStats {
  agentsByKind: Record<AgentKind, number>;
  agentsByModel: Record<AgentModel, number>;
  agentsByStatus: Record<AgentStatus, number>;
  maxDepth: number;
  topLevelAgents: number;
  totalAgents: number;
}

export interface AgentRecord {
  agn_created_at: Date;
  agn_id: number;
  agn_is_ceo: boolean;
  agn_kind: AgentKind;
  agn_key: string;
  agn_model_cli: AgentModelCliId | null;
  agn_model: AgentModel | null;
  agn_name: string;
  agn_subagent_md: string;
  agn_status: AgentStatus;
  agn_updated_at: Date;
}
