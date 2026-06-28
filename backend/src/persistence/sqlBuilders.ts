type WritableRecord = Record<string, unknown>;

export function buildInsert<T extends WritableRecord>(table: string, data: T): {
  sql: string;
  values: unknown[];
} {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, index) => `$${index + 1}`);

  return {
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values,
  };
}

export function buildUpdate<T extends WritableRecord>(
  table: string,
  id: string,
  data: T,
  options: { timestampColumn?: string } = { timestampColumn: 'updated_at' }
): {
  sql: string;
  values: unknown[];
} | null {
  const columns = Object.keys(data);
  if (columns.length === 0) return null;

  const values = Object.values(data);
  const setClause = columns.map((column, index) => `${column} = $${index + 2}`).join(', ');
  const timestampClause = options.timestampColumn ? `, ${options.timestampColumn} = NOW()` : '';

  return {
    sql: `UPDATE ${table} SET ${setClause}${timestampClause} WHERE id = $${values.length + 1} RETURNING *`,
    values: [...values, id],
  };
}
