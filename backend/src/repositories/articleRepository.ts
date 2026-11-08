import { query } from '../config/database';
import { Article, PublicArticle } from '../domain/entities';
import { buildInsert, buildUpdate } from '../persistence/sqlBuilders';
import { normalizePublicArticleFilters, type PublicArticleFilters, SUPPORTED_ARTICLE_LANGUAGES } from '../utils/articleFilters';
import { containsPattern } from '../utils/likePattern';

const PUBLIC_ARTICLE_FIELDS = `
  SELECT a.*,
         d.name as author_doctor_name,
         d.slug as author_doctor_slug,
         d.speciality as author_doctor_speciality
  FROM articles a
  LEFT JOIN doctors d ON a.author_doctor_id = d.id
`;

export async function getArticles(publishedOnly = true): Promise<Article[]> {
  const sql = publishedOnly
    ? 'SELECT * FROM articles WHERE published_at IS NOT NULL ORDER BY published_at DESC LIMIT 500'
    : 'SELECT * FROM articles ORDER BY created_at DESC LIMIT 500';
  const result = await query(sql);
  return result.rows;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const result = await query('SELECT * FROM articles WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

export async function getArticleById(id: string): Promise<Article | null> {
  const result = await query('SELECT * FROM articles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createArticle(data: Partial<Article>): Promise<Article> {
  const statement = buildInsert('articles', data);
  const result = await query(statement.sql, statement.values);
  return result.rows[0];
}

export async function updateArticle(id: string, data: Partial<Article>): Promise<Article | null> {
  const statement = buildUpdate('articles', id, data);
  if (!statement) return null;

  const result = await query(statement.sql, statement.values);
  return result.rows[0] || null;
}

export async function deleteArticle(id: string): Promise<boolean> {
  const result = await query('DELETE FROM articles WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getArticlesByLanguage(
  langOrFilters?: string | PublicArticleFilters
): Promise<PublicArticle[]> {
  const filters = normalizePublicArticleFilters(
    typeof langOrFilters === 'string' ? { lang: langOrFilters } : langOrFilters || {}
  );
  const where = [
    'a.published_at IS NOT NULL',
    "a.content_status = 'published'",
    'a.withdrawn_at IS NULL',
  ];
  const values: string[] = [];

  if (filters.lang) {
    values.push(filters.lang);
    where.push(`a.language = $${values.length}`);
  }

  if (filters.category) {
    values.push(filters.category);
    where.push(`LOWER(a.category) = LOWER($${values.length})`);
  }

  if (filters.format) {
    values.push(filters.format);
    where.push(`a.content_format = $${values.length}`);
  }

  if (filters.q) {
    values.push(containsPattern(filters.q));
    where.push(`(a.title ILIKE $${values.length} OR a.excerpt ILIKE $${values.length} OR array_to_string(a.tags, ' ') ILIKE $${values.length})`);
  }

  const result = await query(
    `${PUBLIC_ARTICLE_FIELDS}
     WHERE ${where.join(' AND ')}
     ORDER BY a.published_at DESC
     LIMIT 60`,
    values
  );
  return result.rows;
}

export async function getArticleBySlugAndLanguage(
  slug: string,
  lang?: string
): Promise<PublicArticle | null> {
  if (lang && SUPPORTED_ARTICLE_LANGUAGES.includes(lang)) {
    const result = await query(
      `${PUBLIC_ARTICLE_FIELDS}
       WHERE a.slug = $1
         AND a.published_at IS NOT NULL
         AND a.content_status = 'published'
         AND a.withdrawn_at IS NULL
         AND a.language = $2`,
      [slug, lang]
    );
    return result.rows[0] || null;
  }

  const result = await query(
    `${PUBLIC_ARTICLE_FIELDS}
     WHERE a.slug = $1
       AND a.published_at IS NOT NULL
       AND a.content_status = 'published'
       AND a.withdrawn_at IS NULL`,
    [slug]
  );
  return result.rows[0] || null;
}
