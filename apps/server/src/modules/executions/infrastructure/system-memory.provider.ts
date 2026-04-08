import type { AgentMemorySummary } from '../../agents/domain/agent.js';
import type { MemoryProvider, MemoryBuildInput } from '../application/contracts.js';
import type { MemoryBlock } from '../domain/execution.js';

interface AgentMemoryReader {
  listForMemory(): Promise<AgentMemorySummary[]>;
}

function serializeAvailableAgents(agents: AgentMemorySummary[]): string {
  return JSON.stringify(
    agents.map((agent) => ({
      id: agent.id,
      isCeo: agent.isCeo,
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

    for (const memoryKey of memoryKeys) {
      if (memoryKey === 'available_agents') {
        const agents = await this.agents.listForMemory();
        blocks.push({
          content: serializeAvailableAgents(agents),
          key: memoryKey,
          kind: 'memory',
          source: 'dynamic',
          title: 'Memory: Available Agents',
        });
      }
    }

    return blocks;
  }
}
