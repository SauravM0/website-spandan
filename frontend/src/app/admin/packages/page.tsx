'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/layout/AdminLayout';
import { getAdminPackages } from '../../../lib/api';

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    getAdminPackages(token)
      .then(d => setPackages(d.packages))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <section className="py-8">
        <div className="container">
          <h1 className="text-2xl font-bold text-navy mb-6">Package Management</h1>
          {loading ? (
            <p className="text-center text-text-light">Loading...</p>
          ) : packages.length === 0 ? (
            <p className="text-center text-text-light">No packages found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-border text-left">
                    <th className="p-3">Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Base Price</th>
                    <th className="p-3">Discounted Price</th>
                    <th className="p-3">Active</th>
                    <th className="p-3">Featured</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg: any) => (
                    <tr key={pkg.slug} className="border-b border-border hover:bg-bg-alt transition-colors">
                      <td className="p-3 font-semibold">{pkg.name}</td>
                      <td className="p-3 capitalize">{pkg.category}</td>
                      <td className="p-3">₹{pkg.base_price}</td>
                      <td className="p-3">{pkg.discounted_price ? `₹${pkg.discounted_price}` : '—'}</td>
                      <td className="p-3">{pkg.is_active ? '✅' : '❌'}</td>
                      <td className="p-3">{pkg.is_featured ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
