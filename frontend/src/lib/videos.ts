export type Video = {
  id: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  duration?: string | null;
  publishedAt?: string | null;
  viewCount?: number | null;
  language?: string | null;
  topic?: string | null;
  isReviewed?: boolean;
  captionAvailable?: boolean;
};

export type VideoChannel = {
  channelUrl: string;
};

export type VideosResponse = {
  videos: Video[];
  channel: VideoChannel | null;
  lastSync?: string | null;
};

export function formatDuration(iso?: string | null): string | null {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatViewCount(count?: number | null): string | null {
  if (count == null) return null;
  if (count >= 1_00_00_000) return `${(count / 1_00_00_000).toFixed(1)}Cr`;
  if (count >= 1_00_000) return `${(count / 1_00_000).toFixed(1)}L`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export const LANGUAGE_OPTIONS = [
  { value: '', label: 'All languages' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
];

export function languageLabel(value?: string | null): string {
  return LANGUAGE_OPTIONS.find((o) => o.value === value)?.label || 'English';
}

export function extractTopics(videos: Video[]): string[] {
  return Array.from(
    new Set(
      videos
        .map((v) => v.topic)
        .filter((t): t is string => !!t)
    )
  ).sort();
}

export function extractLanguages(videos: Video[]): string[] {
  return Array.from(
    new Set(
      videos
        .map((v) => v.language)
        .filter((l): l is string => !!l)
    )
  ).sort();
}

export function filterVideos(
  videos: Video[],
  filters: { topic?: string; lang?: string }
): Video[] {
  return videos.filter((v) => {
    if (filters.topic && v.topic !== filters.topic) return false;
    if (filters.lang && v.language !== filters.lang) return false;
    return true;
  });
}

export function paginateVideos<T>(items: T[], page: number, perPage: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * perPage;
  const paged = items.slice(start, start + perPage);
  return { items: paged, page: safePage, totalPages, total };
}
