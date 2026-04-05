# Database Naming Conventions

This document defines the naming conventions used throughout the database layer of the agent orchestrator system.

## Table of Contents

- [General Rules](#general-rules)
- [Table Names](#table-names)
- [Column Names](#column-names)
- [Prefix System](#prefix-system)
- [Examples](#examples)
- [Relationships and Foreign Keys](#relationships-and-foreign-keys)

## General Rules

1. **snake_case**: All database objects (tables, columns, indexes, etc.) use `snake_case`
2. **Singular tables**: Table names are always singular (e.g., `agent`, not `agents`)
3. **3-letter PREFIX**: Every column has a 3-letter UPPERCASE prefix identifying its table
4. **Prefix consistency**: Foreign keys do NOT repeat the prefix - they use the referenced table's prefix

## Table Names

### Format

```
<table_name_singular>
```

### Rules

- Always singular: `agent`, `project`, `task`
- Use snake_case for multi-word tables: `agent_skill`, `task_dependency`
- Lowercase only

### Examples

```sql
-- Good
agent
project
task
task_dependency

-- Bad
agents              -- Plural
Agent               -- PascalCase
agentSkills         -- camelCase
```

## Column Names

### Format

```
<PREFIX>_<column_name>
```

### Rules

- Every column starts with its table's 3-letter UPPERCASE prefix
- Prefix is always UPPERCASE followed by underscore
- Column name after prefix is lowercase snake_case
- Primary keys always named `<PREFIX>_id`

### Examples

```sql
-- For table 'agent' with prefix 'AGN'
AGN_id              -- Primary key
AGN_name
AGN_model
AGN_soul_path
AGN_created_at

-- For table 'project' with prefix 'PRJ'
PRJ_id
PRJ_name
PRJ_slug            -- URL-friendly identifier (unique)
PRJ_description
PRJ_created_by      -- Human creator (not agent)
AGN_id              -- CEO agent FK (uses agent's prefix, not PRJ_AGN_id)

-- For table 'task' with prefix 'TSK'
TSK_id
TSK_title
TSK_description
TSK_status
TSK_sort            -- Execution order
PRJ_id              -- Project FK (uses project's prefix, not TSK_PRJ_id)
AGN_id              -- Agent FK (uses agent's prefix, not TSK_AGN_id)

-- For table 'task_dependency' with prefix 'TDP'
TDP_id
TSK_id              -- Task FK (uses task's prefix, not TDP_TSK_id)
depends_on_TSK_id   -- Dependency FK (descriptive name with task prefix)
```

## Prefix System

### Prefix Generation

1. Take the table name (singular)
2. Use first 3 letters
3. Convert to UPPERCASE
4. Handle conflicts manually

### Standard Prefixes

| Table Name | Prefix | Example Columns |
|------------|--------|-----------------|
| agent | AGN | AGN_id, AGN_name |
| project | PRJ | PRJ_id, PRJ_name |
| task | TSK | TSK_id, TSK_title |
| soul | SOL | SOL_id, SOL_name |
| skill | SKL | SKL_id, SKL_name |
| message | MSG | MSG_id, MSG_content |
| queue | QUE | QUE_id, QUE_name |
| member | MBR | MBR_id, MBR_role |
| agent_skill | ASK | ASK_id, ASK_level |
| task_dependency | TDP | TDP_id, TSK_id |
| conversation | CNV | CNV_id, CNV_title |
| notification | NTF | NTF_id, NTF_content |
| configuration | CFG | CFG_id, CFG_key |
| credential | CRD | CRD_id, CRD_type |

### Conflict Resolution

When two tables would have the same prefix:

1. **Use vowels**: Add a distinguishing vowel
   - `message` → MSG
   - `member` → MBR (not MEM)

2. **Use consonants**: Use distinct consonants
   - `queue` → QUE
   - `quality` → QUA

3. **Document exceptions**: Maintain a prefix registry in this file

## Examples

### Table Definition

```sql
-- Agent table
CREATE TABLE agent (
    AGN_id SERIAL PRIMARY KEY,
    AGN_name VARCHAR(255) NOT NULL,
    AGN_soul TEXT NOT NULL,
    AGN_model VARCHAR(50) NOT NULL,
    reports_to_AGN_id INTEGER REFERENCES agent(AGN_id),
    AGN_status VARCHAR(20) NOT NULL DEFAULT 'active',
    AGN_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    AGN_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project table
CREATE TABLE project (
    PRJ_id SERIAL PRIMARY KEY,
    PRJ_name VARCHAR(255) NOT NULL,
    PRJ_slug VARCHAR(255) NOT NULL UNIQUE,
    PRJ_description TEXT,
    PRJ_created_by VARCHAR(255) NOT NULL,
    AGN_id INTEGER REFERENCES agent(AGN_id),  -- CEO agent
    PRJ_status VARCHAR(50) DEFAULT 'draft',
    PRJ_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRJ_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task table
CREATE TABLE task (
    TSK_id SERIAL PRIMARY KEY,
    PRJ_id INTEGER NOT NULL REFERENCES project(PRJ_id),
    AGN_id INTEGER REFERENCES agent(AGN_id),
    TSK_title VARCHAR(500) NOT NULL,
    TSK_description TEXT,
    TSK_status VARCHAR(50) DEFAULT 'pending',
    TSK_sort INTEGER DEFAULT 0,
    TSK_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TSK_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task dependency table (many-to-many)
CREATE TABLE task_dependency (
    TDP_id SERIAL PRIMARY KEY,
    TSK_id INTEGER NOT NULL REFERENCES task(TSK_id) ON DELETE CASCADE,
    depends_on_TSK_id INTEGER NOT NULL REFERENCES task(TSK_id) ON DELETE CASCADE,
    TDP_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(TSK_id, depends_on_TSK_id)
);

-- Configuration table (system-wide settings)
CREATE TABLE configuration (
    CFG_id SERIAL PRIMARY KEY,
    CFG_dokku_host VARCHAR(255),
    CFG_dokku_port INTEGER,
    CFG_dokku_ssh_user VARCHAR(50),
    CFG_openai_api_key TEXT,
    CFG_anthropic_api_key TEXT,
    CFG_zai_api_key TEXT,
    CFG_google_api_key TEXT,
    CFG_cohere_api_key TEXT,
    CFG_default_provider VARCHAR(20),
    CFG_default_model VARCHAR(100),
    CFG_max_tokens INTEGER,
    CFG_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CFG_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Relationships and Foreign Keys

### Foreign Key Naming

Foreign keys follow the pattern:

**Simple FK (uses referenced table's prefix):**
```
<REFERENCED_TABLE_PREFIX>_id
```

**Descriptive FK (uses descriptive name + referenced table's prefix):**
```
<descriptive_name>_<REFERENCED_TABLE_PREFIX>_id
```

### Examples

```sql
-- In task table, simple FK to project
PRJ_id INTEGER REFERENCES project(PRJ_id)

-- In task table, simple FK to agent
AGN_id INTEGER REFERENCES agent(AGN_id)

-- In agent table, descriptive FK to another agent
reports_to_AGN_id INTEGER REFERENCES agent(AGN_id)

-- In project table, simple FK to agent (CEO)
AGN_id INTEGER REFERENCES agent(AGN_id)

-- In task_dependency table, one FK is simple...
TSK_id INTEGER REFERENCES task(TSK_id)

-- ...and the other is descriptive
depends_on_TSK_id INTEGER REFERENCES task(TSK_id)
```

### Join Tables

For many-to-many relationships:

```sql
-- Agent joins Skill
CREATE TABLE agent_skill (
    ASK_id SERIAL PRIMARY KEY,
    AGN_id INTEGER NOT NULL REFERENCES agent(AGN_id),
    SKL_id INTEGER NOT NULL REFERENCES skill(SKL_id),
    ASK_level INTEGER DEFAULT 1,
    ASK_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(AGN_id, SKL_id)
);

-- Task dependencies (many-to-many)
CREATE TABLE task_dependency (
    TDP_id SERIAL PRIMARY KEY,
    TSK_id INTEGER NOT NULL REFERENCES task(TSK_id) ON DELETE CASCADE,
    depends_on_TSK_id INTEGER NOT NULL REFERENCES task(TSK_id) ON DELETE CASCADE,
    TDP_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(TSK_id, depends_on_TSK_id)
);
```

## Indexes and Constraints

### Index Naming

Indexes: `idx_<table>_<column>`

```sql
CREATE INDEX idx_agent_AGN_name ON agent(AGN_name);
CREATE INDEX idx_task_PRJ_id ON task(PRJ_id);
CREATE INDEX idx_task_TSK_status ON task(TSK_status);
```

### Unique Constraints

Unique constraints: `uq_<table>_<column>`

```sql
ALTER TABLE agent ADD CONSTRAINT uq_agent_AGN_name UNIQUE(AGN_name);
```

### Foreign Key Constraints

Foreign keys: `fk_<table>_<column>`

```sql
ALTER TABLE task
ADD CONSTRAINT fk_task_PRJ_id
FOREIGN KEY (PRJ_id) REFERENCES project(PRJ_id);
```

## Standard Columns

All tables should include these standard columns when applicable:

```sql
-- Primary key
<PRJ>_id SERIAL PRIMARY KEY

-- Timestamps
<PRJ>_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
<PRJ>_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- Soft delete (optional)
<PRJ>_deleted_at TIMESTAMP
```

## Migration Best Practices

1. Always use these conventions in migrations
2. Add comments to tables and columns
3. Use transaction blocks for schema changes
4. Test migrations on a copy of production data first

### Example Migration

```sql
BEGIN;

CREATE TABLE agent (
    AGN_id SERIAL PRIMARY KEY,
    AGN_name VARCHAR(255) NOT NULL,
    AGN_model VARCHAR(50) NOT NULL,
    AGN_soul TEXT NOT NULL,
    reports_to_AGN_id INTEGER REFERENCES agent(AGN_id),
    AGN_status VARCHAR(20) NOT NULL DEFAULT 'active',
    AGN_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    AGN_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE agent IS 'AI agents with distinct personalities';
COMMENT ON COLUMN agent.AGN_id IS 'Primary key';
COMMENT ON COLUMN agent.AGN_name IS 'Human-readable agent name';
COMMENT ON COLUMN agent.AGN_model IS 'AI model used (e.g., claude-opus-4-6, gpt-4)';
COMMENT ON COLUMN agent.AGN_soul IS 'Personality definition in markdown format';
COMMENT ON COLUMN agent.reports_to_AGN_id IS 'Parent agent in hierarchy (who this agent reports to)';
COMMENT ON COLUMN agent.AGN_status IS 'Current status: active, inactive, or archived';

COMMIT;
```

## Key Principles

1. **Prefixes are ALWAYS UPPERCASE** - `AGN_id` not `agn_id`
2. **FKs don't repeat prefixes** - `PRJ_id` in task table, not `TSK_PRJ_id`
3. **Descriptive FKs** - Use descriptive names when needed: `reports_to_AGN_id`
4. **Consistency** - Same table always uses same prefix
5. **Clarity** - Column names should be self-documenting
