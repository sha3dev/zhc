/**
 * Database naming utilities
 *
 * Provides functions to generate table and column names following the
 * database naming conventions documented in DATABASE_CONVENTIONS.md
 */

/**
 * Registered table prefixes to handle conflicts
 */
const REGISTERED_PREFIXES: Record<string, string> = {
  agent: 'AGN',
  project: 'PRJ',
  task: 'TSK',
  soul: 'SOL',
  skill: 'SKL',
  message: 'MSG',
  queue: 'QUE',
  member: 'MBR',
  agent_skill: 'ASK',
  project_member: 'PMM',
  conversation: 'CNV',
  notification: 'NTF',
  configuration: 'CFG',
  credential: 'CRD',
};

/**
 * Generate a 3-letter prefix for a table name
 *
 * @param tableName - The table name (singular, snake_case)
 * @returns 3-letter uppercase prefix
 *
 * @example
 * ```ts
 * getTablePrefix("agent")      // "AGN"
 * getTablePrefix("project")    // "PRJ"
 * getTablePrefix("agent_skill") // "ASK"
 * ```
 */
export function getTablePrefix(tableName: string): string {
  // Check if prefix is explicitly registered
  if (REGISTERED_PREFIXES[tableName]) {
    return REGISTERED_PREFIXES[tableName];
  }

  // Generate prefix from table name
  const prefix = tableName
    .replace(/_/g, '') // Remove underscores for multi-word tables
    .toUpperCase()
    .slice(0, 3);

  return prefix;
}

/**
 * Generate a column name with the table's prefix
 *
 * @param tableName - The table name (singular, snake_case)
 * @param columnName - The column name (without prefix, snake_case)
 * @returns Column name with table prefix (PREFIX ALWAYS UPPERCASE)
 *
 * @example
 * ```ts
 * getColumnName("agent", "id")           // "AGN_id"
 * getColumnName("agent", "name")         // "AGN_name"
 * getColumnName("project", "created_at") // "PRJ_created_at"
 * ```
 */
export function getColumnName(tableName: string, columnName: string): string {
  const prefix = getTablePrefix(tableName);
  return `${prefix}_${columnName}`;
}

/**
 * Generate a primary key column name for a table
 *
 * @param tableName - The table name (singular, snake_case)
 * @returns Primary key column name
 *
 * @example
 * ```ts
 * getPrimaryKeyColumn("agent")   // "agn_id"
 * getPrimaryKeyColumn("project") // "prj_id"
 * ```
 */
export function getPrimaryKeyColumn(tableName: string): string {
  return getColumnName(tableName, 'id');
}

/**
 * Generate a foreign key column name
 *
 * @param localTable - The local table name
 * @param referencedTable - The referenced table name
 * @param relationshipName - Optional relationship name (e.g., "created_by", "assigned_to")
 * @returns Foreign key column name (PREFIXES ALWAYS UPPERCASE)
 *
 * @example
 * ```ts
 * getForeignKeyColumn("task", "project")                    // "TSK_PRJ_id"
 * getForeignKeyColumn("task", "agent")                      // "TSK_AGN_id"
 * getForeignKeyColumn("task", "agent", "assigned_to")       // "TSK_assigned_to_AGN_id"
 * getForeignKeyColumn("project", "agent", "created_by")     // "PRJ_created_by_AGN_id"
 * ```
 */
export function getForeignKeyColumn(
  localTable: string,
  referencedTable: string,
  relationshipName?: string,
): string {
  const localPrefix = getTablePrefix(localTable);
  const referencedPrefix = getTablePrefix(referencedTable);

  if (relationshipName) {
    return `${localPrefix}_${relationshipName}_${referencedPrefix}_id`;
  }

  return `${localPrefix}_${referencedPrefix}_id`;
}

/**
 * Generate a timestamp column name
 *
 * @param tableName - The table name
 * @param type - Type of timestamp ("created_at" or "updated_at")
 * @returns Timestamp column name (PREFIX ALWAYS UPPERCASE)
 *
 * @example
 * ```ts
 * getTimestampColumn("agent", "created_at")  // "AGN_created_at"
 * getTimestampColumn("agent", "updated_at")  // "AGN_updated_at"
 * ```
 */
export function getTimestampColumn(tableName: string, type: 'created_at' | 'updated_at'): string {
  return getColumnName(tableName, type);
}

