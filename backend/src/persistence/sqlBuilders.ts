type WritableRecord = Record<string, unknown>;

/**
 * Columns each table accepts from a write.
 *
 * Column names cannot be parameterised, so they are interpolated into the SQL
 * text. Callers pass request bodies straight through, which means an unchecked
 * key is an injection point: a body key of
 * `"name) VALUES ('x') RETURNING *; --"` rewrites the whole statement. Every
 * identifier is therefore matched against this list before it reaches the SQL,
 * and `id`, `created_at` and `updated_at` are deliberately absent so a caller
 * cannot overwrite them.
 */
const WRITABLE_COLUMNS: Record<string, readonly string[]> = {
  doctors: ['name', 'slug', 'speciality', 'qualifications', 'bio', 'photo_url', 'is_active'],
  articles: [
    'slug',
    'title',
    'body_md',
    'excerpt',
    'language',
    'translation_group_id',
    'cover_image_url',
    'youtube_video_url',
    'author_doctor_id',
    'category',
    'tags',
    'published_at',
    'content_status',
    'content_format',
    'read_time_minutes',
    'reviewed_at',
    'reviewer_display_name',
    'reviewer_staff_id',
    'withdrawn_at',
  ],
  staff_users: [
    'email',
    'password_hash',
    'full_name',
    'doctor_id',
    'role',
    'is_active',
    'mfa_secret_encrypted',
    'mfa_enabled_at',
    'last_mfa_counter',
    'access_reviewed_at',
    'access_reviewed_by',
  ],
};

export class UnknownColumnError extends Error {
  constructor(table: string, column: string) {
    super(`Column "${column}" is not writable on "${table}"`);
    this.name = 'UnknownColumnError';
  }
}

/**
 * Narrows a record to the columns the table actually accepts.
 *
 * Unknown keys are rejected rather than dropped: silently ignoring them would
 * let a caller believe a field was saved when it was not.
 */
function assertWritableColumns(table: string, columns: string[]): void {
  const allowed = WRITABLE_COLUMNS[table];
  if (!allowed) throw new Error(`No writable column list is defined for table "${table}"`);
  for (const column of columns) {
    if (!allowed.includes(column)) throw new UnknownColumnError(table, column);
  }
}

export function buildInsert<T extends WritableRecord>(table: string, data: T): {
  sql: string;
  values: unknown[];
} {
  const columns = Object.keys(data);
  assertWritableColumns(table, columns);

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
  assertWritableColumns(table, columns);

  const values = Object.values(data);
  // Values bind from $1, so the first column is $1 and the id trails at the end.
  const setClause = columns.map((column, index) => `${column} = $${index + 1}`).join(', ');
  const timestampClause = options.timestampColumn ? `, ${options.timestampColumn} = NOW()` : '';

  return {
    sql: `UPDATE ${table} SET ${setClause}${timestampClause} WHERE id = $${values.length + 1} RETURNING *`,
    values: [...values, id],
  };
}
