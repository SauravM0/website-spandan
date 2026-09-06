'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Phone } from 'lucide-react';
import { clinicLinks } from '@/lib/settings';
import Button from '@/components/ui/Button';

const HIDE_PATHS = ['/admin'];

export default function StickyCTA() {
  const pathname = usePathname();
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('section');
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPast(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const hide = HIDE_PATHS.some((p) => pathname?.startsWith(p));
  if (hide || !scrolledPast) return null;

  return (
    <div
      className="sticky-bar fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white p-3 supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-2 gap-2">
        <Button href={clinicLinks.phone} variant="accent" className="min-h-[44px] justify-center text-xs">
          <Phone size={16} />
          Call
        </Button>
        <Button
          href={clinicLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          className="min-h-[44px] justify-center text-xs"
        >
          <MessageCircle size={16} />
          WhatsApp
        </Button>
      </div>
    </div>
  );
}
