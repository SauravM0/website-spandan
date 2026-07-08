'use client';

import React, { useEffect, useRef, useState } from 'react';
import { clinicSettings } from '@/lib/settings';

const MAP_QUERY = `https://www.google.com/maps?q=${clinicSettings.mapQuery}&output=embed`;

export default function LazyMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-[320px] w-full" aria-label={`Map showing ${clinicSettings.name} location`}>
      {visible ? (
        <iframe
          title={`${clinicSettings.name} location map`}
          src={MAP_QUERY}
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-bg-alt text-sm text-text-light">
          Loading map...
        </div>
      )}
    </div>
  );
}
