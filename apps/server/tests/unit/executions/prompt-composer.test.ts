import { describe, expect, it } from 'vitest';
import { composePromptBlocks, serializePromptBlocks } from '../../../src/modules/executions/application/prompt-composer.js';

describe('prompt composer', () => {
  it('preserves deterministic block order', () => {
    const blocks = composePromptBlocks({
      command: 'Do the operation',
      context: { requestId: 'abc' },
      memoryBlocks: [
        {
          content: '[{"id":1}]',
          key: 'available_agents',
          kind: 'memory',
          source: 'dynamic',
          title: 'Memory: Available Agents',
        },
      ],
      operationKey: 'create-project',
      soul: '# Role\nCEO',
      userInput: 'build app',
    });

    expect(blocks.map((block) => block.kind)).toEqual([
      'identity',
      'command',
      'memory',
      'context',
      'input',
    ]);

    const prompt = serializePromptBlocks(blocks);
    expect(prompt.indexOf('# Agent Identity')).toBeLessThan(prompt.indexOf('# Command'));
    expect(prompt.indexOf('# Command')).toBeLessThan(prompt.indexOf('# Memory: Available Agents'));
    expect(prompt.indexOf('# Memory: Available Agents')).toBeLessThan(prompt.indexOf('# Execution Context'));
    expect(prompt.indexOf('# Execution Context')).toBeLessThan(prompt.indexOf('# User Input'));
  });
});
