import { clinicSettings } from '@/lib/settings';
import { serverApiGet } from '@/lib/serverApi';
import { fallbackDoctorSummaries } from '@/lib/doctorProfiles';

export type PublicDoctorSummary = {
  id?: string;
  slug: string;
  name: string;
  speciality: string;
  qualifications: string;
  bio?: string | null;
  photo_url?: string | null;
  image_url?: string | null;
  available_days?: string | null;
  available_time?: string | null;
  expertise?: string[] | null;
  languages?: string[] | null;
  published?: boolean | null;
  booking_enabled?: boolean | null;
  reviewed_at?: string | null;
};

export type PublicArticleSummary = {
  slug: string;
  title: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  youtube_video_url?: string | null;
  category?: string | null;
  published_at?: string | null;
  author_doctor_name?: string | null;
  author_doctor_slug?: string | null;
};

export type HomePayload = {
  settings: typeof clinicSettings;
  doctors: PublicDoctorSummary[];
  featuredArticle: PublicArticleSummary | null;
  featuredVideo: PublicArticleSummary | null;
};

export async function getHomePayload(): Promise<HomePayload> {
  const [doctorData, articleData] = await Promise.all([
    serverApiGet<{ doctors: PublicDoctorSummary[] }>('/doctors', { doctors: [] }, { next: { revalidate: 3600, tags: ['public-doctors'] } }),
    serverApiGet<{ articles: PublicArticleSummary[] }>('/articles', { articles: [] }, { next: { revalidate: 3600, tags: ['public-articles'] } }),
  ]);
  const articles = articleData.articles || [];
  const featuredVideo = articles.find((article) => Boolean(article.youtube_video_url)) || null;
  const featuredArticle = articles.find((article) => article.slug !== featuredVideo?.slug) || articles[0] || null;

  return {
    settings: clinicSettings,
    // Fall back to the curated profiles so the specialists never vanish from the
    // home page during an API outage.
    doctors: (doctorData.doctors?.length ? doctorData.doctors : fallbackDoctorSummaries()).slice(0, 2),
    featuredArticle,
    featuredVideo,
  };
}
