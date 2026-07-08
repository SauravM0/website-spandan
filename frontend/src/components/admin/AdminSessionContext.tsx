'use client';

import React, { createContext, useContext } from 'react';

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  doctor_id?: string | null;
  capabilities?: string[];
  session_expires_at?: string | null;
};

type AdminSessionContextValue = {
  user: AdminUser;
  capabilities: Set<string>;
  hasCapability: (capability: string) => boolean;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({
  user,
  children,
}: {
  user: AdminUser;
  children: React.ReactNode;
}) {
  const capabilities = new Set(user.capabilities || []);

  return (
    <AdminSessionContext.Provider
      value={{
        user,
        capabilities,
        hasCapability: (capability) => capabilities.has(capability),
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);
  if (!context) {
    throw new Error('useAdminSession must be used inside AdminSessionProvider');
  }
  return context;
}
