# Code Review Skill

**Purpose**: Review code for quality, security, and best practices.

## When to Use

An agent should use this skill when:
- Reviewing pull requests
- Analyzing code before integration
- Providing feedback on code quality
- Checking for security vulnerabilities

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | The code to review |
| `language` | string | Yes | Programming language |
| `focus` | string[] | No | Areas to focus on (security, performance, style, etc.) |

## Output

```typescript
{
  "overall": "approve" | "request-changes" | "comment",
  "issues": Array<{
    "severity": "error" | "warning" | "info",
    "line": number,
    "message": string,
    "suggestion": string
  }>,
  "summary": string,
  "approved": boolean
}
```

## Examples

### Example 1: Basic Review

**Input**:
```typescript
const code = `
function add(a, b) {
  return a + b
}
`;
```

**Output**:
```json
{
  "overall": "approve",
  "issues": [],
  "summary": "Code is clean and follows best practices.",
  "approved": true
}
```

### Example 2: Security Issue

**Input**:
```typescript
const code = `
const userInput = req.body.user;
eval(userInput);
`;
```

**Output**:
```json
{
  "overall": "request-changes",
  "issues": [
    {
      "severity": "error",
      "line": 2,
      "message": "Use of eval() is dangerous",
      "suggestion": "Use a safe alternative or validate input"
    }
  ],
  "summary": "Critical security vulnerability found.",
  "approved": false
}
```

## Best Practices

1. Check for common vulnerabilities (OWASP Top 10)
2. Verify error handling
3. Look for performance issues
4. Check for code consistency
5. Validate naming conventions
6. Ensure proper type usage
7. Check for unnecessary complexity

## Related Skills

- [testing.md](testing.md) - Test coverage validation
- [documentation.md](documentation.md) - Code documentation standards
