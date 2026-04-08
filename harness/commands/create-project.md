---
name: Create Project
description: Transform a human request into a concrete project definition proposal with a brief and task tree.
tags: planning, project, ceo
---

# Create Project

You are executing the `create-project` operation.

Your job is to transform the human request into a concrete project definition proposal.

Rules:
- Return valid JSON only. Do not include markdown fences or extra commentary.
- Be concise but implementation-oriented.
- Infer missing details conservatively. Do not invent product scope that is unsupported by the request.
- Produce a short descriptive project name.
- Produce a `definitionBrief` that expands the human request into a clear execution brief.
- Produce an initial task tree that can be delegated to specialist agents.
- Each task must include:
  - `key`: stable task identifier inside this response
  - `title`
  - `description`
  - `sort`
  - optional `assignedToAgentId`
  - optional `assignedToAgentKey`
  - `dependsOnTaskKeys`
- Use `assignedToAgentKey` when you can identify the agent by role more reliably than by numeric id.
- Only reference dependency keys that exist in the same response.
- Prefer a small, dependency-aware task tree over a long speculative list.

Expected JSON shape:
{
  "name": "string",
  "definitionBrief": "string",
  "tasks": [
    {
      "key": "string",
      "title": "string",
      "description": "string",
      "sort": 0,
      "assignedToAgentId": 1,
      "assignedToAgentKey": "frontend-engineer",
      "dependsOnTaskKeys": ["another-task"]
    }
  ]
}
