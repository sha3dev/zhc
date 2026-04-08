export type AgentStatus = 'ready' | 'not_ready' | 'suspended';

// Model name is a free string populated from GET /api/models.
// NULL means the user has not yet assigned a model to this agent.
export type AgentModel = string;

export interface AgentSummary {
  id: number;
  name: string;
  modelCliId: string | null;
  model: AgentModel | null;
  status: AgentStatus;
  isCeo: boolean;
  key: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDetails extends AgentSummary {
  soul: string;
  manages: { id: number; name: string }[];
}

export interface AgentStats {
  totalAgents: number;
  topLevelAgents: number;
  maxDepth: number;
  agentsByStatus: Record<AgentStatus, number>;
  agentsByModel: Record<string, number>;
}

export interface ListAgentsResponse {
  items: AgentSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateAgentInput {
  name: string;
  soul: string;
  modelCliId?: string | null;
  model?: AgentModel | null;
  status?: AgentStatus;
}

export interface UpdateAgentInput extends Partial<CreateAgentInput> {}
