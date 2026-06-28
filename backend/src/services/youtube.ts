const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: string;
}

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        high?: { url: string };
        medium?: { url: string };
      };
      publishedAt: string;
    };
  }>;
}

interface YouTubeStatsResponse {
  items: Array<{
    id: string;
    statistics: {
      viewCount?: string;
    };
  }>;
}

let cachedVideos: YouTubeVideo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000;

export async function getChannelVideos(maxResults = 12): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    return [];
  }

  if (cachedVideos && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedVideos;
  }

  try {
    const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${channelId}&order=date&maxResults=${maxResults}&type=video&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      console.error('YouTube API search error:', searchRes.status);
      return cachedVideos || [];
    }
    const searchData = await searchRes.json() as YouTubeSearchResponse;

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    const statsUrl = `${YOUTUBE_API_BASE}/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
    const statsRes = await fetch(statsUrl);
    let statsMap: Record<string, YouTubeStatsResponse['items'][number]['statistics']> = {};
    if (statsRes.ok) {
      const statsData = await statsRes.json() as YouTubeStatsResponse;
      for (const item of statsData.items) {
        statsMap[item.id] = item.statistics;
      }
    }

    const videos: YouTubeVideo[] = searchData.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || '',
      publishedAt: item.snippet.publishedAt,
      viewCount: statsMap[item.id.videoId]?.viewCount || '0',
    }));

    cachedVideos = videos;
    cacheTimestamp = Date.now();
    return videos;
  } catch (error) {
    console.error('YouTube fetch error:', error);
    return cachedVideos || [];
  }
}
