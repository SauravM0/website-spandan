import { Request, Response } from 'express';
import { getArticlesByLanguage, getArticleBySlugAndLanguage } from '../models';
import { isValidSlug } from '../utils/slug';
import { notFound } from '../utils/errors';

export async function listArticles(req: Request, res: Response): Promise<void> {
  const lang = req.query.lang as string | undefined;
  const articles = await getArticlesByLanguage(lang);
  // Return only published articles with summary fields
  const result = articles.map(a => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    cover_image_url: a.cover_image_url,
    youtube_video_url: a.youtube_video_url,
    category: a.category,
    tags: a.tags,
    published_at: a.published_at,
    language: a.language,
    author_doctor_id: a.author_doctor_id,
    author_doctor_name: a.author_doctor_name,
    author_doctor_slug: a.author_doctor_slug,
    author_doctor_speciality: a.author_doctor_speciality,
  }));
  res.json({ articles: result });
}

export async function getArticleDetail(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const lang = req.query.lang as string | undefined;

  if (!isValidSlug(slug)) {
    notFound(res, 'Article not found');
    return;
  }

  const article = await getArticleBySlugAndLanguage(slug, lang);
  if (!article) {
    notFound(res, 'Article not found');
    return;
  }

  res.json({ article: {
    slug: article.slug,
    title: article.title,
    body_md: article.body_md,
    excerpt: article.excerpt,
    cover_image_url: article.cover_image_url,
    youtube_video_url: article.youtube_video_url,
    category: article.category,
    tags: article.tags,
    published_at: article.published_at,
    language: article.language,
    author_doctor_id: article.author_doctor_id,
    author_doctor_name: article.author_doctor_name,
    author_doctor_slug: article.author_doctor_slug,
    author_doctor_speciality: article.author_doctor_speciality,
  }});
}
