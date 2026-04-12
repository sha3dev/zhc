import type { RegistryEntityMemorySummary } from '../../agents/domain/expert.js';
import type { MemoryBuildInput, MemoryProvider } from '../application/contracts.js';
import type { MemoryBlock } from '../domain/execution.js';

interface AgentMemoryReader {
  listForMemory(): Promise<RegistryEntityMemorySummary[]>;
}

function serializeAvailableAgents(
  agents: RegistryEntityMemorySummary[],
  mode: 'compact' | 'full' = 'full',
): string {
  return JSON.stringify(
    agents.map((agent) => ({
      id: agent.id,
      isCeo: agent.isCeo,
      kind: agent.kind,
      key: agent.key,
      name: agent.name,
      ...(mode === 'full'
        ? {
            modelCliId: agent.modelCliId,
            model: agent.model,
            role: agent.role,
            status: agent.status,
          }
        : {
            role: agent.role,
          }),
    })),
    null,
    2,
  );
}

export class SystemMemoryProvider implements MemoryProvider {
  constructor(private readonly agents: AgentMemoryReader) {}

  async build(input: MemoryBuildInput, memoryKeys: string[]): Promise<MemoryBlock[]> {
    const blocks: MemoryBlock[] = [];
    const requestedAgentMemory =
      memoryKeys.includes('available_agents') || memoryKeys.includes('available_experts');
    const agents = requestedAgentMemory ? await this.agents.listForMemory() : [];
    const mode = input.operationKey === 'create-project' ? 'compact' : 'full';

    for (const memoryKey of memoryKeys) {
      if (memoryKey === 'available_agents') {
        blocks.push({
          content: serializeAvailableAgents(
            agents.filter((agent) => agent.kind !== 'expert'),
            mode,
          ),
          key: memoryKey,
          kind: 'memory',
          source: 'dynamic',
          title: 'Memory: Available Agents',
        });
      }

      if (memoryKey === 'available_experts') {
        blocks.push({
          content: serializeAvailableAgents(
            agents.filter((agent) => agent.kind === 'expert'),
            mode,
          ),
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
