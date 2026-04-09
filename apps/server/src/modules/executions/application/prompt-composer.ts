import type { MemoryBlock, PromptBlock } from '../domain/execution.js';

function serializeValue(value: unknown): string {
  if (value === undefined) {
    return 'null';
  }

  return JSON.stringify(value, null, 2);
}

function isSerializedEmptyValue(content: string): boolean {
  const trimmed = content.trim();
  return trimmed === '' || trimmed === 'null' || trimmed === '[]' || trimmed === '{}';
}

function shouldIncludeBlock(block: PromptBlock): boolean {
  if (block.kind === 'context' || block.kind === 'memory') {
    return !isSerializedEmptyValue(block.content);
  }

  return block.content.trim().length > 0;
}

export function createIdentityBlock(subagentMd: string): PromptBlock {
  return {
    content: subagentMd.trim(),
    key: 'agent-identity',
    kind: 'identity',
    title: 'Agent Identity',
  };
}

export function createCommandBlock(operationKey: string, command: string): PromptBlock {
  return {
    content: [`Operation: ${operationKey}`, command.trim()].join('\n\n'),
    key: `command:${operationKey}`,
    kind: 'command',
    title: 'Command',
  };
}

export function createContextBlock(context: unknown): PromptBlock {
  return {
    content: serializeValue(context),
    key: 'execution-context',
    kind: 'context',
    title: 'Execution Context',
  };
}

export function createUserInputBlock(userInput: string): PromptBlock {
  return {
    content: userInput.trim(),
    key: 'user-input',
    kind: 'input',
    title: 'User Input',
  };
}

export function serializePromptBlocks(blocks: PromptBlock[]): string {
  return blocks.map((block) => `# ${block.title}\n${block.content}`).join('\n\n');
}

export function composePromptBlocks(params: {
  command: string;
  context: unknown;
  memoryBlocks: MemoryBlock[];
  operationKey: string;
  subagentMd: string;
  userInput: string;
}): PromptBlock[] {
  return [
    createIdentityBlock(params.subagentMd),
    createCommandBlock(params.operationKey, params.command),
    ...params.memoryBlocks,
    createContextBlock(params.context),
    createUserInputBlock(params.userInput),
  ].filter(shouldIncludeBlock);
}
