/**
 * Agent Orchestrator
 *
 * A hierarchical multi-agent system where AI agents with distinct personalities
 * collaborate to accomplish complex tasks.
 */

// Load environment variables first
import './config/config.js';

import type { Agent } from './types/agent.js';
export type { AgentModel, Project, Task } from './types/index.js';

/**
 * Main orchestrator class for managing the agent hierarchy
 */
export class AgentOrchestrator {
  private agents: Map<number, Agent> = new Map();

  /**
   * Register a new agent in the system
   */
  registerAgent(agent: Agent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with ID ${agent.id} already exists`);
    }
    this.agents.set(agent.id, agent);
  }

  /**
   * Get an agent by ID
   */
  getAgent(id: number): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents that report to a specific agent
   */
  getDirectReports(agentId: number): Agent[] {
    const agent = this.getAgent(agentId);
    if (!agent) return [];
    return agent.manages.map((child) => this.getAgent(child.id)).filter(Boolean) as Agent[];
  }
}