/**
 * Generate an index name
 *
 * @param tableName - The table name
 * @param columnNames - Array of column names (with prefixes)
 * @returns Index name
 *
 * @example
 * ```ts
 * getIndexName("agent", ["agn_name"])                    // "idx_agent_agn_name"
 * getIndexName("task", ["tsk_prj_id", "tsk_status"])     // "idx_task_tsk_prj_id_tsk_status"
 * ```
 */
export function getIndexName(tableName: string, columnNames: string[]): string {
  const columns = columnNames.join('_');
  return `idx_${tableName}_${columns}`;
}

/**
 * Generate a unique constraint name
 *
 * @param tableName - The table name
 * @param columnNames - Array of column names (with prefixes)
 * @returns Unique constraint name
 *
 * @example
 * ```ts
 * getUniqueConstraintName("agent", ["agn_email"])  // "uq_agent_agn_email"
 * ```
 */
export function getUniqueConstraintName(tableName: string, columnNames: string[]): string {
  const columns = columnNames.join('_');
  return `uq_${tableName}_${columns}`;
}

/**
 * Generate a foreign key constraint name
 *
 * @param tableName - The table name
 * @param columnName - The column name (with prefix)
 * @returns Foreign key constraint name
 *
 * @example
 * ```ts
 * getForeignKeyConstraintName("task", "tsk_prj_id")  // "fk_task_tsk_prj_id"
 * ```
 */
export function getForeignKeyConstraintName(tableName: string, columnName: string): string {
  return `fk_${tableName}_${columnName}`;
}

/**
 * Type-safe column name builder
 *
 * @example
 * ```ts
 * const agent = columnNames("agent");
 * agent.id              // "AGN_id"
 * agent.name            // "AGN_name"
 * agent.createdAt       // "AGN_created_at"
 * ```
 */
export function columnNames<T extends Record<string, string>>(tableName: string) {
  const prefix = getTablePrefix(tableName);

  return new Proxy({} as T, {
    get(_target, prop: string) {
      // Convert camelCase to snake_case
      const snakeCase = prop.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      return `${prefix}_${snakeCase}`;
    },
  });
}

/**
 * Validate a table name follows conventions
 *
 * @param tableName - The table name to validate
 * @returns True if valid, throws error if invalid
 *
 * @example
 * ```ts
 * validateTableName("agent")      // true
 * validateTableName("agents")     // throws Error: Table names must be singular
 * validateTableName("Agent")      // throws Error: Table names must be lowercase
 * ```
 */
export function validateTableName(tableName: string): boolean {
  if (tableName !== tableName.toLowerCase()) {
    throw new Error(`Table name '${tableName}' must be lowercase`);
  }

  if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
    throw new Error(
      `Table name '${tableName}' must start with a letter and contain only letters, numbers, and underscores`,
    );
  }

  if (tableName.endsWith('s') && !tableName.endsWith('ss')) {
    // Simple heuristic - warn if plural (ends with 's' but not 'ss')
    console.warn(`Table name '${tableName}' appears to be plural. Table names should be singular.`);
  }

  return true;
}

/**
 * Validate a column name follows conventions
 *
 * @param tableName - The table name
 * @param columnName - The column name to validate
 * @returns True if valid, throws error if invalid
 *
 * @example
 * ```ts
 * validateColumnName("agent", "AGN_id")         // true
 * validateColumnName("agent", "agent_id")       // throws Error: Column must use table prefix 'AGN'
 * validateColumnName("agent", "agn_id")         // throws Error: Column prefix must be uppercase
 * ```
 */
export function validateColumnName(tableName: string, columnName: string): boolean {
  const expectedPrefix = getTablePrefix(tableName);

  // Check if column starts with uppercase prefix
  if (!columnName.startsWith(`${expectedPrefix}_`)) {
    throw new Error(
      `Column '${columnName}' must use table prefix '${expectedPrefix}_' (expected format: ${expectedPrefix}_<name>)`,
    );
  }

  // Additional validation: the prefix part must be uppercase
  const prefixPart = columnName.split('_')[0];
  if (prefixPart !== expectedPrefix) {
    throw new Error(
      `Column '${columnName}' prefix must be uppercase (expected: ${expectedPrefix}, got: ${prefixPart})`,
    );
  }

  return true;
}
