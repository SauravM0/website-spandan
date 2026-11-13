import { clinicSettings } from '@/lib/settings';
import { serverApiGet } from '@/lib/serverApi';
import { fallbackDoctorSummaries } from '@/lib/doctorProfiles';
import { fallbackPackageSummaries } from '@/lib/packageCatalog';
import { PACKAGE_CACHE } from '@/lib/cache';
import type { PublicPackageSummary } from '@/components/packages/PackageCard';

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
  /** Cheapest published package, so the home page quotes a live "from" price. */
  lowestPackagePrice: number | null;
};

/**
 * Lowest sellable price across the published packages. Zero and missing prices
 * are discarded rather than treated as free, so an unpriced draft package can
 * never make the home page advertise ₹0.
 */
export function lowestPackagePrice(packages: PublicPackageSummary[]): number | null {
  const prices = packages
    .map((pkg) => Number(pkg.current_price ?? pkg.base_price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);
  return prices[0] ?? null;
}

export async function getHomePayload(): Promise<HomePayload> {
  const [doctorData, articleData, packageData] = await Promise.all([
    serverApiGet<{ doctors: PublicDoctorSummary[] }>('/doctors', { doctors: [] }, { next: { revalidate: 3600, tags: ['public-doctors'] } }),
    serverApiGet<{ articles: PublicArticleSummary[] }>('/articles', { articles: [] }, { next: { revalidate: 3600, tags: ['public-articles'] } }),
    serverApiGet<{ packages: PublicPackageSummary[] }>('/packages', { packages: [] }, PACKAGE_CACHE),
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
    // Same fallback rule as the doctors above: the curated catalogue stands in
    // when the API is unreachable, so the price never disappears mid-outage.
    lowestPackagePrice: lowestPackagePrice(
      packageData.packages?.length ? packageData.packages : fallbackPackageSummaries()
    ),
  };
}
