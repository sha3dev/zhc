/**
 * Agent Usage Examples
 *
 * This file demonstrates how to use the Agent entity,
 * repository, and schemas in your application.
 */

import { agentRepository } from '../src/repositories/agent.repository.js';
import { CreateAgentSchema, UpdateAgentSchema } from '../src/schemas/agent.js';
import type { Agent, CreateAgentDTO, UpdateAgentDTO } from '../src/types/agent.js';

/**
 * Example 1: Create a new CEO agent
 */
export async function createCEOAgent() {
  const dto: CreateAgentDTO = {
    name: 'CEO Agent',
    soul: `# Role
Chief Executive Officer Agent

# Personality
You are the strategic leader of a technical organization. You coordinate between different specialist agents to accomplish complex tasks.

# Traits
- Strategic thinker with big-picture vision
- Excellent communicator and coordinator
- Decisive when needed, collaborative when possible
- Always keeps the human user informed

# Responsibilities
- Receive and analyze user requests
- Delegate tasks to appropriate specialist agents
- Coordinate work between agents
- Aggregate and present results
- Make strategic decisions

# Communication Style
Professional, clear, and concise. You speak naturally with the user while maintaining executive presence.

# Model Configuration
You are powered by Claude Opus 4.6, optimized for complex reasoning and strategic thinking.
`,
    model: 'claude-opus-4-6',
    status: 'active',
  };

  // Validate with Zod schema
  const validated = CreateAgentSchema.parse(dto);

  // Create in database
  const agent = await agentRepository.create(validated);

  console.log(`Created agent: ${agent.name} (ID: ${agent.id})`);
  return agent;
}

/**
 * Example 2: Create specialist agents that report to CEO
 */
export async function createSpecialistAgents(ceoId: number) {
  const specialists: Omit<CreateAgentDTO, 'reportsToId'>[] = [
    {
      name: 'Frontend Developer',
      soul: `# Role
Frontend Developer Agent

# Expertise
- React, Vue, Angular frameworks
- TypeScript and modern JavaScript
- CSS, Tailwind, responsive design
- UI/UX best practices
- Performance optimization

# Personality
Detail-oriented, user-focused, with strong aesthetic sense.

# Communication
Technical but accessible. You care deeply about user experience.
`,
      model: 'claude-sonnet-4-6',
      status: 'active',
    },
    {
      name: 'Backend Developer',
      soul: `# Role
Backend Developer Agent

# Expertise
- Node.js, Python, Go
- API design and REST/GraphQL
- Database design and optimization
- Security and authentication
- Performance and scalability

# Personality
System-focused, security-conscious, performance-driven.

# Communication
Precise and technical. You focus on correctness and efficiency.
`,
      model: 'claude-sonnet-4-6',
      status: 'active',
    },
    {
      name: 'Product Designer',
      soul: `# Role
Product Designer Agent

# Expertise
- User research and testing
- Wireframing and prototyping
- Design systems
- Accessibility standards
- Visual design principles

# Personality
Empathetic, creative, user-advocate.

# Communication
Visual and descriptive. You explain design decisions clearly.
`,
      model: 'claude-sonnet-4-6',
      status: 'active',
    },
  ];

  const agents: Agent[] = [];

  for (const specialist of specialists) {
    const dto: CreateAgentDTO = {
      ...specialist,
      reportsToId: ceoId,
    };

    const validated = CreateAgentSchema.parse(dto);
    const agent = await agentRepository.create(validated);

    agents.push(agent);
    console.log(`Created specialist: ${agent.name} (ID: ${agent.id})`);
  }

  return agents;
}

/**
 * Example 3: Query agents with filters
 */
export async function queryAgentsExample() {
  // Get all active agents
  const { total } = await agentRepository.findAll({
    status: 'active',
    limit: 10,
  });

  console.log(`Found ${total} active agents`);

  // Get all agents using a specific model
  const { agents: claudeAgents } = await agentRepository.findAll({
    model: 'claude-sonnet-4-6',
  });

  console.log(`Found ${claudeAgents.length} agents using Claude Sonnet`);

  // Search for agents by name or soul content
  const { agents: searchResults } = await agentRepository.findAll({
    search: 'Developer',
  });

  console.log(`Found ${searchResults.length} agents matching "Developer"`);
}

