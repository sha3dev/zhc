import { describe, expect, it } from 'vitest';
import { FileSystemPromptRegistry } from '../../../src/modules/executions/infrastructure/file-system-prompt-registry.js';

describe('FileSystemPromptRegistry', () => {
  it('loads the create-project system prompt from disk', async () => {
    const registry = new FileSystemPromptRegistry();

    const prompt = await registry.get('create-project');

    expect(prompt.path).toContain('harness/commands/create-project.md');
    expect(prompt.systemPrompt).toContain('name: Create Project');
    expect(prompt.systemPrompt).toContain('Return valid JSON only.');
  });

  it('fails to load an unknown fragment', async () => {
    const registry = new FileSystemPromptRegistry();

    await expect(registry.getFragment('missing')).rejects.toThrow(/Prompt fragment missing not found/);
  });
});
