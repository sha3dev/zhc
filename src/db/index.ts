export {
  getPool,
  query,
  getClient,
  transaction,
  closeDatabase,
  testConnection,
} from './client.js';

export {
  getTablePrefix,
  getColumnName,
  getPrimaryKeyColumn,
  getForeignKeyColumn,
  getTimestampColumn,
  getIndexName,
  getUniqueConstraintName,
  getForeignKeyConstraintName,
  columnNames,
  validateTableName,
  validateColumnName,
} from './naming.js';
