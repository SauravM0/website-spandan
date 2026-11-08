'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Eye, Calendar, Clock } from 'lucide-react';
import type { Video } from '@/lib/videos';
import { formatDuration, formatViewCount } from '@/lib/videos';

export default function VideoCard({ video }: { video: Video }) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (loaded && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [loaded]);

  const duration = formatDuration(video.duration);
  const viewCount = formatViewCount(video.viewCount);
  const publishedDate = video.publishedAt
    ? new Date(video.publishedAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <article className="card overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-wash-pink">
        {!loaded ? (
          <button
            onClick={() => setLoaded(true)}
            className="group absolute inset-0 w-full h-full cursor-pointer border-none p-0"
            aria-label={`Play video: ${video.title}`}
          >
            {video.thumbnail ? (
              <img
                src={video.thumbnail}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-wash-pink">
                <span className="text-sm text-text-light">No thumbnail</span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-accent to-primary shadow-lg transition-transform group-hover:scale-110">
                <svg className="ml-1 h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            {duration && (
              <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                <Clock className="mr-1 inline-block h-3 w-3 align-text-bottom" aria-hidden="true" />
                {duration}
              </span>
            )}
          </button>
        ) : (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            tabIndex={0}
            className="absolute inset-0 h-full w-full"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {video.topic && (
          <span className="mb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-accent">
            {video.topic}
          </span>
        )}
        <h3 className="mb-2 text-sm font-bold leading-snug text-ink line-clamp-2">
          {video.title}
        </h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-light">
          {viewCount && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {viewCount} views
            </span>
          )}
          {video.language && (
            <span className="inline-flex items-center gap-1 rounded bg-bg-alt px-1.5 py-0.5 text-[11px] font-medium uppercase">
              {video.language}
            </span>
          )}
          {publishedDate && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {publishedDate}
            </span>
          )}
          {video.isReviewed && (
            <span className="inline-flex items-center gap-1 text-success">
              Reviewed
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
