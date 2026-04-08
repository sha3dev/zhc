import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NotFoundError } from '../../../shared/errors/app-error.js';
import type { PromptAsset, PromptFragment, PromptRegistry } from '../application/contracts.js';

const promptsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../harness/commands',
);

export class FileSystemPromptRegistry implements PromptRegistry {
  private readonly cache = new Map<string, PromptAsset>();
  private readonly fragmentCache = new Map<string, PromptFragment>();

  async get(operationKey: string): Promise<PromptAsset> {
    const cached = this.cache.get(operationKey);
    if (cached) {
      return cached;
    }

    const path = resolve(promptsDir, `${operationKey}.md`);

    try {
      const systemPrompt = await readFile(path, 'utf-8');
      const asset = { operationKey, path, systemPrompt };
      this.cache.set(operationKey, asset);
      return asset;
    } catch (error) {
      throw new NotFoundError(`System prompt ${operationKey} not found`, { cause: error });
    }
  }

  async getFragment(key: string): Promise<PromptFragment> {
    const cached = this.fragmentCache.get(key);
    if (cached) {
      return cached;
    }

    const path = resolve(promptsDir, 'fragments', `${key}.md`);

    try {
      const content = await readFile(path, 'utf-8');
      const fragment = { content, key, path };
      this.fragmentCache.set(key, fragment);
      return fragment;
    } catch (error) {
      throw new NotFoundError(`Prompt fragment ${key} not found`, { cause: error });
    }
  }
}
