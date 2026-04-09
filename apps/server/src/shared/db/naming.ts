const REGISTERED_PREFIXES: Record<string, string> = {
  agent: 'agn',
  project: 'prj',
  task: 'tsk',
  soul: 'sol',
  skill: 'skl',
  email: 'eml',
  message: 'msg',
  queue: 'que',
  member: 'mbr',
  agent_skill: 'ask',
  project_member: 'pmm',
  conversation: 'cnv',
  notification: 'ntf',
  configuration: 'cfg',
  credential: 'crd',
  execution: 'exe',
};

export function getTablePrefix(tableName: string): string {
  if (REGISTERED_PREFIXES[tableName]) {
    return REGISTERED_PREFIXES[tableName];
  }

  return tableName.replaceAll('_', '').toLowerCase().slice(0, 3);
}

export function getColumnName(tableName: string, columnName: string): string {
  return `${getTablePrefix(tableName)}_${columnName}`;
}

export function getPrimaryKeyColumn(tableName: string): string {
  return getColumnName(tableName, 'id');
}

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

export function getTimestampColumn(tableName: string, type: 'created_at' | 'updated_at'): string {
  return getColumnName(tableName, type);
}

export function getIndexName(tableName: string, columnNames: string[]): string {
  return `idx_${tableName}_${columnNames.join('_')}`;
}

export function getUniqueConstraintName(tableName: string, columnNames: string[]): string {
  return `uq_${tableName}_${columnNames.join('_')}`;
}

export function getForeignKeyConstraintName(tableName: string, columnName: string): string {
  return `fk_${tableName}_${columnName}`;
}

export function columnNames<T extends Record<string, string>>(tableName: string): T {
  const prefix = getTablePrefix(tableName);

  return new Proxy({} as T, {
    get(_target, prop: string) {
      const snakeCase = prop
        .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
        .split('_')
        .map((segment) => REGISTERED_PREFIXES[segment] ?? segment)
        .join('_');
      return `${prefix}_${snakeCase}`;
    },
  });
}

export function validateTableName(tableName: string): true {
  if (tableName !== tableName.toLowerCase()) {
    throw new Error('Table name must be lowercase');
  }

  if (!/^[a-z_]+$/.test(tableName)) {
    throw new Error('Table name may only contain lowercase letters and underscores');
  }

  return true;
}

export function validateColumnName(tableName: string, columnName: string): true {
  if (columnName !== columnName.toLowerCase()) {
    throw new Error('Column name must be lowercase');
  }

  const prefix = `${getTablePrefix(tableName).toLowerCase()}_`;
  if (!columnName.startsWith(prefix)) {
    throw new Error(`Column name must use table prefix '${prefix}'`);
  }

  return true;
}
