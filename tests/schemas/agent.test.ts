import { describe, expect, it } from 'vitest';
import {
  AgentEntitySchema,
  AgentModelSchema,
  AgentQueryParamsSchema,
  AgentResponseDTOSchema,
  AgentStatusSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
} from '../../src/schemas/agent.js';
import type { CreateAgentDTO, UpdateAgentDTO } from '../../src/types/agent.js';

describe('Agent Schemas', () => {
  describe('AgentModelSchema', () => {
    it('should accept valid Claude models', () => {
      expect(() => AgentModelSchema.parse('claude-opus-4-6')).not.toThrow();
      expect(() => AgentModelSchema.parse('claude-sonnet-4-6')).not.toThrow();
      expect(() => AgentModelSchema.parse('claude-haiku-4-5')).not.toThrow();
    });

    it('should accept valid GPT models', () => {
      expect(() => AgentModelSchema.parse('gpt-4')).not.toThrow();
      expect(() => AgentModelSchema.parse('gpt-4-turbo')).not.toThrow();
      expect(() => AgentModelSchema.parse('gpt-4o')).not.toThrow();
    });

    it('should accept valid O1 models', () => {
      expect(() => AgentModelSchema.parse('o1-preview')).not.toThrow();
      expect(() => AgentModelSchema.parse('o1-mini')).not.toThrow();
    });

    it('should reject invalid models', () => {
      expect(() => AgentModelSchema.parse('invalid-model')).toThrow();
      expect(() => AgentModelSchema.parse('gpt-3')).toThrow();
      expect(() => AgentModelSchema.parse('claude-2')).toThrow();
    });
  });

  describe('AgentStatusSchema', () => {
    it('should accept valid status values', () => {
      expect(() => AgentStatusSchema.parse('active')).not.toThrow();
      expect(() => AgentStatusSchema.parse('inactive')).not.toThrow();
      expect(() => AgentStatusSchema.parse('archived')).not.toThrow();
    });

    it('should reject invalid status values', () => {
      expect(() => AgentStatusSchema.parse('deleted')).toThrow();
      expect(() => AgentStatusSchema.parse('pending')).toThrow();
    });
  });

  describe('CreateAgentSchema', () => {
    const validSoul = `# Role
CEO Agent

# Traits
- Strategic thinker
- Decisive leader
- Excellent communicator

# Responsibilities
- Coordinate specialist agents
- Make strategic decisions
- Report to human user
`;

    it('should accept valid agent creation data', () => {
      const data: CreateAgentDTO = {
        name: 'CEO Agent',
        soul: validSoul,
        model: 'claude-opus-4-6',
        reportsToId: undefined,
        status: 'active',
      };

      expect(() => CreateAgentSchema.parse(data)).not.toThrow();
    });

    it('should require name', () => {
      const data = {
        soul: validSoul,
        model: 'claude-opus-4-6' as const,
      };

      const result = CreateAgentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const data = {
        name: '',
        soul: validSoul,
        model: 'claude-opus-4-6' as const,
      };

      const result = CreateAgentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject name that is too long', () => {
      const data = {
        name: 'a'.repeat(256),
        soul: validSoul,
        model: 'claude-opus-4-6' as const,
      };

      const result = CreateAgentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid characters in name', () => {
      const data = {
        name: 'Agent@#$',
        soul: validSoul,
        model: 'claude-opus-4-6' as const,
      };

      const result = CreateAgentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require soul with minimum length', () => {
      const data = {
        name: 'CEO Agent',
        soul: 'a'.repeat(49),
        model: 'claude-opus-4-6' as const,
      };

      const result = CreateAgentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject soul that is too long', () => {
      const data = {
        name: 'CEO Agent',
        soul: 'a'.repeat(100001),
        model: 'claude-opus-4-6' as const,
      };

      const result = CreateAgentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require valid model', () => {
      const data = {
        name: 'CEO Agent',
        soul: validSoul,
        model: 'invalid-model',
      };

      const result = CreateAgentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept agent without parent', () => {
      const data = {
        name: 'CEO Agent',
        soul: validSoul,
        model: 'claude-opus-4-6' as const,
      };

      const result = CreateAgentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reportsToId).toBeUndefined();
      }
    });

    it('should accept agent with parent', () => {
      const data = {
        name: 'Developer Agent',
        soul: validSoul,
        model: 'claude-sonnet-4-6' as const,
        reportsToId: 1,
      };

      const result = CreateAgentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reportsToId).toBe(1);
      }
    });
  });

  describe('UpdateAgentSchema', () => {
    const validSoul = `# Role
Developer Agent

# Skills
- TypeScript
- Testing
`;

    it('should accept partial update with name only', () => {
      const data: UpdateAgentDTO = {
        name: 'Updated Name',
      };

      const result = UpdateAgentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept partial update with soul only', () => {
      const data: UpdateAgentDTO = {
        soul: validSoul,
      };

      const result = UpdateAgentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept partial update with model only', () => {
      const data: UpdateAgentDTO = {
        model: 'gpt-4o',
      };

      const result = UpdateAgentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept update removing parent', () => {
      const data: UpdateAgentDTO = {
        reportsToId: null,
      };

      const result = UpdateAgentSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reportsToId).toBeNull();
      }
    });

    it('should reject empty update object', () => {
      const data: UpdateAgentDTO = {};

      const result = UpdateAgentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept multiple field updates', () => {
      const data: UpdateAgentDTO = {
        name: 'Updated Agent',
        soul: validSoul,
        model: 'gpt-4o',
        status: 'inactive',
      };

      const result = UpdateAgentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('AgentQueryParamsSchema', () => {
    it('should accept empty query params', () => {
      const data = {};

      const result = AgentQueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(0);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept status filter', () => {
      const data = { status: 'active' as const };

      const result = AgentQueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept model filter', () => {
      const data = { model: 'claude-opus-4-6' as const };

      const result = AgentQueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept reportsToId filter', () => {
      const data = { reportsToId: '1' };

      const result = AgentQueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reportsToId).toBe(1);
      }
    });

    it('should accept null reportsToId filter', () => {
      const data = { reportsToId: 'null' };

      const result = AgentQueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reportsToId).toBeNull();
      }
    });

    it('should accept search term', () => {
      const data = { search: 'CEO' };

      const result = AgentQueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept pagination parameters', () => {
      const data = { offset: '10', limit: '50' };

      const result = AgentQueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(10);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should enforce default pagination values', () => {
      const data = {};

      const result = AgentQueryParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(0);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject negative offset', () => {
      const data = { offset: '-1' };

      const result = AgentQueryParamsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const data = { limit: '101' };

      const result = AgentQueryParamsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('AgentEntitySchema', () => {
    it('should accept valid database entity', () => {
      const entity = {
        agn_id: 1,
        agn_name: 'CEO Agent',
        agn_soul: '# Role\nCEO\n',
        agn_model: 'claude-opus-4-6' as const,
        agn_reports_to_agn_id: null,
        agn_status: 'active' as const,
        agn_created_at: new Date(),
        agn_updated_at: new Date(),
      };

      expect(() => AgentEntitySchema.parse(entity)).not.toThrow();
    });

    it('should accept entity with parent', () => {
      const entity = {
        agn_id: 2,
        agn_name: 'Developer Agent',
        agn_soul: '# Role\nDeveloper\n',
        agn_model: 'claude-sonnet-4-6' as const,
        agn_reports_to_agn_id: 1,
        agn_status: 'active' as const,
        agn_created_at: new Date(),
        agn_updated_at: new Date(),
      };

      expect(() => AgentEntitySchema.parse(entity)).not.toThrow();
    });

    it('should coerce date strings to Date objects', () => {
      const entity = {
        agn_id: 1,
        agn_name: 'CEO Agent',
        agn_soul: '# Role\nCEO\n',
        agn_model: 'claude-opus-4-6' as const,
        agn_reports_to_agn_id: null,
        agn_status: 'active' as const,
        agn_created_at: '2024-01-01T00:00:00Z',
        agn_updated_at: '2024-01-01T00:00:00Z',
      };

      const result = AgentEntitySchema.safeParse(entity);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agn_created_at).toBeInstanceOf(Date);
        expect(result.data.agn_updated_at).toBeInstanceOf(Date);
      }
    });
  });

  describe('AgentResponseDTOSchema', () => {
    it('should accept valid response DTO', () => {
      const dto = {
        id: 1,
        name: 'CEO Agent',
        soul: '# Role\nCEO\n',
        model: 'claude-opus-4-6' as const,
        reportsToId: null,
        reportsToName: null,
        managesIds: [2, 3, 4],
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => AgentResponseDTOSchema.parse(dto)).not.toThrow();
    });

    it('should accept response DTO with parent', () => {
      const dto = {
        id: 2,
        name: 'Developer Agent',
        soul: '# Role\nDeveloper\n',
        model: 'claude-sonnet-4-6' as const,
        reportsToId: 1,
        reportsToName: 'CEO Agent',
        managesIds: [],
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => AgentResponseDTOSchema.parse(dto)).not.toThrow();
    });
  });
});
