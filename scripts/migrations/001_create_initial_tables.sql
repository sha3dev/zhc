-- Initial schema migration for Agent Orchestrator
-- This migration creates the core tables following the database naming conventions
--
-- Conventions:
-- - Table names: singular, snake_case
-- - All columns have 3-letter prefix identifying their table
-- - Foreign keys maintain original table's prefix
--
-- See DATABASE_CONVENTIONS.md for complete rules

BEGIN;

-- Agent table: stores AI agent configurations
CREATE TABLE agent (
    agn_id SERIAL PRIMARY KEY,
    agn_name VARCHAR(255) NOT NULL,
    agn_model VARCHAR(50) NOT NULL,
    agn_soul_path TEXT NOT NULL,
    agn_manages_agn_id INTEGER REFERENCES agent(agn_id),
    agn_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    agn_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE agent IS 'AI agents with distinct personalities';
COMMENT ON COLUMN agent.agn_id IS 'Primary key';
COMMENT ON COLUMN agent.agn_name IS 'Human-readable agent name';
COMMENT ON COLUMN agent.agn_model IS 'AI model used (e.g., claude-opus-4-6, gpt-4)';
COMMENT ON COLUMN agent.agn_soul_path IS 'Path to SOUL.md personality file';
COMMENT ON COLUMN agent.agn_manages_agn_id IS 'Self-referencing FK for management hierarchy';

-- Project table: stores project definitions
CREATE TABLE project (
    prj_id SERIAL PRIMARY KEY,
    prj_name VARCHAR(255) NOT NULL,
    prj_description TEXT,
    prj_created_by_agn_id INTEGER NOT NULL REFERENCES agent(agn_id),
    prj_status VARCHAR(50) DEFAULT 'active',
    prj_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    prj_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE project IS 'Projects containing ordered tasks for agents to accomplish';
COMMENT ON COLUMN project.prj_created_by_agn_id IS 'Agent who created this project';

-- Task table: stores individual tasks within projects
CREATE TABLE task (
    tsk_id SERIAL PRIMARY KEY,
    tsk_prj_id INTEGER NOT NULL REFERENCES project(prj_id),
    tsk_assigned_to_agn_id INTEGER REFERENCES agent(agn_id),
    tsk_title VARCHAR(500) NOT NULL,
    tsk_description TEXT,
    tsk_status VARCHAR(50) DEFAULT 'pending',
    tsk_priority INTEGER DEFAULT 5,
    tsk_depends_on_tsk_id INTEGER REFERENCES task(tsk_id),
    tsk_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tsk_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE task IS 'Individual tasks within a project';
COMMENT ON COLUMN task.tsk_prj_id IS 'Project this task belongs to';
COMMENT ON COLUMN task.tsk_assigned_to_agn_id IS 'Agent assigned to this task';
COMMENT ON COLUMN task.tsk_depends_on_tsk_id IS 'Self-referencing FK for task dependencies';

-- Agent messages: stores communication between agents
CREATE TABLE message (
    msg_id SERIAL PRIMARY KEY,
    msg_from_agn_id INTEGER NOT NULL REFERENCES agent(agn_id),
    msg_to_agn_id INTEGER NOT NULL REFERENCES agent(agn_id),
    msg_tsk_id INTEGER REFERENCES task(tsk_id),
    msg_content TEXT NOT NULL,
    msg_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    msg_read_at TIMESTAMP
);

COMMENT ON TABLE message IS 'Communication history between agents';
COMMENT ON COLUMN message.msg_from_agn_id IS 'Agent who sent the message';
COMMENT ON COLUMN message.msg_to_agn_id IS 'Agent who received the message';
COMMENT ON COLUMN message.msg_tsk_id IS 'Optional task this message relates to';

-- Skill table: stores available skills
CREATE TABLE skill (
    skl_id SERIAL PRIMARY KEY,
    skl_name VARCHAR(255) NOT NULL,
    skl_description TEXT,
    skl_file_path TEXT NOT NULL,
    skl_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE skill IS 'Reusable capabilities that agents can use';

-- Agent_skill join table: many-to-many relationship
CREATE TABLE agent_skill (
    ask_id SERIAL PRIMARY KEY,
    ask_agn_id INTEGER NOT NULL REFERENCES agent(agn_id),
    ask_skl_id INTEGER NOT NULL REFERENCES skill(skl_id),
    ask_proficiency_level INTEGER DEFAULT 1,
    ask_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ask_agn_id, ask_skl_id)
);

COMMENT ON TABLE agent_skill IS 'Skills available to each agent';
COMMENT ON COLUMN agent_skill.ask_proficiency_level IS '1-5 scale of agent proficiency';

-- Indexes for performance
CREATE INDEX idx_agent_agn_name ON agent(agn_name);
CREATE INDEX idx_project_prj_created_by_agn_id ON project(prj_created_by_agn_id);
CREATE INDEX idx_task_tsk_prj_id ON task(tsk_prj_id);
CREATE INDEX idx_task_tsk_assigned_to_agn_id ON task(tsk_assigned_to_agn_id);
CREATE INDEX idx_task_tsk_status ON task(tsk_status);
CREATE INDEX idx_message_msg_from_agn_id ON message(msg_from_agn_id);
CREATE INDEX idx_message_msg_to_agn_id ON message(msg_to_agn_id);
CREATE INDEX idx_message_msg_tsk_id ON message(msg_tsk_id);

COMMIT;
