import { describe, expect, it } from 'vitest';
import {
  columnNames,
  getColumnName,
  getForeignKeyColumn,
  getForeignKeyConstraintName,
  getIndexName,
  getPrimaryKeyColumn,
  getTablePrefix,
  getTimestampColumn,
  getUniqueConstraintName,
  validateColumnName,
  validateTableName,
} from '../../src/shared/db/naming.js';

describe('Database Naming Utilities', () => {
  describe('getTablePrefix', () => {
    it('should return registered prefix for agent', () => {
      expect(getTablePrefix('agent')).toBe('agn');
    });

    it('should return registered prefix for project', () => {
      expect(getTablePrefix('project')).toBe('prj');
    });

    it('should return registered prefix for agent_skill', () => {
      expect(getTablePrefix('agent_skill')).toBe('ask');
    });

    it('should generate prefix from first 3 letters for unregistered tables', () => {
      expect(getTablePrefix('conversation')).toBe('cnv');
    });

    it('should handle multi-word tables', () => {
      const prefix = getTablePrefix('agent_skill');
      expect(prefix).toBe('ask');
      expect(prefix.length).toBe(3);
    });
  });

  describe('getColumnName', () => {
    it('should generate column name with prefix', () => {
      expect(getColumnName('agent', 'id')).toBe('agn_id');
      expect(getColumnName('agent', 'name')).toBe('agn_name');
      expect(getColumnName('project', 'description')).toBe('prj_description');
    });

    it('should handle snake_case column names', () => {
      expect(getColumnName('agent', 'created_at')).toBe('agn_created_at');
      expect(getColumnName('project', 'updated_at')).toBe('prj_updated_at');
    });
  });

  describe('getPrimaryKeyColumn', () => {
    it('should generate primary key column name', () => {
      expect(getPrimaryKeyColumn('agent')).toBe('agn_id');
      expect(getPrimaryKeyColumn('project')).toBe('prj_id');
      expect(getPrimaryKeyColumn('task')).toBe('tsk_id');
    });
  });

  describe('getForeignKeyColumn', () => {
    it('should generate foreign key column without relationship name', () => {
      expect(getForeignKeyColumn('task', 'project')).toBe('tsk_prj_id');
      expect(getForeignKeyColumn('task', 'agent')).toBe('tsk_agn_id');
    });

    it('should generate foreign key column with relationship name', () => {
      expect(getForeignKeyColumn('task', 'agent', 'assigned_to')).toBe('tsk_assigned_to_agn_id');
      expect(getForeignKeyColumn('project', 'agent', 'created_by')).toBe('prj_created_by_agn_id');
    });
  });

  describe('getTimestampColumn', () => {
    it('should generate timestamp column names', () => {
      expect(getTimestampColumn('agent', 'created_at')).toBe('agn_created_at');
      expect(getTimestampColumn('agent', 'updated_at')).toBe('agn_updated_at');
      expect(getTimestampColumn('project', 'created_at')).toBe('prj_created_at');
    });
  });

  describe('getIndexName', () => {
    it('should generate index name for single column', () => {
      expect(getIndexName('agent', ['agn_name'])).toBe('idx_agent_agn_name');
    });

    it('should generate index name for multiple columns', () => {
      expect(getIndexName('task', ['tsk_prj_id', 'tsk_status'])).toBe(
        'idx_task_tsk_prj_id_tsk_status',
      );
    });
  });

  describe('getUniqueConstraintName', () => {
    it('should generate unique constraint name', () => {
      expect(getUniqueConstraintName('agent', ['agn_email'])).toBe('uq_agent_agn_email');
      expect(getUniqueConstraintName('project_member', ['pmm_prj_id', 'pmm_agn_id'])).toBe(
        'uq_project_member_pmm_prj_id_pmm_agn_id',
      );
    });
  });

  describe('getForeignKeyConstraintName', () => {
    it('should generate foreign key constraint name', () => {
      expect(getForeignKeyConstraintName('task', 'tsk_prj_id')).toBe('fk_task_tsk_prj_id');
      expect(getForeignKeyConstraintName('project', 'prj_created_by_agn_id')).toBe(
        'fk_project_prj_created_by_agn_id',
      );
    });
  });

  describe('columnNames', () => {
    it('should create column name proxy', () => {
      const agent = columnNames<{ id: string; name: string; createdAt: string }>('agent');

      expect(agent.id).toBe('agn_id');
      expect(agent.name).toBe('agn_name');
      expect(agent.createdAt).toBe('agn_created_at');
    });

    it('should work with different tables', () => {
      const task = columnNames<{ id: string; projectId: string; assignedToAgnId: string }>('task');

      expect(task.id).toBe('tsk_id');
      expect(task.projectId).toBe('tsk_prj_id');
      expect(task.assignedToAgnId).toBe('tsk_assigned_to_agn_id');
    });
  });

  describe('validateTableName', () => {
    it('should validate correct table names', () => {
      expect(validateTableName('agent')).toBe(true);
      expect(validateTableName('project')).toBe(true);
      expect(validateTableName('agent_skill')).toBe(true);
    });

    it('should reject uppercase table names', () => {
      expect(() => validateTableName('Agent')).toThrowError('must be lowercase');
      expect(() => validateTableName('AGENT')).toThrowError('must be lowercase');
    });

    it('should reject invalid characters', () => {
      expect(() => validateTableName('agent-name')).toThrow();
      expect(() => validateTableName('agent.name')).toThrow();
    });

    it('should warn about plural table names', () => {
      // This should warn but not throw
      expect(() => validateTableName('agents')).not.toThrow();
    });
  });

  describe('validateColumnName', () => {
    it('should validate correct column names', () => {
      expect(validateColumnName('agent', 'agn_id')).toBe(true);
      expect(validateColumnName('agent', 'agn_name')).toBe(true);
      expect(validateColumnName('project', 'prj_description')).toBe(true);
    });

    it('should reject uppercase column names', () => {
      expect(() => validateColumnName('agent', 'AGN_ID')).toThrowError('must be lowercase');
      expect(() => validateColumnName('agent', 'Agn_Id')).toThrowError('must be lowercase');
    });

    it('should reject columns without correct prefix', () => {
      expect(() => validateColumnName('agent', 'agent_id')).toThrowError(
        "must use table prefix 'agn_'",
      );
      expect(() => validateColumnName('project', 'proj_name')).toThrowError(
        "must use table prefix 'prj_'",
      );
    });
  });
});
