export const SUPPORTED_ARTICLE_LANGUAGES = ['en', 'hi', 'mr'];
export const SUPPORTED_ARTICLE_FORMATS = ['article', 'video', 'tool', 'download'];

export type PublicArticleFilters = {
  lang?: string;
  category?: string;
  format?: string;
  q?: string;
};

export function normalizePublicArticleFilters(filters: PublicArticleFilters): PublicArticleFilters {
  return {
    lang: filters.lang && SUPPORTED_ARTICLE_LANGUAGES.includes(filters.lang) ? filters.lang : undefined,
    format: filters.format && SUPPORTED_ARTICLE_FORMATS.includes(filters.format) ? filters.format : undefined,
    category: filters.category?.trim().slice(0, 80) || undefined,
    q: filters.q?.trim().slice(0, 120) || undefined,
  };
}
