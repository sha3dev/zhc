import { describe, expect, it } from 'vitest';
import {
  composePromptBlocks,
  serializePromptBlocks,
} from '../../../src/modules/executions/application/prompt-composer.js';

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
        {
          content: '[{"id":9,"key":"crossfit-expert"}]',
          key: 'available_experts',
          kind: 'memory',
          source: 'dynamic',
          title: 'Memory: Available Experts',
        },
      ],
      operationKey: 'create-project',
      subagentMd: '# Role\nCEO',
      userInput: 'build app',
    });

    expect(blocks.map((block) => block.kind)).toEqual([
      'identity',
      'command',
      'memory',
      'memory',
      'context',
      'input',
    ]);

    const prompt = serializePromptBlocks(blocks);
    expect(prompt.indexOf('# Agent Identity')).toBeLessThan(prompt.indexOf('# Command'));
    expect(prompt.indexOf('# Command')).toBeLessThan(prompt.indexOf('# Memory: Available Agents'));
    expect(prompt.indexOf('# Memory: Available Agents')).toBeLessThan(
      prompt.indexOf('# Memory: Available Experts'),
    );
    expect(prompt.indexOf('# Memory: Available Experts')).toBeLessThan(
      prompt.indexOf('# Execution Context'),
    );
    expect(prompt.indexOf('# Execution Context')).toBeLessThan(prompt.indexOf('# User Input'));
  });

  it('omits empty memory blocks and null context from the final prompt', () => {
    const blocks = composePromptBlocks({
      command: 'Do the operation',
      context: null,
      memoryBlocks: [
        {
          content: '[]',
          key: 'available_experts',
          kind: 'memory',
          source: 'dynamic',
          title: 'Memory: Available Experts',
        },
      ],
      operationKey: 'create-expert-draft',
      subagentMd: '# Role\nCEO',
      userInput: 'build app',
    });

    expect(blocks.map((block) => block.kind)).toEqual(['identity', 'command', 'input']);

    const prompt = serializePromptBlocks(blocks);
    expect(prompt).not.toContain('# Execution Context');
    expect(prompt).not.toContain('# Memory: Available Experts');
    expect(prompt).not.toContain('\nnull');
    expect(prompt).not.toContain('\n[]');
  });
});
