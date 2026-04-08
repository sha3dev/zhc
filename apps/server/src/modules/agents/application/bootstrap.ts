import { logger } from '../../../shared/observability/logger.js';
import type { Agent } from '../domain/agent.js';
import { getDefaultAgentsWithSouls } from '../domain/default-agents.js';
import type { AgentsRepository, CreateAgentInput } from './contracts.js';

export async function bootstrapDefaultAgents(repository: AgentsRepository): Promise<Agent[]> {
  const count = await repository.count();

  if (count > 0) {
    logger.info('Agents table is not empty, skipping bootstrap', { count });
    return [];
  }

  logger.info('Agents table is empty, seeding default agents from harness/subagents');

  const definitions = getDefaultAgentsWithSouls();
  const created: Agent[] = [];

  // Create CEO first (no parent)
  const ceoDefinition = definitions.find((d) => d.name === 'CEO');

  if (!ceoDefinition) {
    logger.error('CEO definition not found in harness/subagents');
    return [];
  }

  const ceoInput: CreateAgentInput = {
    isCeo: true,
    key: ceoDefinition.key,
    modelCliId: null,
    model: null,
    name: ceoDefinition.name,
    soul: ceoDefinition.soul,
    status: 'not_ready',
  };

  const ceo = await repository.create(ceoInput);
  created.push(ceo);
  logger.info('Created default agent', { id: ceo.id, name: ceo.name, status: ceo.status });

  // Create all other agents reporting to CEO
  const otherDefinitions = definitions.filter((d) => d.name !== 'CEO');

  for (const definition of otherDefinitions) {
    const input: CreateAgentInput = {
      isCeo: definition.isCeo,
      key: definition.key,
      modelCliId: null,
      model: null,
      name: definition.name,
      soul: definition.soul,
      status: 'not_ready',
    };

    const agent = await repository.create(input);
    created.push(agent);
    logger.info('Created default agent', {
        id: agent.id,
        name: agent.name,
        status: agent.status,
      });
  }

  logger.info('Default agents bootstrap complete', { total: created.length });

  return created;
}
