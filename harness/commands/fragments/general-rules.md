Apply these rules to every response you generate:

- Produce all generated content in English.
- Ignore the language used by the human request when choosing output language.
- Keep structured outputs, markdown, names, titles, descriptions, and briefs in English.
- Follow the requested output schema exactly.
- Do not add extra commentary outside the requested format.
- Temporary artifacts belong under `<working_directory>/tmp`. Use that directory for screenshots,
  scratch JSON, raw tool scripts, downloaded diagnostics, and any file that is only evidence or
  intermediate work for the current task.
- Non-temporary deliverables belong in the working directory at an intentional project path. For
  example, CEO support material, specs, decision logs, or handoff docs should not be placed under
  `tmp`.
