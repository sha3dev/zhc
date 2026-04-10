import { createProjectOperationOutputSchema } from '../../projects/application/operations.js';
import type { ExecutionOperationDefinition } from './contracts.js';

export const EXECUTION_OPERATIONS: Record<string, ExecutionOperationDefinition> = {
  'create-project': {
    memoryKeys: ['available_agents', 'available_experts'],
    operationKey: 'create-project',
    outputSchema: createProjectOperationOutputSchema,
    staticFragments: [],
  },
  'create-expert-draft': {
    memoryKeys: ['available_experts'],
    operationKey: 'create-expert-draft',
    staticFragments: [],
  },
  'execute-task': {
    operationKey: 'execute-task',
    skillKeys: ['playwright-browser', 'dokku', 'postgres', 'http-client', 'email'],
    staticFragments: [],
  },
};
