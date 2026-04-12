import { createProjectOperationOutputSchema } from '../../projects/application/operations.js';
import { taskAgentResponseSchema } from '../../tasks/application/contracts.js';
import type { ExecutionOperationDefinition } from './contracts.js';

export const EXECUTION_OPERATIONS: Record<string, ExecutionOperationDefinition> = {
  'create-project': {
    memoryKeys: ['available_agents', 'available_experts'],
    operationKey: 'create-project',
    outputSchema: createProjectOperationOutputSchema,
    staticFragments: [],
    timeoutMs: 600_000,
  },
  'create-expert-draft': {
    memoryKeys: ['available_experts'],
    operationKey: 'create-expert-draft',
    staticFragments: [],
  },
  'execute-task': {
    operationKey: 'execute-task',
    outputSchema: taskAgentResponseSchema,
    skillKeys: ['playwright-browser', 'steel-browser', 'dokku', 'postgres', 'http-client', 'email'],
    staticFragments: [],
    timeoutMs: 900_000,
  },
};
