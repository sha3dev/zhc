# Claude Agent Instructions

This repository uses AI agents (via Claude Code) for development. This document contains instructions for Claude agents working on this codebase.

## Project Overview

This is a hierarchical multi-agent system where AI agents with distinct personalities collaborate to accomplish tasks. The system features a CEO agent that coordinates other specialized agents.

## Code Conventions

### TypeScript

- Use strict TypeScript - no `any` types
- Prefer `const` over `let`
- Use explicit return types for exported functions
- Write JSDoc comments for public APIs
- Use type-only imports: `import type { X } from "..."`
- Enable strict null checks
- Use `undefined` not `null` for missing values

### File Naming

- Source files: `kebab-case.ts`
- Test files: `*.test.ts` or `*.spec.ts`
- One export per file when possible

### Import Order

```typescript
// 1. Node.js built-ins
import { setTimeout } from "node:timers/promises";

// 2. External dependencies
import express from "express";

// 3. Internal modules
import { Agent } from "./types/agent.js";

// 4. Type-only imports
import type { AgentConfig } from "./types/agent.js";
```

### Error Handling

- Always handle errors appropriately
- Use typed errors when possible
- Never swallow errors silently
- Log errors with context

### Testing

- Write tests for all new functionality
- Maintain 80%+ coverage
- Use descriptive test names: "should do X when Y"
- Follow AAA pattern (Arrange, Act, Assert)

## Development Workflow

### When Working on Features

1. Read relevant documentation in [docs/](docs/)
2. Check for existing issues/PRs
3. Create a branch: `feature/your-feature-name`
4. Implement with tests
5. Run quality checks: `npm run lint && npm run typecheck && npm test`
6. Format code: `npm run format`
7. Update documentation if needed
8. Commit with conventional commits

### When Fixing Bugs

1. Reproduce the bug
2. Write a failing test
3. Fix the bug
4. Ensure tests pass
5. Check for similar issues

### Before Submitting PRs

- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Type check passes: `npm run typecheck`
- [ ] Coverage is adequate: `npm run test:coverage`
- [ ] Documentation updated (if needed)
- [ ] Commits follow conventions

## Architecture Guidelines

### Agent System

- Agents are defined in [src/agents/](src/agents/)
- Agent personalities (SOUL.md) are in [src/soul/](src/soul/)
- Agent hierarchy: CEO manages specialist agents
- Communication flows through the orchestrator

### Skills System

- Skills are reusable capabilities defined in [skills/](skills/)
- Each skill has parameters, output format, and examples
- Agents use skills via the orchestrator

### API Layer

- API routes are in [src/api/routes/](src/api/routes/)
- Use Zod for request validation
- Return consistent error responses

### Database Layer

- **Always use naming utilities** from `src/db/naming.ts` for all table/column names
- **Never hardcode** column names - use the helper functions
- Table names are **singular** and use **snake_case**
- All columns have a **3-letter prefix** identifying their table
- Foreign keys maintain the original table's prefix
- See [DATABASE_CONVENTIONS.md](DATABASE_CONVENTIONS.md) for complete rules

## Quality Standards

### Code Quality

- Functions should be small and focused
- Avoid nested conditionals
- Use early returns
- Extract complex logic into named functions
- Don't repeat yourself (DRY)

### Documentation

- Exported functions must have JSDoc
- Complex logic needs inline comments
- Update [ARCHITECTURE.md](ARCHITECTURE.md) for structural changes
- Update [AGENTS.md](AGENTS.md) for agent-related changes

### Performance

- Avoid unnecessary computations
- Use appropriate data structures
- Consider memory usage
- Profile before optimizing

## Testing Guidelines

### Unit Tests

- Test individual functions/classes
- Mock external dependencies
- Test edge cases
- Test error paths

### Integration Tests

- Test how modules work together
- Use real dependencies where appropriate
- Test common workflows

### E2E Tests

- Test complete user scenarios
- Test across agent boundaries
- Validate expected outcomes

## Commit Conventions

Use conventional commits:

```
type(scope): description

feat(agents): add ability to create custom agent personalities
fix(api): resolve race condition in agent message queue
docs(readme): update installation instructions
test(orchestrator): add integration tests for multi-agent projects
```

## Common Tasks

### Adding a New Agent

1. Create SOUL.md in [src/soul/](src/soul/)
2. Define agent configuration in [src/agents/](src/agents/)
3. Register with orchestrator
4. Add tests
5. Update [AGENTS.md](AGENTS.md)

### Adding a New Skill

1. Create skill definition in [skills/](skills/)
2. Document parameters and output
3. Provide examples
4. Add skill usage to relevant agents

### Creating an API Endpoint

1. Define route in [src/api/routes/](src/api/routes/)
2. Add Zod validation
3. Implement handler
4. Add tests
5. Update API documentation

### Creating Database Tables

1. Use naming utilities from `src/db/naming.ts`
2. Follow conventions in [DATABASE_CONVENTIONS.md](DATABASE_CONVENTIONS.md)
3. Example:

```typescript
import { getPrimaryKeyColumn, getForeignKeyColumn, getTimestampColumn } from "./db/naming.js";

const tableName = "agent";
const columns = {
  id: getPrimaryKeyColumn(tableName),              // "agn_id"
  name: getColumnName(tableName, "name"),          // "agn_name"
  createdAt: getTimestampColumn(tableName, "created_at"), // "agn_created_at"
};
```

4. Always use singular table names
5. All columns must have the table's prefix
6. Add standard columns: `_id`, `_created_at`, `_updated_at`

### Adding Database Columns

1. Import naming utilities
2. Use helper functions - never hardcode prefixes
3. Update TypeScript types
4. Create migration script
5. Add tests

## Special Considerations

- **Security**: Never commit API keys or secrets
- **Performance**: Agent responses can be slow, design accordingly
- **Scalability**: Consider future growth when implementing features
- **Backwards Compatibility**: Avoid breaking changes when possible
- **Deprecation**: Provide migration path for deprecated features

## Getting Help

- Check [ARCHITECTURE.md](ARCHITECTURE.md) for design context
- Check [AGENTS.md](AGENTS.md) for agent system details
- Check existing issues for similar problems
- Read existing code for patterns

## Agent-Specific Instructions

### When Acting as CEO Agent

- Consider the big picture
- Delegate appropriate tasks
- Coordinate between agents
- Make strategic decisions
- Keep the human informed

### When Acting as Specialist Agent

- Stay within your expertise
- Ask CEO for clarification when needed
- Report progress regularly
- Escalate blockers promptly
- Document your decisions
