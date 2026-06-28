'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

export default function ConsentBanner() {
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem('consent_banner');
    if (!consented) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('consent_banner', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-navy text-white p-4 z-50 shadow-lg">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-sm md:text-base">
          We use cookies and similar technologies to improve your experience. By continuing, you agree to our{' '}
          <a href="/privacy" className="underline text-[#E8A33D] hover:text-white">Privacy Policy</a>.
        </p>
        <button
          onClick={accept}
          className="btn bg-accent text-white hover:bg-accent-light whitespace-nowrap"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
