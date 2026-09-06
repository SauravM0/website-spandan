'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Users,
  Files,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { getAdminSession, logout } from '../../lib/api';
import { AdminSessionProvider, AdminUser } from '../admin/AdminSessionContext';
import FocusTrap from '../ui/FocusTrap';
import AdminGlobalSearch from '../admin/AdminGlobalSearch';
import AdminRealtimeBridge from '../admin/AdminRealtimeBridge';
import AdminActionDialog from '../admin/AdminActionDialog';

const navGroups = [
  {
    label: 'Workspace',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard, capability: 'admin.dashboard.read' }],
  },
  {
    label: 'Enquiries',
    items: [
      {
        href: '/admin/patients',
        label: 'Patient Records',
        icon: Users,
        capability: 'admin.patients.read',
      },
      {
        href: '/admin/documents',
        label: 'Medical Documents',
        icon: Files,
        capability: 'admin.documents.read',
      },
    ],
  },
  {
    label: 'Content & Settings',
    items: [
      {
        href: '/admin/privacy-security',
        label: 'Privacy & Security',
        icon: ShieldCheck,
        capability: 'admin.privacy_requests.read',
      },
      {
        href: '/admin/sessions',
        label: 'Sessions',
        icon: ShieldCheck,
        capability: 'admin.security.manage',
      },
    ],
  },
];

function navForUser(user: AdminUser) {
  const capabilities = new Set(user.capabilities || []);
  if (capabilities.size === 0) return navGroups;

  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => capabilities.has(item.capability)),
    }))
    .filter((group) => group.items.length > 0);
}

function pageTitle(pathname: string | null) {
  const allItems = navGroups.flatMap((group) => group.items);
  const current = allItems
    .slice()
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) =>
        pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(`${item.href}/`))
    );
  return current?.label || 'Admin';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerCloseRef = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        setCheckingSession(false);
      })
      .catch(() => {
        if (!active) return;
        router.replace('/admin/login');
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    drawerCloseRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    router.replace('/admin/login');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-bg-alt">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
          <div className="h-14 rounded-md bg-white shadow-sm" />
          <div className="mt-6 h-48 rounded-md bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const visibleNav = navForUser(user);
  const title = pageTitle(pathname);
  const shell = (
    <div className="min-h-screen bg-bg-alt md:grid md:grid-cols-[auto_1fr]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-accent focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <aside
        className={`sticky top-0 hidden h-screen border-r border-border bg-ink text-white shadow-sm md:flex md:flex-col ${
          collapsed ? 'w-[76px]' : 'w-[264px]'
        }`}
      >
        <div className="flex min-h-[64px] items-center justify-between gap-2 border-b border-white/10 px-4">
          {!collapsed && (
            <Link href="/admin" className="min-w-0 truncate text-base font-bold">
              {t('admin_title')}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <AdminNav groups={visibleNav} pathname={pathname} collapsed={collapsed} />

        <div className="mt-auto border-t border-white/10 p-3">
          {!collapsed && (
            <div className="mb-3 min-w-0">
              <p className="truncate text-sm font-semibold">{user.full_name}</p>
              <p className="truncate text-xs capitalize text-white/65">{user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`inline-flex min-h-[40px] w-full items-center rounded-md bg-white/10 text-sm font-semibold hover:bg-white/20 ${
              collapsed ? 'justify-center px-2' : 'gap-2 px-3'
            }`}
            aria-label="Logout"
          >
            <LogOut size={16} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <FocusTrap active={drawerOpen}>
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="relative flex h-full w-[min(88vw,320px)] flex-col bg-ink text-white shadow-xl">
              <div className="flex min-h-[64px] items-center justify-between gap-3 border-b border-white/10 px-4">
                <Link href="/admin" className="min-w-0 truncate text-base font-bold">
                  {t('admin_title')}
                </Link>
                <button
                  type="button"
                  ref={drawerCloseRef}
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>
              <AdminNav groups={visibleNav} pathname={pathname} collapsed={false} />
              <div className="mt-auto border-t border-white/10 p-4">
                <p className="truncate text-sm font-semibold">{user.full_name}</p>
                <p className="mb-3 truncate text-xs capitalize text-white/65">{user.role}</p>
                <button
                  onClick={handleLogout}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-white/10 px-3 text-sm font-semibold hover:bg-white/20"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </aside>
          </div>
        </FocusTrap>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
          <div className="flex min-h-[64px] items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border text-ink hover:bg-bg-alt md:hidden"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-ink">{title}</p>
                <p className="hidden truncate text-xs text-text-light sm:block">
                  Signed in as {user.full_name}
                </p>
              </div>
            </div>
            <AdminRealtimeBridge />
            <AdminGlobalSearch />
            <button
              onClick={handleLogout}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-bg-alt"
              aria-label="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        <main id="admin-main" className="min-w-0" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );

  return (
    <AdminSessionProvider user={user}>
      {shell}
      <AdminActionDialog />
    </AdminSessionProvider>
  );
}

function AdminNav({
  groups,
  pathname,
  collapsed,
}: {
  groups: typeof navGroups;
  pathname: string | null;
  collapsed: boolean;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.label} className="mb-5">
          {!collapsed && (
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
              {group.label}
            </p>
          )}
          <div className="grid gap-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== '/admin' && pathname?.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`inline-flex min-h-[44px] items-center rounded-md text-sm font-semibold transition-colors ${
                    collapsed ? 'justify-center px-2' : 'gap-3 px-3'
                  } ${active ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
