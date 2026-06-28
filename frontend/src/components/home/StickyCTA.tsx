'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('section');
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border p-3 shadow-lg transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
    >
      <div className="flex gap-3">
        <Link
          href="/contact"
          className="btn btn-accent flex-1 justify-center text-sm"
        >
          Enquire Now
        </Link>
        <Link
          href="/packages"
          className="btn btn-outline flex-1 justify-center text-sm"
        >
          View Packages
        </Link>
      </div>
    </div>
  );
}
