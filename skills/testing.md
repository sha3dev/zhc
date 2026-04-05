# Testing Skill

**Purpose**: Write comprehensive tests for code and validate functionality.

## When to Use

An agent should use this skill when:
- Implementing new features
- Fixing bugs (regression tests)
- Refactoring code
- Validating edge cases

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Code to test |
| `language` | string | Yes | Programming language |
| `testType` | string | No | "unit" | "integration" | "e2e" |
| `framework` | string | No | Testing framework (defaults to project standard) |

## Output

```typescript
{
  "testFile": string,  // Path to test file
  "tests": Array<{
    "description": string,
    "code": string,
    "covers": string[],  // What this tests
  }>,
  "setup": string,  // Setup code
  "mocks": string,  // Required mocks
  "coverage": {
    "statements": number,
    "branches": number,
    "functions": number,
    "lines": number
  }
}
```

## Examples

### Example 1: Unit Test

**Input**:
```typescript
function add(a: number, b: number): number {
  return a + b;
}
```

**Output**:
```typescript
// tests/unit/math.test.ts
import { describe, it, expect } from "vitest";
import { add } from "../../src/utils/math";

describe("add", () => {
  it("should add two positive numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("should handle negative numbers", () => {
    expect(add(-2, 3)).toBe(1);
  });

  it("should handle zero", () => {
    expect(add(0, 5)).toBe(5);
  });

  it("should handle decimals", () => {
    expect(add(0.1, 0.2)).toBeCloseTo(0.3, 2);
  });
});
```

### Example 2: Integration Test

**Input**:
```typescript
async function createUser(data: UserData) {
  const user = await db.users.create(data);
  await emailService.sendWelcome(user.email);
  return user;
}
```

**Output**:
```typescript
// tests/integration/user-creation.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createUser } from "../../src/services/user";

describe("createUser", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it("should create user and send welcome email", async () => {
    const data = { email: "test@example.com", name: "Test User" };
    const user = await createUser(data);

    expect(user).toBeDefined();
    expect(user.email).toBe(data.email);

    const emails = await getSentEmails();
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe(data.email);
  });
});
```

## Testing Best Practices

### 1. Test Structure (AAA)

```typescript
it("should do something", () => {
  // Arrange
  const input = { value: 42 };

  // Act
  const result = functionUnderTest(input);

  // Assert
  expect(result).toBe(expected);
});
```

### 2. Test Naming

- Use "should" convention
- Be descriptive about behavior
- Test one thing per test

```typescript
// Good
it("should return error when email is invalid", () => {});

// Bad
it("test", () => {});
it("works", () => {});
```

### 3. Test Coverage

- Aim for >80% coverage
- Focus on critical paths
- Test edge cases
- Test error conditions

### 4. Avoid Test Indirection

```typescript
// Bad - hard to debug
const result = runComplexTestSetup();
expect(result).toBe(true);

// Good - clear expectations
const user = createUser({ email: "test@test.com" });
expect(user.email).toBe("test@test.com");
```

## Edge Cases to Test

1. **Inputs**: null, undefined, empty string, zero, negative numbers
2. **Boundaries**: min/max values, array limits
3. **Errors**: network failures, invalid data, timeouts
4. **Concurrency**: race conditions, parallel requests
5. **State**: before/after, side effects

## Testing Checklist

- [ ] Happy path works
- [ ] Error cases are handled
- [ ] Edge cases covered
- [ ] Async code tested
- [ ] Mocks are accurate
- [ ] Tests are isolated
- [ ] Tests are fast
- [ ] Descriptive names used

## Related Skills

- [code-review.md](code-review.md) - Review test quality
- [planning.md](planning.md) - Plan test strategy
