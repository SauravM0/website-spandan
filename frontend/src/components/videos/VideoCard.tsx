'use client';

import React, { useState } from 'react';
import { Eye, Calendar } from 'lucide-react';

export default function VideoCard({ video }: { video: any }) {
  const [loaded, setLoaded] = useState(false);

  const publishedDate = new Date(video.publishedAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-black">
        {!loaded ? (
          <button
            onClick={() => setLoaded(true)}
            className="absolute inset-0 w-full h-full cursor-pointer border-none p-0"
            aria-label={`Play ${video.title}`}
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
              <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </button>
        ) : (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-navy leading-snug line-clamp-2 mb-2">
          {video.title}
        </h3>
        <div className="mt-auto flex items-center gap-3 text-xs text-text-light">
          {video.viewCount && (
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {parseInt(video.viewCount).toLocaleString('en-IN')} views
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {publishedDate}
          </span>
        </div>
      </div>
    </div>
  );
}
