import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentKind, AgentModel } from './agent.js';

export interface DefaultAgentDefinition {
  description: string;
  isCeo: boolean;
  kind: AgentKind;
  key: string;
  model: AgentModel | null;
  name: string;
  subagentMd: string;
}

const subagentsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../harness/subagents',
);

interface Frontmatter {
  description: string;
  model: AgentModel | null;
  name: string;
}

function parseFrontmatter(
  content: string,
  filename: string,
): { body: string; frontmatter: Frontmatter } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    throw new Error(`Invalid subagent format in ${filename}: missing --- frontmatter block`);
  }

  const fields: Record<string, string> = {};
  for (const line of match[1]!.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      fields[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }

  const name = fields['name'];
  if (!name) {
    throw new Error(`Subagent file ${filename} is missing the 'name' field in frontmatter`);
  }

  const description = fields['description'] ?? '';
  const rawModel = fields['model'];
  const model = rawModel && rawModel.length > 0 ? rawModel : null;

  return {
    body: match[2]!.trim(),
    frontmatter: { description, model, name },
  };
}

function loadSubagents(): DefaultAgentDefinition[] {
  const files = readdirSync(subagentsDir).filter((f) => f.endsWith('.md'));

  return files.map((filename) => {
    const content = readFileSync(resolve(subagentsDir, filename), 'utf-8');
    const { body, frontmatter } = parseFrontmatter(content, filename);

    return {
      description: frontmatter.description,
      isCeo: frontmatter.name === 'CEO',
      kind: frontmatter.name === 'CEO' ? 'ceo' : 'specialist',
      key: filename.replace(/\.md$/i, ''),
      model: frontmatter.model,
      name: frontmatter.name,
      subagentMd: body,
    };
  });
}

// Exported for tests that need the list of names/count without loading FS
export const defaultAgentNames = [
  'CEO',
  'Product Designer',
  'Frontend Engineer',
  'Backend Engineer',
  'QA Engineer',
  'DevOps Engineer',
];

export function getDefaultAgentsWithDefinitions(): DefaultAgentDefinition[] {
  return loadSubagents();
}
