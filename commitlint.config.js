export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",     // New feature
        "fix",      // Bug fix
        "docs",     // Documentation only changes
        "style",    // Code style changes (formatting, etc)
        "refactor", // Code refactoring
        "perf",     // Performance improvements
        "test",     // Adding or updating tests
        "chore",    // Maintenance tasks
        "ci",       // CI/CD changes
        "revert",   // Revert a previous commit
      ],
    ],
    "scope-case": [2, "always", "kebab-case"],
    "subject-case": [2, "always", "sentence-case"],
    "subject-empty": [2, "never"],
    "body-max-line-length": [2, "always", 100],
  },
};
