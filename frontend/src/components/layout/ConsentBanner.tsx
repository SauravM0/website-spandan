'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('consent_banner');
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('consent_banner', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink p-3 text-white shadow-lg">
      <div className="container flex items-center justify-between gap-3">
        <p className="text-xs leading-relaxed md:text-sm">
          This site uses only essential storage for session and preferences. No tracking cookies are used.
          By continuing, you agree to our{' '}
          <a href="/legal#privacy" className="inline-flex min-h-[44px] items-center underline text-accent hover:text-white">Privacy Policy</a>.
        </p>
        <button
          onClick={dismiss}
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
          aria-label="Dismiss notice"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
