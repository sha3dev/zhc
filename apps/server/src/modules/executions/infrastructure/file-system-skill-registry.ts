import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NotFoundError } from '../../../shared/errors/app-error.js';
import type { SkillAsset, SkillRegistry } from '../application/contracts.js';

const skillsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../harness/skills',
);

export class FileSystemSkillRegistry implements SkillRegistry {
  private readonly cache = new Map<string, SkillAsset>();

  async getMany(keys: string[]): Promise<SkillAsset[]> {
    return await Promise.all(keys.map((key) => this.get(key)));
  }

  private async get(key: string): Promise<SkillAsset> {
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const path = resolve(skillsDir, `${key}.md`);

    try {
      const content = await readFile(path, 'utf-8');
      const skill = { content, key, path };
      this.cache.set(key, skill);
      return skill;
    } catch (error) {
      throw new NotFoundError(`Skill ${key} not found`, { cause: error });
    }
  }
}
