'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('admin_user');
    if (u) setUser(JSON.parse(u));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-navy text-white py-3">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/leads" className="font-bold text-lg">{t('admin_title')}</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/admin/leads" className="opacity-80 hover:opacity-100 transition-opacity">Leads</Link>
              <Link href="/admin/packages" className="opacity-80 hover:opacity-100 transition-opacity">Packages</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {user && <span className="text-xs opacity-80">{user.full_name} ({user.role})</span>}
            <button onClick={handleLogout} className="text-sm bg-white/20 px-3 py-1.5 rounded hover:bg-white/30 transition-colors min-h-[44px]">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
