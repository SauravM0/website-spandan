import React from 'react';
import type { Metadata } from 'next';
import VideoCard from '../../components/videos/VideoCard';
import { serverApiGet } from '../../lib/serverApi';

function YoutubeIcon({ size, className }: { size?: number; className?: string }) {
  return (
    <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.5 6.2c-.3-1.1-1.1-1.9-2.2-2.2C19.7 3.5 12 3.5 12 3.5s-7.7 0-9.3.5c-1.1.3-1.9 1.1-2.2 2.2C0 7.8 0 12 0 12s0 4.2.5 5.8c.3 1.1 1.1 1.9 2.2 2.2 1.6.5 9.3.5 9.3.5s7.7 0 9.3-.5c1.1-.3 1.9-1.1 2.2-2.2.5-1.6.5-5.8.5-5.8s0-4.2-.5-5.8zM9.5 15.5V8.5l6.2 3.5-6.2 3.5z" />
    </svg>
  );
}

async function getVideos() {
  return serverApiGet<{ videos: any[]; channel: { channelUrl: string } | null }>(
    '/youtube',
    { videos: [], channel: null },
    { next: { revalidate: 3600 } }
  );
}

export const metadata: Metadata = {
  title: 'Videos | Spandan Super Speciality Clinic',
  description: 'Watch health education videos from Dr. Pratibha Pawal-Aute on diabetes, thyroid, heart health, and more from Spandan Clinic, Chhatrapati Sambhajinagar.',
  openGraph: {
    title: 'Health Videos | Spandan Clinic',
    description: 'Expert health education videos from our specialists.',
  },
};

export default async function VideosPage() {
  const data = await getVideos();
  const videos = data.videos || [];

  return (
    <>
      <section className="bg-navy text-white py-16 text-center">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Health Videos</h1>
          <p className="opacity-85 text-lg">Expert health education from our specialists</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {videos.length > 0 ? (
            <>
              <div className="grid-3">
                {videos.map((video: any) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
              {data.channel && (
                <div className="text-center mt-12">
                  <a
                    href={data.channel.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn bg-accent text-white hover:bg-accent-light inline-flex items-center gap-2"
                  >
                    <YoutubeIcon size={20} />
                    Subscribe on YouTube
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <YoutubeIcon size={48} className="mx-auto text-text-light mb-4" />
              <p className="text-text-light mb-4">Health education videos are available through our clinic channel.</p>
              {data.channel && (
                <a
                  href={data.channel.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn bg-accent text-white hover:bg-accent-light inline-flex items-center gap-2"
                >
                  <YoutubeIcon size={20} />
                  Visit YouTube Channel
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
