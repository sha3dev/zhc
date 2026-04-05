# Agent Entity Documentation

The Agent entity is the core of the Agent Orchestrator system. This document provides comprehensive documentation for working with agents.

## Overview

An **Agent** represents an AI entity with:
- A unique personality (**soul**) defined in markdown format
- A specific AI **model** (e.g., Claude Opus, GPT-4)
- A position in the organizational **hierarchy**
- A current **status** (active, inactive, archived)

## Table Structure

### Database Table: `agent`

| Column | Type | Description |
|--------|------|-------------|
| `agn_id` | SERIAL | Primary key |
| `agn_name` | VARCHAR(255) | Agent name |
| `agn_soul` | TEXT | Personality definition (markdown) |
| `agn_model` | VARCHAR(50) | AI model to use |
| `agn_reports_to_agn_id` | INTEGER (nullable) | Parent agent ID |
| `agn_status` | VARCHAR(20) | Agent status |
| `agn_created_at` | TIMESTAMP | Creation timestamp |
| `agn_updated_at` | TIMESTAMP | Last update timestamp |

## Supported AI Models

- **Claude Models**: `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5`
- **GPT Models**: `gpt-4`, `gpt-4-turbo`, `gpt-4o`
- **O1 Models**: `o1-preview`, `o1-mini`
- **DeepSeek Models**: `deepseek-chat`, `deepseek-coder`

## Agent Status

- **active**: Agent is fully operational
- **inactive**: Agent is temporarily disabled
- **archived**: Agent has been soft-deleted

## Type System

### AgentEntity
Database representation (column names with `agn_` prefix):

```typescript
interface AgentEntity {
  agn_id: number;
  agn_name: string;
  agn_soul: string;
  agn_model: AgentModel;
  agn_reports_to_agn_id: number | null;
  agn_status: AgentStatus;
  agn_created_at: Date;
  agn_updated_at: Date;
}
```

### Agent
Domain model with resolved hierarchy:

```typescript
interface Agent {
  id: number;
  name: string;
  soul: string;
  model: AgentModel;
  status: AgentStatus;
  reportsTo?: Agent;  // Parent agent (resolved)
  manages: Agent[];   // Child agents (resolved)
  createdAt: Date;
  updatedAt: Date;
}
```

### CreateAgentDTO
For creating new agents:

```typescript
interface CreateAgentDTO {
  name: string;
  soul: string;
  model: AgentModel;
  reportsToId?: number;
  status?: AgentStatus;
}
```

### UpdateAgentDTO
For updating existing agents (all fields optional):

```typescript
interface UpdateAgentDTO {
  name?: string;
  soul?: string;
  model?: AgentModel;
  reportsToId?: number | null;
  status?: AgentStatus;
}
```

## Repository API

### AgentRepository

The `AgentRepository` class provides all database operations for agents.

#### Methods

##### `create(dto: CreateAgentDTO): Promise<Agent>`
Create a new agent.

```typescript
const agent = await agentRepository.create({
  name: "CEO Agent",
  soul: "# Role\nCEO\n",
  model: "claude-opus-4-6",
  status: "active",
});
```

##### `findById(id: number): Promise<Agent | null>`
Find an agent by ID.

```typescript
const agent = await agentRepository.findById(1);
```

##### `findByIdWithHierarchy(id: number): Promise<Agent | null>`
Find an agent with full hierarchy (parent and children loaded).

```typescript
const agent = await agentRepository.findByIdWithHierarchy(1);
console.log(agent.reportsTo);  // Parent agent
console.log(agent.manages);    // Child agents
```

##### `findAll(params?: AgentQueryParams): Promise<{ agents: Agent[]; total: number }>`
Find agents with optional filtering and pagination.

```typescript
const { agents, total } = await agentRepository.findAll({
  status: "active",
  model: "claude-sonnet-4-6",
  limit: 20,
  offset: 0,
});
```

##### `findByReportsToId(reportsToId: number): Promise<Agent[]>`
Find all agents that report to a specific agent.

```typescript
const reports = await agentRepository.findByReportsToId(ceoId);
```

##### `findTopLevelAgents(): Promise<Agent[]>`
Find all agents with no parent (top-level agents).

```typescript
const topLevelAgents = await agentRepository.findTopLevelAgents();
```

##### `update(id: number, dto: UpdateAgentDTO): Promise<Agent | null>`
Update an agent.

```typescript
const updated = await agentRepository.update(agentId, {
  name: "Updated Name",
  status: "inactive",
});
```

##### `delete(id: number): Promise<boolean>`
Soft delete an agent (sets status to 'archived').

