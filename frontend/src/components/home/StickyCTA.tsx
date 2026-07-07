'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, HeartPulse, MessageCircle, Phone } from 'lucide-react';

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
      <div className="grid grid-cols-4 gap-2">
        <Link href="/book-appointment" className="btn btn-accent justify-center px-2 text-xs">
          <CalendarCheck size={16} />
          Appointment
        </Link>
        <Link href="/book-package" className="btn btn-outline justify-center px-2 text-xs">
          <HeartPulse size={16} />
          Packages
        </Link>
        <a href="tel:+917798095795" className="btn btn-outline justify-center px-2 text-xs">
          <Phone size={16} />
          Call
        </a>
        <a
          href="https://wa.me/917798095795"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline justify-center px-2 text-xs"
        >
          <MessageCircle size={16} />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
