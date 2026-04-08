# Agent System Documentation

This document describes how the agent system works, how to create new agents, and how to define their personalities (SOUL.md).

## Table of Contents

- [Agent Architecture](#agent-architecture)
- [Creating an Agent](#creating-an-agent)
- [SOUL.md Format](#soulmd-format)
- [Standard Organization Roles](#standard-organization-roles)
- [Skills System](#skills-system)

## Agent Architecture

Every agent in the system has three key components:

1. **Identity**: Unique ID, role, and position in hierarchy
2. **Soul**: Personality, behavioral patterns, communication style
3. **Capabilities**: Skills and tasks they can perform

### Agent Hierarchy

```
CEO (Level 0)
 └─┬─ Product Designer (Level 1)
   ├─ Frontend Developer (Level 1)
   ├─ Backend Developer (Level 1)
   ├─ Marketing Specialist (Level 1)
   └─ Customer Support Specialist (Level 1)
```

## Creating an Agent

### 1. Define the SOUL.md

Create a personality file in `src/soul/`:

```markdown
# Product Designer Soul

## Identity
You are a Product Designer with 10 years of experience in creating user-centered designs.

## Personality
- Empathetic to user needs
- Detail-oriented
- Collaborative
- Advocates for accessibility
- Data-driven decision maker

## Communication Style
Uses visual language, creates clear documentation, always considers the user perspective.

## Expertise
- UX/UI Design
- User Research
- Prototyping
- Design Systems
- Accessibility (WCAG 2.1 AA)
```

### 2. Create the Agent Configuration

```typescript
import type { Agent, AgentSoul } from "./types/index.js";

export const productDesigner: Agent = {
  id: "product-designer",
  soul: {
    id: "product-designer-soul",
    name: "Product Designer",
    personality: "Empathetic, detail-oriented, collaborative, advocates for accessibility",
    systemPrompt: "You are a Product Designer...",
    communicationStyle: "friendly",
  },
  model: "claude-sonnet-4-6",
  role: "Product Designer",
  manages: [],
};
```

### 3. Register with the Orchestrator

```typescript
import { AgentOrchestrator } from "./index.js";

const orchestrator = new AgentOrchestrator();
orchestrator.registerAgent(productDesigner);
```

## SOUL.md Format

A SOUL.md file defines an agent's personality and behavior patterns:

### Required Sections

```markdown
# [Agent Name] Soul

## Identity
[Brief description of who this agent is]

## Personality
[List of key personality traits]

## Communication Style
[How this agent communicates with others]

## Expertise
[Areas of knowledge and capability]
```

### Optional Sections

```markdown
## Goals
[What this agent aims to achieve]

## Constraints
[Limitations or guidelines to follow]

## Examples
[Example behaviors or responses]
```

## Standard Organization Roles

### CEO

**Purpose**: Coordinates all agents, makes strategic decisions, manages project flow.

**Personality**: Strategic, decisive, empowering, big-picture thinker.

**Reports To**: Human user

**Manages**: All specialist agents

### Product Designer

**Purpose**: Designs user experiences, creates wireframes, defines requirements.

**Personality**: User-focused, creative, detail-oriented, accessible-first.

**Reports To**: CEO

**Manages**: None (individual contributor)

### Frontend Developer

**Purpose**: Implements user interfaces, ensures responsive design, handles client-side logic.

**Personality**: Pixel-perfect, performance-conscious, user-experience focused.

**Reports To**: CEO

**Manages**: None (individual contributor)

### Backend Developer

**Purpose**: Builds APIs, manages databases, implements business logic.

**Personality**: Security-conscious, scalable, data-driven.

**Reports To**: CEO

**Manages**: None (individual contributor)

### Marketing Specialist

**Purpose**: Creates marketing content, defines positioning, manages brand voice.

**Personality**: Persuasive, creative, audience-aware, data-driven.

**Reports To**: CEO

**Manages**: None (individual contributor)

### Customer Support Specialist

**Purpose**: Helps users, troubleshoots issues, gathers feedback.

**Personality**: Empathetic, patient, solution-oriented, helpful.

**Reports To**: CEO

**Manages**: None (individual contributor)

## Skills System

Skills are reusable capabilities that agents can use.

### Defining a Skill

Create a skill in `src/skills/`:

```typescript
import type { Skill } from "./types/skill.js";

export const codeReview: Skill = {
  id: "code-review",
  name: "Code Review",
  description: "Reviews code for quality, security, and best practices",
  parameters: {
    code: z.string(),
    language: z.enum(["typescript", "python", "javascript"]),
  },
  execute: async ({ code, language }, context) => {
    // Implementation
    return {
      issues: [],
      suggestions: [],
      approval: true,
    };
  },
};
```

### Using Skills in Agents

Agents can be configured with specific skills:

```typescript
const frontendDeveloper: Agent = {
  // ... other properties
  skills: [
    "code-review",
    "component-creation",
    "styling",
    "testing",
  ],
};
```

### Available Skills

See the [skills/](skills/) directory for available skills:

- `code-review.md` - Review code for quality and security
- `planning.md` - Break down tasks into actionable steps
- `documentation.md` - Generate and maintain documentation
- `testing.md` - Write and run tests

## Communication Between Agents

Agents communicate through the orchestrator:

```typescript
// CEO delegates task to Frontend Developer
await orchestrator.sendMessage({
  from: "ceo",
  to: "frontend-developer",
  content: "Please implement the login component",
  contextProjectId: "project-123",
});
```

### Communication Styles

Each agent has a communication style defined in their SOUL.md:

- **formal**: Professional, structured, precise
- **casual**: Friendly, approachable, conversational
- **technical**: Precise, detailed, jargon-appropriate
- **friendly**: Warm, supportive, encouraging

## Example Workflow

```
1. Human: "Create a todo app"

2. CEO analyzes request
   └─ Creates project plan
   └─ Decomposes into tasks

3. CEO → Product Designer: "Design the todo app UI"
   └─ Designer creates wireframes, defines components

4. CEO → Frontend Developer: "Implement the UI"
   └─ Developer builds components

5. CEO → Backend Developer: "Create the API"
   └─ Developer builds endpoints, database

6. CEO: Integrate and test
   └─ Quality check, user testing

7. CEO → Human: "Todo app is ready!"
```

## Best Practices

1. **Keep Souls Focused**: Each soul should have a clear, single purpose
2. **Define Clear Boundaries**: What can/can't the agent do?
3. **Use Examples**: Provide example behaviors in SOUL.md
4. **Test Personalities**: Verify agents behave as expected
5. **Version Souls**: Track changes to agent personalities

## Extending the System

### Adding New Roles

1. Create SOUL.md
2. Define agent configuration
3. Register with orchestrator
4. Update hierarchy

### Custom Skills

1. Define skill in `src/skills/`
2. Implement execution logic
3. Add parameter validation
4. Document usage

### Custom Models

Agents can use different models:

```typescript
const agent: Agent = {
  // ...
  model: "claude-opus-4-6", // or "gpt-4", etc.
};
```

Choose based on:
- Task complexity
- Cost considerations
- Response time requirements
- Capability needs
