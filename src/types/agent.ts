/**
 * Agent types following database naming conventions
 *
 * This file defines all types related to the Agent entity, including:
 * - Database entity types (stored in PostgreSQL)
 * - Domain types (used in application logic)
 * - DTO types (for API requests/responses)
 */

/**
 * Supported AI models that can be used with opencode
 *
 * This list can be extended as new models become available
 */
export type AgentModel =
  | 'claude-opus-4-6'
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-4o'
  | 'o1-preview'
  | 'o1-mini'
  | 'deepseek-chat'
  | 'deepseek-coder';

/**
 * Agent status in the system
 */
export type AgentStatus = 'active' | 'inactive' | 'archived';

/**
 * Database entity: agent
 *
 * This represents the agent as stored in PostgreSQL.
 * Column names follow the database naming conventions (AGN_ prefix).
 */
export interface AgentEntity {
  /** Primary key: AGN_id */
  AGN_id: number;
  /** Agent name: AGN_name */
  AGN_name: string;
  /** Soul/personality as markdown text: AGN_soul */
  AGN_soul: string;
  /** AI model to use: AGN_model */
  AGN_model: AgentModel;
  /** Parent agent ID (who this agent reports to): reports_to_AGN_id */
  reports_to_AGN_id: number | null;
  /** Agent status: AGN_status */
  AGN_status: AgentStatus;
  /** Creation timestamp: AGN_created_at */
  AGN_created_at: Date;
  /** Last update timestamp: AGN_updated_at */
  AGN_updated_at: Date;
}

/**
 * Domain model: Agent
 *
 * This is the agent type used throughout the application.
 * It has resolved references (e.g., reportsTo is an Agent, not just an ID).
 */
export interface Agent {
  /** Unique identifier (matches agn_id) */
  id: number;
  /** Agent name */
  name: string;
  /** Soul/personality definition in markdown format */
  soul: string;
  /** AI model this agent uses */
  model: AgentModel;
  /** Parent agent (who this agent reports to), if any */
  reportsTo?: Agent;
  /** Child agents (agents that report to this one) */
  manages: Agent[];
  /** Current status */
  status: AgentStatus;
  /** When this agent was created */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * DTO: Create Agent Request
 *
 * Data transfer object for creating a new agent.
 */
export interface CreateAgentDTO {
  /** Agent name */
  name: string;
  /** Soul/personality definition in markdown format */
  soul: string;
  /** AI model to use */
  model: AgentModel;
  /** Parent agent ID (who this agent reports to), optional */
  reportsToId?: number;
  /** Initial status, defaults to 'active' */
  status?: AgentStatus;
}

/**
 * DTO: Update Agent Request
 *
 * Data transfer object for updating an existing agent.
 * All fields are optional.
 */
export interface UpdateAgentDTO {
  /** Agent name */
  name?: string;
  /** Soul/personality definition in markdown format */
  soul?: string;
  /** AI model to use */
  model?: AgentModel;
  /** Parent agent ID (who this agent reports to) */
  reportsToId?: number | null;
  /** Agent status */
  status?: AgentStatus;
}

/**
 * DTO: Agent Response
 *
 * Data transfer object for API responses.
 * Includes basic hierarchy information without full recursion.
 */
export interface AgentResponseDTO {
  /** Agent ID */
  id: number;
  /** Agent name */
  name: string;
  /** Soul/personality (may be truncated for list views) */
  soul: string;
  /** AI model */
  model: AgentModel;
  /** Parent agent ID, if any */
  reportsToId?: number;
  /** Parent agent name, if any */
  reportsToName?: string;
  /** Child agent IDs */
  managesIds: number[];
  /** Agent status */
  status: AgentStatus;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Agent hierarchy information
 *
 * Lightweight representation of agent hierarchy for tree views.
 */
export interface AgentHierarchyNode {
  /** Agent ID */
  id: number;
  /** Agent name */
  name: string;
  /** Agent role (derived from soul) */
  role?: string;
  /** Agent status */
  status: AgentStatus;
  /** Direct reports */
  children: AgentHierarchyNode[];
}

/**
 * Agent query parameters
 *
 * Filters for querying agents.
 */
export interface AgentQueryParams {
  /** Filter by status */
  status?: AgentStatus;
  /** Filter by model */
  model?: AgentModel;
  /** Filter by parent agent */
  reportsToId?: number | null;
  /** Search in name or soul */
  search?: string;
  /** Pagination offset */
  offset?: number;
  /** Pagination limit */
  limit?: number;
}

/**
 * Agent statistics
 *
 * Summary statistics about an agent.
 */
export interface AgentStats {
  /** Total number of agents */
  totalAgents: number;
  /** Number of agents by model */
  agentsByModel: Record<AgentModel, number>;
  /** Number of agents by status */
  agentsByStatus: Record<AgentStatus, number>;
  /** Number of top-level agents (no parent) */
  topLevelAgents: number;
  /** Maximum hierarchy depth */
  maxDepth: number;
}
