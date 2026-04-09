import type { Configuration, InternalConfiguration } from '../domain/configuration.js';
import { toConfiguration } from '../domain/configuration.js';
import type { ConfigurationRepository, UpdateConfigurationInput } from './contracts.js';

export class ConfigurationService {
  constructor(private readonly repository: ConfigurationRepository) {}

  async get(): Promise<Configuration> {
    return toConfiguration(await this.repository.get());
  }

  getInternal(): Promise<InternalConfiguration> {
    return this.repository.get();
  }

  async update(input: UpdateConfigurationInput): Promise<Configuration> {
    return toConfiguration(await this.repository.update(input));
  }
}
