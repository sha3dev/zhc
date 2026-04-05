# Contributing to Agent Orchestrator

Thank you for considering contributing to Agent Orchestrator! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/agent-orchestrator.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### 1. Before You Start

- Check [existing issues](https://github.com/yourusername/agent-orchestrator/issues) to avoid duplicates
- Comment on an issue if you want to work on it
- For new features, consider opening an issue first for discussion

### 2. Development

```bash
# Watch mode for development
npm run dev

# Run tests in watch mode
npm run test:watch

# Type check as you develop
npm run typecheck
```

### 3. Before Committing

```bash
# Format your code
npm run format

# Lint and auto-fix
npm run lint:fix

# Run full test suite
npm test

# Type check
npm run typecheck
```

## Coding Standards

### TypeScript

- Use strict TypeScript - no `any` types
- Prefer `const` over `let`
- Use explicit return types for exported functions
- Write JSDoc comments for public APIs

Example:

```typescript
/**
 * Calculates the sum of two numbers
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}
```

### File Organization

- One export per file when possible
- Group related functions in a module
- Use barrel files (`index.ts`) for clean imports

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `agent-manager.ts`)
- **Classes**: `PascalCase` (e.g., `AgentOrchestrator`)
- **Functions/Variables**: `camelCase` (e.g., `getAgentById`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_AGENTS`)
- **Types/Interfaces**: `PascalCase` (e.g., `AgentConfig`)

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

## Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("AgentOrchestrator", () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = new AgentOrchestrator();
  });

  describe("registerAgent", () => {
    it("should register a new agent", () => {
      const agent = createTestAgent();
      orchestrator.registerAgent(agent);
      expect(orchestrator.getAgent(agent.id)).toEqual(agent);
    });

    it("should throw error for duplicate agent ID", () => {
      const agent = createTestAgent();
      orchestrator.registerAgent(agent);
      expect(() => orchestrator.registerAgent(agent)).toThrow();
    });
  });
});
```

### Testing Principles

1. **Unit Tests**: Test individual functions/classes in isolation
2. **Integration Tests**: Test how modules work together
3. **E2E Tests**: Test complete user workflows

### Coverage Requirements

Maintain at least 80% coverage across all metrics:
- Statements
- Branches
- Functions
- Lines

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
feat(agents): add ability to create custom agent personalities

fix(api): resolve race condition in agent message queue

docs(readme): update installation instructions for Node 20

test(orchestrator): add integration tests for multi-agent projects

refactor(skills): extract common skill patterns into base class
```

## Pull Request Process

### 1. Opening a PR

- Use a descriptive title (follows commit conventions)
- Reference related issues: `Closes #123`
- Fill out the PR template completely

### 2. PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass locally (`npm test`)
- [ ] Coverage requirements met
- [ ] Documentation updated (if needed)
- [ ] Commits follow convention
- [ ] Only one fix/feature per PR

### 3. Review Process

- Address all review comments
- Keep PRs focused and reasonably sized
- Respond to review feedback promptly

### 4. After Merge

- Delete your branch (unless instructed otherwise)
- Consider following up on related issues

## Questions?

Feel free to open an issue or reach out to maintainers.

Thank you for your contributions! 🚀
