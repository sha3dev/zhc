-- Migration: Update project and task tables for new requirements
--
-- This migration updates the existing project and task tables to support:
-- 1. Projects created by humans (not agents)
-- 2. CEO agent assignment to projects
-- 3. Many-to-many task dependencies (not single self-reference)
-- 4. Updated status enums
-- 5. Correct naming: FKs don't repeat prefixes
-- 6. Renamed TSK_sort_order to TSK_sort, removed TSK_doc_reference
-- 7. Added PRJ_slug for URL-friendly identifiers
--
-- See docs/DATABASE_CONVENTIONS.md for naming rules

BEGIN;

-- Drop existing indexes and constraints that will be recreated
DROP INDEX IF EXISTS idx_project_prj_created_by_agn_id;
DROP INDEX IF EXISTS idx_task_tsk_prj_id;
DROP INDEX IF EXISTS idx_task_tsk_assigned_to_agn_id;
DROP INDEX IF EXISTS idx_task_tsk_status;

-- Alter project table
-- 1. Change prj_created_by_agn_id to prj_created_by (human creator)
-- 2. Add PRJ_slug for URL-friendly identifier
-- 3. Add AGN_id for CEO agent assignment (FK to agent, no prefix repetition)
-- 4. Update status constraint

-- First, if there's existing data, we need to migrate it
-- For now, we'll drop the old column and add new ones
ALTER TABLE project DROP COLUMN IF EXISTS prj_created_by_agn_id;

-- Add new columns
ALTER TABLE project ADD COLUMN PRJ_slug VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE project ADD COLUMN PRJ_created_by VARCHAR(255) NOT NULL DEFAULT 'system';
ALTER TABLE project ADD COLUMN AGN_id INTEGER REFERENCES agent(AGN_id);

-- Generate slugs from existing names if empty
DO $$
BEGIN
    UPDATE project SET PRJ_slug = slugify(PRJ_name, '-') WHERE PRJ_slug = '';
END $$;

-- Add unique constraint on slug
ALTER TABLE project ADD CONSTRAINT uq_project_PRJ_slug UNIQUE(PRJ_slug);

-- Update status constraint
ALTER TABLE project DROP CONSTRAINT IF EXISTS check_project_status;
ALTER TABLE project ADD CONSTRAINT check_project_status
    CHECK (PRJ_status IN (
        'draft',
        'planning',
        'ready',
        'in_progress',
        'completed',
        'on_hold',
        'cancelled'
    ));

-- Update comments
COMMENT ON COLUMN project.PRJ_slug IS 'URL-friendly identifier (unique)';
COMMENT ON COLUMN project.PRJ_created_by IS 'Human creator identifier (external user ID)';
COMMENT ON COLUMN project.AGN_id IS 'CEO agent assigned to manage this project (FK to agent)';
COMMENT ON COLUMN project.PRJ_status IS 'Project status: draft, planning, ready, in_progress, completed, on_hold, cancelled';

-- Alter task table
-- 1. Add TSK_sort for execution ordering (renamed from TSK_sort_order)
-- 2. Drop TSK_doc_reference (documentation is in repo files)
-- 3. Drop single dependency column (will be replaced with join table)
-- 4. Update status constraint

-- Drop old columns
ALTER TABLE task DROP COLUMN IF EXISTS tsk_depends_on_tsk_id;
ALTER TABLE task DROP COLUMN IF EXISTS tsk_priority;

-- Add new columns
ALTER TABLE task ADD COLUMN TSK_sort INTEGER DEFAULT 0;

-- If old tsk_sort_order exists, migrate it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task' AND column_name = 'tsk_sort_order') THEN
        UPDATE task SET TSK_sort = tsk_sort_order;
        ALTER TABLE task DROP COLUMN tsk_sort_order;
    END IF;
END $$;

-- Update status constraint
ALTER TABLE task DROP CONSTRAINT IF EXISTS check_task_status;
ALTER TABLE task ADD CONSTRAINT check_task_status
    CHECK (TSK_status IN (
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'failed',
        'blocked',
        'cancelled'
    ));

-- Update comments
COMMENT ON COLUMN task.TSK_sort IS 'Execution order (lower numbers execute first)';
COMMENT ON COLUMN task.TSK_status IS 'Task status: pending, assigned, in_progress, completed, failed, blocked, cancelled';

-- Create task_dependency join table for many-to-many dependencies
CREATE TABLE task_dependency (
    TDP_id SERIAL PRIMARY KEY,
    TSK_id INTEGER NOT NULL REFERENCES task(TSK_id) ON DELETE CASCADE,
    depends_on_TSK_id INTEGER NOT NULL REFERENCES task(TSK_id) ON DELETE CASCADE,
    TDP_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure a task can't depend on itself
    CONSTRAINT check_no_self_dependency CHECK (TSK_id != depends_on_TSK_id),
    -- Ensure unique dependency relationships
    UNIQUE(TSK_id, depends_on_TSK_id)
);

COMMENT ON TABLE task_dependency IS 'Many-to-many task dependencies (a task depends on multiple tasks)';
COMMENT ON COLUMN task_dependency.TSK_id IS 'The task that has the dependency';
COMMENT ON COLUMN task_dependency.depends_on_TSK_id IS 'The task that must complete first';
COMMENT ON COLUMN task_dependency.TDP_created_at IS 'Timestamp when dependency was created';

-- Create indexes for performance
CREATE INDEX idx_project_PRJ_slug ON project(PRJ_slug);
CREATE INDEX idx_project_PRJ_created_by ON project(PRJ_created_by);
CREATE INDEX idx_project_AGN_id ON project(AGN_id);
CREATE INDEX idx_project_PRJ_status ON project(PRJ_status);
CREATE INDEX idx_task_PRJ_id ON task(TSK_PRJ_id);
CREATE INDEX idx_task_AGN_id ON task(AGN_id);
CREATE INDEX idx_task_TSK_status ON task(TSK_status);
CREATE INDEX idx_task_TSK_sort ON task(TSK_sort);
CREATE INDEX idx_task_dependency_TSK_id ON task_dependency(TSK_id);
CREATE INDEX idx_task_dependency_depends_on_TSK_id ON task_dependency(depends_on_TSK_id);

COMMIT;

-- Notes:
-- 1. Existing data migration may be needed if there are projects/tasks already
-- 2. The PRJ_created_by field defaults to 'system' for existing projects
-- 3. Task dependencies are moved from single column to join table
-- 4. Documentation is stored as files in git repo, not in database
-- 5. Projects should be linked to a CEO agent for full functionality
-- 6. FK columns don't repeat prefixes (e.g., AGN_id not PRJ_AGN_id)
-- 7. TSK_sort_order renamed to TSK_sort for brevity
-- 8. PRJ_slug is unique and auto-generated from PRJ_name if not provided
