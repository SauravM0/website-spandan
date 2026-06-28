import { query } from '../config/database';
import { Article, PublicArticle } from '../domain/entities';
import { buildInsert, buildUpdate } from '../persistence/sqlBuilders';

const PUBLIC_ARTICLE_FIELDS = `
  SELECT a.*,
         d.name as author_doctor_name,
         d.slug as author_doctor_slug,
         d.speciality as author_doctor_speciality
  FROM articles a
  LEFT JOIN doctors d ON a.author_doctor_id = d.id
`;

const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'];

export async function getArticles(publishedOnly = true): Promise<Article[]> {
  const sql = publishedOnly
    ? 'SELECT * FROM articles WHERE published_at IS NOT NULL ORDER BY published_at DESC'
    : 'SELECT * FROM articles ORDER BY created_at DESC';
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

export async function getArticlesByLanguage(lang?: string): Promise<PublicArticle[]> {
  if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
    const result = await query(
      `${PUBLIC_ARTICLE_FIELDS}
       WHERE a.published_at IS NOT NULL AND a.language = $1
       ORDER BY a.published_at DESC`,
      [lang]
    );
    return result.rows;
  }

  const result = await query(
    `${PUBLIC_ARTICLE_FIELDS}
     WHERE a.published_at IS NOT NULL
     ORDER BY a.published_at DESC`
  );
  return result.rows;
}

export async function getArticleBySlugAndLanguage(
  slug: string,
  lang?: string
): Promise<PublicArticle | null> {
  if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
    const result = await query(
      `${PUBLIC_ARTICLE_FIELDS}
       WHERE a.slug = $1 AND a.published_at IS NOT NULL AND a.language = $2`,
      [slug, lang]
    );
    return result.rows[0] || null;
  }

  const result = await query(
    `${PUBLIC_ARTICLE_FIELDS}
     WHERE a.slug = $1 AND a.published_at IS NOT NULL`,
    [slug]
  );
  return result.rows[0] || null;
}