```typescript
const deleted = await agentRepository.delete(agentId);
```

##### `hardDelete(id: number): Promise<boolean>`
Permanently delete an agent from the database.

```typescript
const deleted = await agentRepository.hardDelete(agentId);
```

##### `getHierarchy(): Promise<AgentHierarchyNode[]>`
Get the complete agent hierarchy as a tree.

```typescript
const hierarchy = await agentRepository.getHierarchy();
```

##### `getStats(): Promise<AgentStats>`
Get agent statistics.

```typescript
const stats = await agentRepository.getStats();
console.log(`Total agents: ${stats.totalAgents}`);
console.log(`Max depth: ${stats.maxDepth}`);
```

## Validation with Zod Schemas

All inputs are validated using Zod schemas:

```typescript
import { CreateAgentSchema, UpdateAgentSchema } from "./schemas/agent.js";

// Validate creation data
const dto = {
  name: "CEO Agent",
  soul: "# Role\nCEO\n",
  model: "claude-opus-4-6",
};

const validated = CreateAgentSchema.parse(dto);
```

### Schema Rules

- **name**: 1-255 characters, alphanumeric + spaces/hyphens/underscores
- **soul**: 50-100,000 characters (markdown format)
- **model**: Must be one of the supported models
- **status**: Must be 'active', 'inactive', or 'archived'
- **reportsToId**: Optional positive integer

## Soul Format

The agent's soul is a markdown document that defines the agent's personality. A typical soul includes:

```markdown
# Role
[Agent's role in the organization]

# Personality
[Traits and behavioral guidelines]

# Expertise
[Skills and capabilities]

# Responsibilities
[What the agent is responsible for]

# Communication Style
[How the agent communicates]

# Additional Context
[Any other relevant information]
```

### Example Soul

```markdown
# Role
Chief Executive Officer Agent

# Personality
You are the strategic leader of a technical organization. You coordinate between different specialist agents to accomplish complex tasks.

# Traits
- Strategic thinker with big-picture vision
- Excellent communicator and coordinator
- Decisive when needed, collaborative when possible
- Always keeps the human user informed

# Expertise
- Project planning and management
- Team coordination
- Strategic decision-making
- Technical architecture oversight

# Responsibilities
- Receive and analyze user requests
- Delegate tasks to appropriate specialist agents
- Coordinate work between agents
- Aggregate and present results
- Make strategic decisions

# Communication Style
Professional, clear, and concise. You speak naturally with the user while maintaining executive presence.

# Constraints
- Always explain your reasoning before delegating
- Keep the human informed of progress
- Ask for clarification when requirements are ambiguous
- Escalate blockers promptly
```

## Database Naming Conventions

This entity follows the database naming conventions:

- **Table name**: `agent` (singular)
- **Column prefix**: `agn` (3 letters)
- **Foreign key**: `agn_reports_to_agn_id` (maintains `agn` prefix)
- **Indexes**: `idx_agent_agn_name`, `idx_agent_agn_model`, etc.

See [DATABASE_CONVENTIONS.md](../DATABASE_CONVENTIONS.md) for complete rules.

## Usage Examples

See [examples/agent-usage.ts](../examples/agent-usage.ts) for complete examples including:

- Creating agents
- Building hierarchies
- Querying and filtering
- Updating agents
- Working with hierarchy
- Getting statistics

## Testing

Run tests with:

```bash
# Run all agent tests
npm test

# Run only agent repository tests
npm test -- agent.repository.test

# Run only agent schema tests
npm test -- agent.test
```

## Migration

To create the agent table in your database:

```bash
npm run migrate scripts/migrations/002_create_agent_table.sql
```

## Best Practices

1. **Always validate input** using Zod schemas before database operations
2. **Use repository methods** - never query the database directly
3. **Soft delete by default** - use `delete()` instead of `hardDelete()`
4. **Load hierarchy efficiently** - use `findByIdWithHierarchy()` instead of multiple queries
5. **Write meaningful souls** - the soul determines agent behavior
6. **Follow naming conventions** - use the naming utilities for consistency
7. **Handle hierarchy carefully** - avoid circular references
8. **Use appropriate models** - match model capabilities to agent responsibilities

## Future Enhancements

- [ ] Agent capabilities/skills mapping
- [ ] Agent performance metrics
- [ ] Agent templates (pre-defined souls)
- [ ] Agent versioning
- [ ] Bulk operations
- [ ] Advanced hierarchy queries
- [ ] Agent caching
- [ ] Agent health monitoring
