import { logger } from '../../../shared/observability/logger.js';
import type { ConfigurationReader } from '../../configuration/index.js';
import type { EmailsService } from './service.js';

export class EmailPoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly emails: EmailsService,
    private readonly configuration: ConfigurationReader,
  ) {}

  async start(): Promise<void> {
    const config = await this.configuration.getInternal();

    if (!config.email.pollEnabled) {
      logger.info('Email poller disabled');
      return;
    }

    const intervalSeconds = config.email.pollIntervalSeconds || 60;
    await this.runCycle();
    this.intervalId = setInterval(() => {
      void this.runCycle();
    }, intervalSeconds * 1000);

    logger.info('Email poller started', { intervalSeconds });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runCycle(): Promise<void> {
    if (this.running) {
      logger.info('Email poller cycle skipped because a previous cycle is still running');
      return;
    }

    this.running = true;

    try {
      const result = await this.emails.syncInbound();
      logger.info('Email poller cycle complete', {
        imported: result.imported,
        skipped: result.skipped,
      });
    } catch (error) {
      logger.error('Email poller cycle failed', { error: String(error) });
    } finally {
      this.running = false;
    }
  }
}
