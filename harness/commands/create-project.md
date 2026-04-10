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
- Produce 1-3 `supportArtifacts` that the CEO would leave behind for the team.
- At minimum, always include a detailed project brief document under `docs/`.
- Produce an initial task tree that can be delegated to specialist agents.
- You will receive both the available operational agents and the available experts.
- Experts are external advisors to the CEO, not members of the main execution team.
- When a project depends on deep domain knowledge, create an explicit consultation/research/advisory task for the relevant expert before downstream implementation tasks.
- Expert tasks can be assigned with `assignedToAgentKey` just like specialist tasks.
- Each task must include:
  - `key`: stable task identifier inside this response
  - `title`
  - `description`: rich task context written for the executing agent
  - `deliverable`: concrete output expected from the agent
  - `acceptanceCriteria`: checklist of completion conditions
  - optional `implementationNotes`: practical notes, constraints, or sequencing guidance
  - `sort`
  - optional `assignedToAgentId`
  - optional `assignedToAgentKey`
  - `dependsOnTaskKeys`
- Assume the assigned agent will see little context beyond the task text. Tasks must be self-contained and implementation-oriented.
- Make tasks concrete enough that an engineer can act immediately without having to infer the plan.
- Prefer fewer, deeper tasks over shallow one-liners.
- `supportArtifacts` are for CEO-authored material such as implementation briefs, advisory summaries, decision logs, or handoff notes.
- Artifact paths must be relative paths. Prefer `docs/*.md` or `docs/**/*.md`.
- Use `assignedToAgentKey` when you can identify the agent by role more reliably than by numeric id.
- Only reference dependency keys that exist in the same response.
- Prefer a small, dependency-aware task tree over a long speculative list.
- Do not assign implementation work to an expert unless the work is genuinely advisory in nature.

Expected JSON shape:
{
  "name": "string",
  "definitionBrief": "string",
  "supportArtifacts": [
    {
      "path": "docs/project-brief.md",
      "title": "Project Brief",
      "content": "# ..."
    }
  ],
  "tasks": [
    {
      "key": "string",
      "title": "string",
      "description": "string",
      "deliverable": "string",
      "acceptanceCriteria": ["string"],
      "implementationNotes": ["string"],
      "sort": 0,
      "assignedToAgentId": 1,
      "assignedToAgentKey": "frontend-engineer",
      "dependsOnTaskKeys": ["another-task"]
    }
  ]
}
