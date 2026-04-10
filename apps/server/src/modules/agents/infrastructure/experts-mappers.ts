import type {
  Expert,
  ExpertRecord,
  ExpertSummary,
  RegistryEntityMemorySummary,
  RuntimeActor,
} from '../domain/expert.js';
import { extractRoleFromDefinition } from './mappers.js';

export function toExpert(record: ExpertRecord): Expert {
  return {
    createdAt: record.exp_created_at,
    id: record.exp_id,
    key: record.exp_key,
    name: record.exp_name,
    subagentMd: record.exp_subagent_md,
    updatedAt: record.exp_updated_at,
  };
}

export function toExpertSummary(expert: Expert): ExpertSummary {
  return {
    id: expert.id,
    key: expert.key,
    name: expert.name,
  };
}

export function toExpertMemorySummary(
  expert: Expert,
  ceo: RuntimeActor | null,
): RegistryEntityMemorySummary {
  return {
    id: expert.id,
    isCeo: false,
    key: expert.key,
    kind: 'expert',
    model: ceo?.model ?? null,
    modelCliId: ceo?.modelCliId ?? null,
    name: expert.name,
    role: extractRoleFromDefinition(expert.subagentMd),
    status: ceo?.status ?? 'not_ready',
  };
}

export function toExpertRuntimeActor(expert: Expert, ceo: RuntimeActor | null): RuntimeActor {
  return {
    id: expert.id,
    isCeo: false,
    key: expert.key,
    kind: 'expert',
    model: ceo?.model ?? null,
    modelCliId: ceo?.modelCliId ?? null,
    name: expert.name,
    status: ceo?.status ?? 'not_ready',
    subagentMd: expert.subagentMd,
  };
}
