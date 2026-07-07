'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { logout } from '../../lib/api';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/admin/appointments', label: 'Appointments', icon: ClipboardList },
  { href: '/admin/package-orders', label: 'Package Orders', icon: Package },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/leads', label: 'Patients', icon: Users },
  { href: '/admin/packages', label: 'Packages', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const u = localStorage.getItem('admin_user');
    if (u) setUser(JSON.parse(u));
  }, []);

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-bg-alt">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy text-white shadow-sm">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <Link href="/admin" className="truncate text-base font-bold sm:text-lg">
              {t('admin_title')}
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-white/15 px-3 text-sm hover:bg-white/25 lg:hidden"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 text-xs sm:text-sm lg:mx-0 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-md px-3 font-semibold transition-colors ${
                    active ? 'bg-white text-navy' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-4 lg:flex">
            {user && <span className="text-xs opacity-80">{user.full_name} ({user.role})</span>}
            <button onClick={handleLogout} className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-white/15 px-3 text-sm font-semibold hover:bg-white/25">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
