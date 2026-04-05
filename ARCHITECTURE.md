# Architecture

This document describes the high-level architecture and design decisions of Agent Orchestrator.

## Table of Contents

- [System Overview](#system-overview)
- [Core Concepts](#core-concepts)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Database Architecture](#database-architecture)
- [Technology Choices](#technology-choices)
- [Design Patterns](#design-patterns)
- [Scalability Considerations](#scalability-considerations)

## System Overview

Agent Orchestrator is a hierarchical multi-agent system where AI agents with distinct personalities collaborate to accomplish tasks.

```
┌─────────────────────────────────────────────────────┐
│                   Human User                        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│                     CEO Agent                       │
│  (Coordinates, delegates, makes strategic decisions)│
└───┬─────────┬─────────┬─────────┬─────────┬────────┘
    │         │         │         │         │
    ▼         ▼         ▼         ▼         ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐ ┌──────────┐
│Front │ │Back  │ │Design│ │Marketing│ │ Support │
│ end  │ │ end  │ │      │ │          │ │          │
└──────┘ └──────┘ └──────┘ └──────────┘ └──────────┘
```

## Core Concepts

### Agent

An **Agent** is an AI entity with:
- **Unique ID**: Identifier within the system
- **Soul**: Personality definition (SOUL.md)
- **Model**: AI model powering the agent (e.g., Claude Opus)
- **Role**: Position in the organization
- **Hierarchy**: Who they report to and who they manage

### Soul

A **Soul** defines an agent's personality:
- Behavioral traits
- Communication style
- Decision-making patterns
- System prompt context

### Project

A **Project** is an organized flow of tasks:
- Ordered task list with dependencies
- Agent assignments
- Status tracking
- Result aggregation

## Component Architecture

### Directory Structure

```
src/
├── agents/           # Agent implementation classes
│   ├── base.ts       # Base agent class
│   ├── ceo.ts        # CEO-specific logic
│   └── specialist.ts # Specialist agent logic
├── soul/             # SOUL.md personality files
│   ├── ceo.md
│   ├── developer.md
│   └── ...
├── skills/           # Agent capabilities
│   ├── code-review.ts
│   ├── planning.ts
│   └── ...
├── api/              # Web API layer
│   ├── routes/
│   ├── middleware/
│   └── server.ts
├── types/            # TypeScript definitions
│   └── index.ts
└── utils/            # Shared utilities
    ├── logger.ts
    └── validation.ts
```

### Key Components

#### AgentOrchestrator

Main class managing the agent hierarchy:
- Agent registration and lookup
- Hierarchy traversal
- Message routing
- Project lifecycle management

#### BaseAgent

Abstract base class for all agents:
- Model interaction
- Message handling
- State management
- Skill execution

#### Skill System

Reusable capabilities that agents can use:
- Declarative skill definitions
- Skill composition
- Parameter validation
- Result formatting

## Data Flow

### Task Execution Flow

```
1. User submits request to CEO
   │
2. CEO analyzes and creates project plan
   │
3. CEO decomposes into tasks
   │
4. Tasks assigned to specialist agents
   │
5. Agents collaborate (hierarchical communication)
   │
6. Results aggregated by CEO
   │
7. Final response delivered to user
```

### Message Flow

```
Agent A ──message──> Orchestrator ──route──> Agent B
   │                                        │
   └──────acknowledgment←────────────────────┘
```

## Database Architecture

### Overview

Agent Orchestrator uses PostgreSQL as its primary database for persisting all system state including:
- Agent configurations and personalities
- Project definitions and task lists
- Agent communication history
- System metadata

### Naming Conventions

The database follows a strict naming convention to maintain consistency and make queries self-documenting.

**Key principles**:
- All tables use `snake_case` and are **singular** (e.g., `agent`, not `agents`)
- Every column has a **3-letter prefix** identifying its table
- Foreign keys maintain the original table's prefix

**Example**:
```sql
CREATE TABLE agent (
    agn_id SERIAL PRIMARY KEY,
    agn_name VARCHAR(255) NOT NULL,
    agn_model VARCHAR(50) NOT NULL,
    agn_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task (
    tsk_id SERIAL PRIMARY KEY,
    tsk_prj_id INTEGER REFERENCES project(prj_id),
    tsk_assigned_to_agn_id INTEGER REFERENCES agent(agn_id),
    tsk_title VARCHAR(500) NOT NULL,
    tsk_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Schema Organization

```
database/
├── agent/          # Agent configurations
├── project/        # Project definitions
├── task/           # Task management
├── communication/  # Agent messages
└── system/         # Configuration, metadata
```

### TypeScript Integration

The system provides type-safe database utilities in `src/db/naming.ts`:

```typescript
import { getPrimaryKeyColumn, getForeignKeyColumn } from "./db/naming.js";

// Generate column names automatically
const agentId = getPrimaryKeyColumn("agent");        // "agn_id"
const taskProjectId = getForeignKeyColumn("task", "project");  // "tsk_prj_id"
```

For complete naming conventions, see [DATABASE_CONVENTIONS.md](DATABASE_CONVENTIONS.md).

## Technology Choices

### TypeScript

**Why**: Type safety, excellent IDE support, modern JavaScript features

**Trade-off**: Build step required, but the benefits far outweigh the cost

### Express.js

**Why**: Minimal, flexible, well-established ecosystem

**Alternatives considered**:
- Fastify: Faster, but Express is sufficient for our needs
- NestJS: Too heavy for our use case

### Vitest

**Why**: Fast, native ESM support, great TypeScript integration

**Alternatives considered**:
- Jest: Slower, ESM support is experimental
- Mocha: Less integrated with TypeScript

### Zod

**Why**: Runtime type validation, excellent TypeScript inference

## Design Patterns

### Strategy Pattern

Agents use different strategies based on their soul/personality:

```typescript
interface CommunicationStrategy {
  communicate(message: string): Promise<string>;
}

class FormalCommunicationStrategy implements CommunicationStrategy {
  async communicate(message: string): Promise<string> {
    // Formal communication logic
  }
}
```

### Chain of Responsibility

Tasks flow through the agent hierarchy:

```typescript
CEO analyzes task
  │
  ├─ can I handle it? ──yes──> execute
  │
  └─no──> delegate to subordinate
           │
           └─ recurse
```

### Observer Pattern

Agents observe project state changes:

```typescript
interface ProjectObserver {
  onTaskStatusChange(taskId: string, status: TaskStatus): void;
}
```

## Scalability Considerations

### Current Design

- Single-process, in-memory agent storage
- Synchronous message passing
- No persistence layer

### Future Improvements

1. **Distributed Agents**: Support agents running on different machines
2. **Message Queue**: Async message passing (RabbitMQ, Redis)
3. **Load Balancing**: Multiple orchestrator instances
4. **Caching**: Cache common agent responses
5. **Database Optimization**: Add read replicas, connection pooling tuning

### Performance Targets

- Message routing: < 10ms
- Agent response: < 5s (depends on model)
- Project creation: < 100ms
- Concurrency: Support 100+ simultaneous projects

## Security Considerations

1. **API Key Management**: Never commit API keys
2. **Input Validation**: Validate all user inputs with Zod
3. **Rate Limiting**: Prevent API abuse
4. **Audit Logging**: Log all agent interactions
5. **Sandboxing**: Consider agent execution isolation

## Future Enhancements

- [ ] Multi-tenancy support
- [ ] Agent learning from past projects
- [ ] Dynamic agent creation
- [ ] Visual project editor
- [ ] Agent marketplace (share souls/skills)
