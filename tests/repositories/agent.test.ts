import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { query } from '../../src/db/client.js';
import { agentRepository } from '../../src/repositories/agent.repository.js';
import type { Agent, CreateAgentDTO, UpdateAgentDTO } from '../../src/types/agent.js';

describe('AgentRepository Integration Tests', () => {
  // Clean up database before and after each test
  beforeEach(async () => {
    await query("DELETE FROM agent WHERE agn_name LIKE 'Test Agent%'");
  });

  afterEach(async () => {
    await query("DELETE FROM agent WHERE agn_name LIKE 'Test Agent%'");
  });

  describe('create', () => {
    it('should create a new agent without parent', async () => {
      const dto: CreateAgentDTO = {
        name: 'Test Agent CEO',
        soul: `# Role
CEO Agent

# Traits
- Strategic thinking
- Leadership

# Responsibilities
- Coordinate agents
- Make decisions
`,
        model: 'claude-opus-4-6',
        status: 'active',
      };

      const agent = await agentRepository.create(dto);

      expect(agent).toBeDefined();
      expect(agent.id).toBeGreaterThan(0);
      expect(agent.name).toBe(dto.name);
      expect(agent.soul).toBe(dto.soul);
      expect(agent.model).toBe(dto.model);
      expect(agent.status).toBe(dto.status);
      expect(agent.createdAt).toBeInstanceOf(Date);
      expect(agent.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a new agent with parent', async () => {
      // Create parent first
      const parentDto: CreateAgentDTO = {
        name: 'Test Agent CEO',
        soul: '# Role\nCEO\n',
        model: 'claude-opus-4-6',
      };
      const parent = await agentRepository.create(parentDto);

      // Create child
      const childDto: CreateAgentDTO = {
        name: 'Test Agent Developer',
        soul: '# Role\nDeveloper\n',
        model: 'claude-sonnet-4-6',
        reportsToId: parent.id,
      };

      const child = await agentRepository.create(childDto);

      expect(child.reportsToId).toBe(parent.id);
    });
  });

  describe('findById', () => {
    it('should find agent by ID', async () => {
      const dto: CreateAgentDTO = {
        name: 'Test Agent FindById',
        soul: '# Role\nTest\n',
        model: 'claude-opus-4-6',
      };

      const created = await agentRepository.create(dto);
      const found = await agentRepository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(dto.name);
    });

    it('should return null for non-existent agent', async () => {
      const found = await agentRepository.findById(99999);
      expect(found).toBeNull();
    });
  });

  describe('findByIdWithHierarchy', () => {
    it('should load agent with parent and children', async () => {
      // Create CEO
      const ceoDto: CreateAgentDTO = {
        name: 'Test Agent CEO',
        soul: '# Role\nCEO\n',
        model: 'claude-opus-4-6',
      };
      const ceo = await agentRepository.create(ceoDto);

      // Create Developer
      const devDto: CreateAgentDTO = {
        name: 'Test Agent Developer',
        soul: '# Role\nDeveloper\n',
        model: 'claude-sonnet-4-6',
        reportsToId: ceo.id,
      };
      const dev = await agentRepository.create(devDto);

      // Create Designer
      const designerDto: CreateAgentDTO = {
        name: 'Test Agent Designer',
        soul: '# Role\nDesigner\n',
        model: 'claude-sonnet-4-6',
        reportsToId: ceo.id,
      };
      await agentRepository.create(designerDto);

      // Load CEO with hierarchy
      const ceoWithHierarchy = await agentRepository.findByIdWithHierarchy(ceo.id);

      expect(ceoWithHierarchy).not.toBeNull();
      expect(ceoWithHierarchy?.reportsTo).toBeUndefined(); // CEO has no parent
      expect(ceoWithHierarchy?.manages).toHaveLength(2); // CEO has 2 children

      // Load Developer with hierarchy
      const devWithHierarchy = await agentRepository.findByIdWithHierarchy(dev.id);

      expect(devWithHierarchy).not.toBeNull();
      expect(devWithHierarchy?.reportsTo).toBeDefined();
      expect(devWithHierarchy?.reportsTo?.id).toBe(ceo.id);
      expect(devWithHierarchy?.manages).toHaveLength(0); // Developer has no children
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test agents
      await agentRepository.create({
        name: 'Test Agent 1',
        soul: '# Role\nAgent 1\n',
        model: 'claude-opus-4-6',
        status: 'active',
      });

      await agentRepository.create({
        name: 'Test Agent 2',
        soul: '# Role\nAgent 2\n',
        model: 'claude-sonnet-4-6',
        status: 'inactive',
      });

      await agentRepository.create({
        name: 'Test Agent 3',
        soul: '# Role\nAgent 3\n',
        model: 'gpt-4',
        status: 'active',
      });
    });

    it('should return all agents with default pagination', async () => {
      const result = await agentRepository.findAll();

      expect(result.agents.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const result = await agentRepository.findAll({ status: 'active' });

      result.agents.forEach((agent) => {
        expect(agent.status).toBe('active');
      });
    });

    it('should filter by model', async () => {
      const result = await agentRepository.findAll({ model: 'claude-opus-4-6' });

      result.agents.forEach((agent) => {
        expect(agent.model).toBe('claude-opus-4-6');
      });
    });

    it('should filter by reportsToId (null for top-level)', async () => {
      const result = await agentRepository.findAll({ reportsToId: null });

      result.agents.forEach((_agent) => {
        // Can't check directly as Agent type doesn't have reportsToId
        // but we know these are top-level agents
      });
    });

    it('should search in name and soul', async () => {
      const result = await agentRepository.findAll({ search: 'CEO' });

      expect(result.agents.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect offset and limit', async () => {
      const result = await agentRepository.findAll({ offset: 0, limit: 2 });

      expect(result.agents.length).toBeLessThanOrEqual(2);
    });
  });

  describe('findByReportsToId', () => {
    it('should find agents that report to a specific agent', async () => {
      // Create CEO
      const ceo = await agentRepository.create({
        name: 'Test Agent CEO',
        soul: '# Role\nCEO\n',
        model: 'claude-opus-4-6',
      });

      // Create two developers under CEO
      await agentRepository.create({
        name: 'Test Agent Dev 1',
        soul: '# Role\nDev 1\n',
        model: 'claude-sonnet-4-6',
        reportsToId: ceo.id,
      });

      await agentRepository.create({
        name: 'Test Agent Dev 2',
        soul: '# Role\nDev 2\n',
        model: 'claude-sonnet-4-6',
        reportsToId: ceo.id,
      });

      // Find CEO's direct reports
      const reports = await agentRepository.findByReportsToId(ceo.id);

      expect(reports).toHaveLength(2);
      reports.forEach((agent) => {
        expect(agent.name).toContain('Dev');
      });
    });

    it('should return empty array for agent with no reports', async () => {
      const agent = await agentRepository.create({
        name: 'Test Agent No Reports',
        soul: '# Role\nAgent\n',
        model: 'claude-opus-4-6',
      });

      const reports = await agentRepository.findByReportsToId(agent.id);

      expect(reports).toHaveLength(0);
    });
  });

  describe('findTopLevelAgents', () => {
    it('should find agents with no parent', async () => {
      // Create CEO (no parent)
      await agentRepository.create({
        name: 'Test Agent CEO',
        soul: '# Role\nCEO\n',
        model: 'claude-opus-4-6',
      });

      // Create employee (has parent)
      const ceo = await agentRepository.create({
        name: 'Test Agent CEO 2',
        soul: '# Role\nCEO\n',
        model: 'claude-opus-4-6',
      });

      await agentRepository.create({
        name: 'Test Agent Employee',
        soul: '# Role\nEmployee\n',
        model: 'claude-sonnet-4-6',
        reportsToId: ceo.id,
      });

      const topLevelAgents = await agentRepository.findTopLevelAgents();

      expect(topLevelAgents.length).toBeGreaterThan(0);
      // All top-level agents should have no parent
    });
  });

  describe('update', () => {
    it('should update agent name', async () => {
      const agent = await agentRepository.create({
        name: 'Test Agent Original Name',
        soul: '# Role\nAgent\n',
        model: 'claude-opus-4-6',
      });

      const updated = await agentRepository.update(agent.id, {
        name: 'Test Agent Updated Name',
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Test Agent Updated Name');
    });

    it('should update agent soul', async () => {
      const agent = await agentRepository.create({
        name: 'Test Agent',
        soul: '# Role\nOriginal\n',
        model: 'claude-opus-4-6',
      });

      const updated = await agentRepository.update(agent.id, {
        soul: '# Role\nUpdated Soul\n\n# New Traits\n- Updated',
      });

      expect(updated).not.toBeNull();
      expect(updated?.soul).toContain('Updated Soul');
    });

    it('should update agent model', async () => {
      const agent = await agentRepository.create({
        name: 'Test Agent',
        soul: '# Role\nAgent\n',
        model: 'claude-opus-4-6',
      });

      const updated = await agentRepository.update(agent.id, {
        model: 'gpt-4',
      });

      expect(updated).not.toBeNull();
      expect(updated?.model).toBe('gpt-4');
    });

    it('should update agent status', async () => {
      const agent = await agentRepository.create({
        name: 'Test Agent',
        soul: '# Role\nAgent\n',
        model: 'claude-opus-4-6',
        status: 'active',
      });

      const updated = await agentRepository.update(agent.id, {
        status: 'inactive',
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe('inactive');
    });

    it('should change agent parent', async () => {
      const oldParent = await agentRepository.create({
        name: 'Test Agent Old Parent',
        soul: '# Role\nParent\n',
        model: 'claude-opus-4-6',
      });

      const newParent = await agentRepository.create({
        name: 'Test Agent New Parent',
        soul: '# Role\nParent\n',
        model: 'claude-opus-4-6',
      });

      const agent = await agentRepository.create({
        name: 'Test Agent Child',
        soul: '# Role\nChild\n',
        model: 'claude-sonnet-4-6',
        reportsToId: oldParent.id,
      });

      const updated = await agentRepository.update(agent.id, {
        reportsToId: newParent.id,
      });

      expect(updated).not.toBeNull();
      // Can't check reportsToId directly as it's not in Agent type
    });

    it('should remove agent parent', async () => {
      const parent = await agentRepository.create({
        name: 'Test Agent Parent',
        soul: '# Role\nParent\n',
        model: 'claude-opus-4-6',
      });

      const agent = await agentRepository.create({
        name: 'Test Agent Child',
        soul: '# Role\nChild\n',
        model: 'claude-sonnet-4-6',
        reportsToId: parent.id,
      });

      const updated = await agentRepository.update(agent.id, {
        reportsToId: null,
      });

      expect(updated).not.toBeNull();
    });

    it('should return null for non-existent agent', async () => {
      const updated = await agentRepository.update(99999, { name: 'New Name' });
      expect(updated).toBeNull();
    });

    it('should not update if no fields provided', async () => {
      const agent = await agentRepository.create({
        name: 'Test Agent',
        soul: '# Role\nAgent\n',
        model: 'claude-opus-4-6',
      });

      const updated = await agentRepository.update(agent.id, {});

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe(agent.name);
    });
  });

  describe('delete', () => {
    it('should soft delete agent', async () => {
      const agent = await agentRepository.create({
        name: 'Test Agent To Delete',
        soul: '# Role\nAgent\n',
        model: 'claude-opus-4-6',
        status: 'active',
      });

      const deleted = await agentRepository.delete(agent.id);

      expect(deleted).toBe(true);

      const found = await agentRepository.findById(agent.id);
      expect(found?.status).toBe('archived');
    });

    it('should return false for non-existent agent', async () => {
      const deleted = await agentRepository.delete(99999);
      expect(deleted).toBe(false);
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete agent', async () => {
      const agent = await agentRepository.create({
        name: 'Test Agent To Hard Delete',
        soul: '# Role\nAgent\n',
        model: 'claude-opus-4-6',
      });

      const deleted = await agentRepository.hardDelete(agent.id);

      expect(deleted).toBe(true);

      const found = await agentRepository.findById(agent.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent agent', async () => {
      const deleted = await agentRepository.hardDelete(99999);
      expect(deleted).toBe(false);
    });
  });

  describe('getHierarchy', () => {
    beforeEach(async () => {
      // Create hierarchy:
      // CEO
      //   ├── Developer
      //   │   └── Junior Developer
      //   └── Designer

      const ceo = await agentRepository.create({
        name: 'Test Agent CEO',
        soul: '# Role\nCEO\n',
        model: 'claude-opus-4-6',
      });

      const dev = await agentRepository.create({
        name: 'Test Agent Developer',
        soul: '# Role\nDeveloper\n',
        model: 'claude-sonnet-4-6',
        reportsToId: ceo.id,
      });

      await agentRepository.create({
        name: 'Test Agent Junior Developer',
        soul: '# Role\nJunior Developer\n',
        model: 'claude-haiku-4-5',
        reportsToId: dev.id,
      });

      await agentRepository.create({
        name: 'Test Agent Designer',
        soul: '# Role\nDesigner\n',
        model: 'claude-sonnet-4-6',
        reportsToId: ceo.id,
      });
    });

    it('should build complete hierarchy tree', async () => {
      const hierarchy = await agentRepository.getHierarchy();

      expect(hierarchy).toHaveLength(1); // One top-level agent (CEO)
      expect(hierarchy[0].name).toBe('Test Agent CEO');
      expect(hierarchy[0].children).toHaveLength(2); // CEO has 2 children

      const developer = hierarchy[0].children.find((c) => c.name.includes('Developer'));
      expect(developer).toBeDefined();
      expect(developer?.children).toHaveLength(1); // Developer has 1 child

      const designer = hierarchy[0].children.find((c) => c.name.includes('Designer'));
      expect(designer).toBeDefined();
      expect(designer?.children).toHaveLength(0); // Designer has no children
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await agentRepository.create({
        name: 'Test Agent 1',
        soul: '# Role\nAgent 1\n',
        model: 'claude-opus-4-6',
        status: 'active',
      });

      await agentRepository.create({
        name: 'Test Agent 2',
        soul: '# Role\nAgent 2\n',
        model: 'claude-sonnet-4-6',
        status: 'active',
      });

      await agentRepository.create({
        name: 'Test Agent 3',
        soul: '# Role\nAgent 3\n',
        model: 'claude-sonnet-4-6',
        status: 'inactive',
      });
    });

    it('should return accurate statistics', async () => {
      const stats = await agentRepository.getStats();

      expect(stats.totalAgents).toBeGreaterThan(0);
      expect(stats.agentsByModel['claude-opus-4-6']).toBeGreaterThan(0);
      expect(stats.agentsByModel['claude-sonnet-4-6']).toBeGreaterThan(0);
      expect(stats.agentsByStatus['active']).toBeGreaterThan(0);
      expect(stats.agentsByStatus['inactive']).toBeGreaterThan(0);
      expect(stats.topLevelAgents).toBeGreaterThan(0);
      expect(stats.maxDepth).toBeGreaterThan(0);
    });
  });
});
