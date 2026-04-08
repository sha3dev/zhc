import 'dotenv/config';
import { bootstrapDefaultAgents } from '../apps/server/src/modules/agents/application/bootstrap.js';
import { SqlAgentsRepository } from '../apps/server/src/modules/agents/infrastructure/sql-agents.repository.js';
import { closeDatabase } from '../apps/server/src/shared/db/client.js';

async function main() {
  const repository = new SqlAgentsRepository();
  const created = await bootstrapDefaultAgents(repository);

  if (created.length > 0) {
    console.log(`\nSeeded ${created.length} default agents:`);
    for (const agent of created) {
      console.log(`  [${agent.id}] ${agent.name} (${agent.model})`);
    }
  } else {
    console.log('\nNo agents seeded (table already has data).');
  }

  await closeDatabase();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
