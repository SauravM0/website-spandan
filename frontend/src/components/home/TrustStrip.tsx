'use client';

import React, { useEffect, useRef, useState } from 'react';

function CountUp({ end, suffix = '', label }: { end: number; suffix?: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const duration = 1500;
          const steps = 30;
          const increment = end / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-extrabold text-accent mb-1">
        {count}{suffix}
      </div>
      <div className="text-sm text-text-light font-medium">{label}</div>
    </div>
  );
}

export default function TrustStrip() {
  const stats = [
    { end: 14, suffix: '+', label: 'Years in Practice' },
    { end: 50000, suffix: '+', label: 'Patients Served' },
    { end: 6, suffix: '', label: 'Advanced Diagnostics' },
    { end: 15, suffix: '+', label: 'Published Research' },
  ];

  return (
    <section className="bg-bg-alt py-12">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <CountUp key={stat.label} end={stat.end} suffix={stat.suffix} label={stat.label} />
          ))}
        </div>
      </div>
    </section>
  );
}
