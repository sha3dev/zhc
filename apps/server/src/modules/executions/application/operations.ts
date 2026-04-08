import { createProjectOperationOutputSchema } from '../../projects/application/operations.js';
import type { ExecutionOperationDefinition } from './contracts.js';

export const EXECUTION_OPERATIONS: Record<string, ExecutionOperationDefinition> = {
  'create-project': {
    memoryKeys: ['available_agents'],
    operationKey: 'create-project',
    outputSchema: createProjectOperationOutputSchema,
    staticFragments: [],
  },
};
