import type { ToolsService } from '../../tools/application/service.js';
import type { Model } from '../domain/model.js';

export class ModelsService {
  constructor(private readonly tools: ToolsService) {}

  /** Return all models from installed + configured CLI tools (no DB) */
  async listAll(): Promise<Model[]> {
    const { items: statuses } = await this.tools.listStatus();
    return statuses
      .filter((t) => t.status === 'configured')
      .flatMap((t) =>
        t.models.map((name) => ({
          cliId: t.id,
          displayName: null,
          name,
          value: `${t.id}:${name}`,
        })),
      );
  }
}
