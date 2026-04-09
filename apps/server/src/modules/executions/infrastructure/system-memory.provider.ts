import type { AgentMemorySummary } from '../../agents/domain/agent.js';
import type { MemoryBuildInput, MemoryProvider } from '../application/contracts.js';
import type { MemoryBlock } from '../domain/execution.js';

interface AgentMemoryReader {
  listForMemory(): Promise<AgentMemorySummary[]>;
}

function serializeAvailableAgents(agents: AgentMemorySummary[]): string {
  return JSON.stringify(
    agents.map((agent) => ({
      id: agent.id,
      isCeo: agent.isCeo,
      kind: agent.kind,
      key: agent.key,
      modelCliId: agent.modelCliId,
      model: agent.model,
      name: agent.name,
      role: agent.role,
      status: agent.status,
    })),
    null,
    2,
  );
}

export class SystemMemoryProvider implements MemoryProvider {
  constructor(private readonly agents: AgentMemoryReader) {}

  async build(_input: MemoryBuildInput, memoryKeys: string[]): Promise<MemoryBlock[]> {
    const blocks: MemoryBlock[] = [];
    const requestedAgentMemory =
      memoryKeys.includes('available_agents') || memoryKeys.includes('available_experts');
    const agents = requestedAgentMemory ? await this.agents.listForMemory() : [];

    for (const memoryKey of memoryKeys) {
      if (memoryKey === 'available_agents') {
        blocks.push({
          content: serializeAvailableAgents(agents.filter((agent) => agent.kind !== 'expert')),
          key: memoryKey,
          kind: 'memory',
          source: 'dynamic',
          title: 'Memory: Available Agents',
        });
      }

      if (memoryKey === 'available_experts') {
        blocks.push({
          content: serializeAvailableAgents(agents.filter((agent) => agent.kind === 'expert')),
          key: memoryKey,
          kind: 'memory',
          source: 'dynamic',
          title: 'Memory: Available Experts',
        });
      }
    }

    return blocks;
  }
}
