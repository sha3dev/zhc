# Agent Orchestrator

> A hierarchical multi-agent system where AI agents with distinct personalities collaborate to accomplish complex tasks.

## Overview

This project creates an organization of AI agents, each with a unique personality (SOUL.md) and associated model. The system features a CEO agent that coordinates other specialized agents, forming a hierarchical structure similar to real-world organizations.

### Key Features

- **Hierarchical Agent Organization**: CEO manages specialized agents (Frontend, Backend, Design, Marketing, Support)
- **Personality System**: Each agent has a unique SOUL.md defining their personality and behavior
- **Multi-Model Support**: Agents can use different AI models (Claude Opus/Sonnet, GPT-4, etc.)
- **Project Management**: Create projects as task flows that agents collaborate on
- **Type-Safe**: Built with TypeScript for robust development

### Standard Organization

```
        CEO
         |
    +----+----+----+----+
    |    |    |    |    |
 Frontend Backend Design Marketing Support
```

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/agent-orchestrator.git
cd agent-orchestrator

# Install dependencies
npm install

# Setup git hooks
npm run prepare
```

## Quick Start

```typescript
import { AgentOrchestrator, Agent, AgentSoul } from "agent-orchestrator";

// Create the orchestrator
const orchestrator = new AgentOrchestrator();

// Define an agent personality
const ceoSoul: AgentSoul = {
  id: "ceo-soul",
  name: "Strategic Leader",
  personality: "Visionary, decisive, strategic thinker",
  systemPrompt: "You are the CEO. Coordinate tasks and make strategic decisions.",
  communicationStyle: "formal",
};

// Create and register the CEO
const ceo: Agent = {
  id: "ceo",
  soul: ceoSoul,
  model: "claude-opus-4-6",
  role: "Chief Executive Officer",
  manages: ["frontend-lead", "backend-lead"],
};

orchestrator.registerAgent(ceo);
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck

# Build for production
npm run build
```

## Project Structure

```
agent-orchestrator/
├── src/
│   ├── agents/       # Agent implementations
│   ├── soul/         # SOUL.md personality files
│   ├── skills/       # Reusable agent skills
│   ├── api/          # Web API endpoints
│   ├── types/        # TypeScript type definitions
│   └── utils/        # Utility functions
├── tests/
│   ├── unit/         # Unit tests
│   ├── integration/  # Integration tests
│   └── e2e/          # End-to-end tests
├── skills/           # Skill definitions for agents
└── docs/             # Additional documentation
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design decisions
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute to the project
- [AGENTS.md](AGENTS.md) - Agent system documentation
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Community guidelines

## Testing

We maintain high test coverage standards:

```bash
# Watch mode for development
npm run test:watch

# Full coverage report
npm run test:coverage
```

Coverage thresholds:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- Open an issue for bugs or feature requests
- Check existing [issues](https://github.com/yourusername/agent-orchestrator/issues)
- Read the [documentation](docs/)

---

Made with ❤️ by the community
