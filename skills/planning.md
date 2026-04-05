# Planning Skill

**Purpose**: Break down complex tasks into actionable steps.

## When to Use

An agent should use this skill when:
- Starting a new project
- Decomposing user requests
- Creating project roadmaps
- Estimating effort and dependencies

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `goal` | string | Yes | The objective to achieve |
| `context` | string | No | Additional context or constraints |
| `constraints` | string[] | No | Technical or resource limitations |

## Output

```typescript
{
  "tasks": Array<{
    "id": string,
    "description": string,
    "priority": "high" | "medium" | "low",
    "estimatedEffort": string,
    "dependencies": string[],
    "assignedTo": string
  }>,
  "timeline": {
    "start": Date,
    "milestones": Array<{ date: Date, description: string }>,
    "completion": Date
  },
  "risks": Array<{ description: string, mitigation: string }>
}
```

## Examples

### Example 1: Web Feature

**Input**:
```json
{
  "goal": "Add user authentication",
  "context": "Using JWT, need login/register/logout"
}
```

**Output**:
```json
{
  "tasks": [
    {
      "id": "auth-1",
      "description": "Design authentication flow",
      "priority": "high",
      "estimatedEffort": "2 hours",
      "dependencies": [],
      "assignedTo": "product-designer"
    },
    {
      "id": "auth-2",
      "description": "Create database schema",
      "priority": "high",
      "estimatedEffort": "1 hour",
      "dependencies": ["auth-1"],
      "assignedTo": "backend-developer"
    },
    {
      "id": "auth-3",
      "description": "Implement JWT endpoints",
      "priority": "high",
      "estimatedEffort": "4 hours",
      "dependencies": ["auth-2"],
      "assignedTo": "backend-developer"
    },
    {
      "id": "auth-4",
      "description": "Build login form UI",
      "priority": "medium",
      "estimatedEffort": "3 hours",
      "dependencies": ["auth-1"],
      "assignedTo": "frontend-developer"
    }
  ],
  "timeline": {
    "start": "2026-04-03",
    "milestones": [
      { "date": "2026-04-04", "description": "Design complete" },
      { "date": "2026-04-05", "description": "Backend API ready" },
      { "date": "2026-04-06", "description": "Feature complete" }
    ],
    "completion": "2026-04-06"
  },
  "risks": [
    {
      "description": "JWT secret management",
      "mitigation": "Use environment variables, rotate keys"
    }
  ]
}
```

## Best Practices

1. Start with high-level decomposition
2. Identify dependencies early
3. Consider parallel work opportunities
4. Include buffer time for unknowns
5. Define clear acceptance criteria
6. Plan for testing and documentation
7. Consider maintainability and scalability

## Planning Heuristics

- Break tasks into < 4 hour units
- Each task should have a clear owner
- Dependencies should form a DAG (no cycles)
- High-priority tasks should have no dependencies where possible
- Include validation/verification tasks

## Related Skills

- [code-review.md](code-review.md) - Review implementation against plan
- [documentation.md](documentation.md) - Document the plan
