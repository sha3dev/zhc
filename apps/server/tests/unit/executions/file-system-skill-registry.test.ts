import { describe, expect, it } from 'vitest';
import { FileSystemSkillRegistry } from '../../../src/modules/executions/index.js';
import { NotFoundError } from '../../../src/shared/errors/app-error.js';

describe('FileSystemSkillRegistry', () => {
  it('loads skills in requested order', async () => {
    const registry = new FileSystemSkillRegistry();

    const skills = await registry.getMany(['playwright-browser', 'dokku']);

    expect(skills.map((skill) => skill.key)).toEqual(['playwright-browser', 'dokku']);
    expect(skills[0]?.content).toContain('complete Playwright API through raw mode');
    expect(skills[1]?.content).toContain('Dokku');
  });

  it('throws NotFoundError for missing skills', async () => {
    const registry = new FileSystemSkillRegistry();

    await expect(registry.getMany(['missing-skill'])).rejects.toBeInstanceOf(NotFoundError);
  });
});
