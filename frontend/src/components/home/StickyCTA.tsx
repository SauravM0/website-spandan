'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, MessageCircle, Phone } from 'lucide-react';

const HIDE_PATHS = ['/book-appointment', '/book-package', '/payment/', '/admin'];

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
      className="fixed bottom-0 left-0 right-0 z-40 bg-white p-3 shadow-[0_-10px_30px_rgba(23,58,94,0.10)] transition-transform duration-300 supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-3 gap-2">
        <Link href="/book-appointment" className="btn btn-accent min-h-[44px] justify-center text-xs">
          <CalendarCheck size={16} />
          Book
        </Link>
        <a href="tel:+917798095795" className="btn btn-outline min-h-[44px] justify-center text-xs">
          <Phone size={16} />
          Call
        </a>
        <a
          href="https://wa.me/917798095795"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline min-h-[44px] justify-center text-xs"
        >
          <MessageCircle size={16} />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
