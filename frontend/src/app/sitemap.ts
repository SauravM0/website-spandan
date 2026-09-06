import { MetadataRoute } from 'next';
import { serverApiGet } from '../lib/serverApi';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://spandanclinic.com';

async function getDoctors(): Promise<{ slug: string }[]> {
  const data = await serverApiGet('/doctors', { doctors: [] });
  return data.doctors?.map((d: any) => ({ slug: d.slug })) || [];
}

async function getPackages(): Promise<{ slug: string }[]> {
  const data = await serverApiGet('/packages', { packages: [] });
  return data.packages?.filter((p: any) => p.slug).map((p: any) => ({ slug: p.slug })) || [];
}

async function getArticles(): Promise<{ slug: string }[]> {
  const data = await serverApiGet('/articles', { articles: [] });
  return data.articles?.map((a: any) => ({ slug: a.slug })) || [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [doctors, articles, packages] = await Promise.all([
    getDoctors(),
    getArticles(),
    getPackages(),
  ]);

  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/publications`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/facilities`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/doctors`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE_URL}/packages`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE_URL}/health-resources`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/videos`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const doctorPages = doctors.map((d) => ({
    url: `${BASE_URL}/doctors/${d.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const packagePages = packages.map((p) => ({
    url: `${BASE_URL}/packages/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const articlePages = articles.map((a) => ({
    url: `${BASE_URL}/health-resources/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...doctorPages, ...packagePages, ...articlePages];
}
