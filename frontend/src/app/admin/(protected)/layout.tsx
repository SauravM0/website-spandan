import React from 'react';
import AdminShell from '@/components/layout/AdminLayout';

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