/**
 * Example 4: Update an agent's soul
 */
export async function updateAgentSoul(agentId: number) {
  const update: UpdateAgentDTO = {
    soul: `# Role
Frontend Developer Agent

# Updated Expertise
- React, Vue, Angular frameworks
- TypeScript and modern JavaScript
- Next.js and SSR
- CSS, Tailwind, responsive design
- UI/UX best practices
- Performance optimization
- Web accessibility (WCAG 2.1)

# Personality
Detail-oriented, user-focused, with strong aesthetic sense.
Advocate for accessibility and inclusive design.

# Communication
Technical but accessible. You care deeply about user experience
and ensure all interfaces are usable by everyone.
`,
  };

  const validated = UpdateAgentSchema.parse(update);
  const updated = await agentRepository.update(agentId, validated);

  if (updated) {
    console.log(`Updated agent: ${updated.name}`);
  }
}

/**
 * Example 5: Get agent hierarchy
 */
export async function getHierarchyExample() {
  const hierarchy = await agentRepository.getHierarchy();

  function printHierarchy(node: (typeof hierarchy)[0], indent = 0) {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}├─ ${node.name} [${node.status}]`);

    if (node.role) {
      console.log(`${prefix}│  Role: ${node.role}`);
    }

    node.children.forEach((child) => printHierarchy(child, indent + 1));
  }

  console.log('Agent Hierarchy:');
  hierarchy.forEach((node) => printHierarchy(node));
}

/**
 * Example 6: Get agent statistics
 */
export async function getStatsExample() {
  const stats = await agentRepository.getStats();

  console.log('Agent Statistics:');
  console.log(`  Total Agents: ${stats.totalAgents}`);
  console.log(`  Top-Level Agents: ${stats.topLevelAgents}`);
  console.log(`  Max Hierarchy Depth: ${stats.maxDepth}`);
  console.log('\nAgents by Model:');
  Object.entries(stats.agentsByModel).forEach(([model, count]) => {
    if (count > 0) {
      console.log(`  ${model}: ${count}`);
    }
  });
  console.log('\nAgents by Status:');
  Object.entries(stats.agentsByStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
}

/**
 * Example 7: Working with agent hierarchy
 */
export async function workWithHierarchy() {
  // Create CEO
  const ceo = await createCEOAgent();

  // Create specialists
  await createSpecialistAgents(ceo.id);

  // Load CEO with full hierarchy
  const ceoWithHierarchy = await agentRepository.findByIdWithHierarchy(ceo.id);

  if (ceoWithHierarchy) {
    console.log(`\nCEO: ${ceoWithHierarchy.name}`);
    console.log(`Direct Reports: ${ceoWithHierarchy.manages.length}`);

    ceoWithHierarchy.manages.forEach((specialist) => {
      console.log(`  - ${specialist.name} (${specialist.model})`);
    });
  }

  // Get CEO's direct reports directly
  const directReports = await agentRepository.findByReportsToId(ceo.id);
  console.log(`\nDirect reports of ${ceo.name}:`);
  directReports.forEach((agent) => {
    console.log(`  - ${agent.name}`);
  });
}

/**
 * Example 8: Soft delete an agent
 */
export async function archiveAgent(agentId: number) {
  const deleted = await agentRepository.delete(agentId);

  if (deleted) {
    console.log(`Agent ${agentId} has been archived`);

    // Agent still exists but status is 'archived'
    const agent = await agentRepository.findById(agentId);
    console.log(`Agent status: ${agent?.status}`);
  }
}

/**
 * Example 9: Complete workflow
 */
export async function completeWorkflow() {
  console.log('=== Agent Management Workflow ===\n');

  // 1. Create organization
  console.log('1. Creating organization...');
  const ceo = await createCEOAgent();
  const specialists = await createSpecialistAgents(ceo.id);

  // 2. View hierarchy
  console.log('\n2. Organization hierarchy:');
  await getHierarchyExample();

  // 3. View statistics
  console.log('\n3. Organization statistics:');
  await getStatsExample();

  // 4. Query agents
  console.log('\n4. Querying agents...');
  await queryAgentsExample();

  // 5. Update an agent
  console.log('\n5. Updating agent...');
  await updateAgentSoul(specialists[0].id);

  console.log('\n=== Workflow Complete ===');
}
