'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, History, Pencil, Plus, X } from 'lucide-react';
import { AdminPageHeader, StatusBadge } from '@/components/admin/AdminPrimitives';
import FocusTrap from '@/components/ui/FocusTrap';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import {
  BillableService,
  BillableServiceInput,
  createAdminServicePrice,
  getAdminServicePricing,
  getDoctors,
  updateAdminServicePrice,
} from '@/lib/api';

const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const emptyForm = (): BillableServiceInput => ({
  code: '',
  name: '',
  description: '',
  category: 'consultation',
  doctor_id: null,
  appointment_type: null,
  price: 0,
  is_active: true,
  is_public: true,
  effective_from: today(),
  change_reason: '',
});

function money(value: unknown) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ServicePricingPage() {
  const { hasCapability } = useAdminSession();
  const canWrite = hasCapability('admin.pricing.write');
  const [services, setServices] = useState<BillableService[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [editing, setEditing] = useState<BillableService | null>(null);
  const [form, setForm] = useState<BillableServiceInput>(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pricing, doctorData] = await Promise.all([getAdminServicePricing(), getDoctors()]);
      setServices(pricing.services || []);
      setDoctors(doctorData.doctors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load service pricing.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  const grouped = useMemo(
    () =>
      services.reduce<Record<string, BillableService[]>>((all, item) => {
        (all[item.category] ||= []).push(item);
        return all;
      }, {}),
    [services]
  );

  const beginCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setMessage('');
    setOpen(true);
  };
  const beginEdit = (service: BillableService) => {
    setEditing(service);
    setForm({
      code: service.code,
      name: service.name,
      description: service.description || '',
      category: service.category,
      doctor_id: service.doctor_id,
      appointment_type: service.appointment_type,
      price: Number(service.price),
      is_active: service.is_active,
      is_public: service.is_public,
      effective_from: String(service.effective_from).slice(0, 10),
      change_reason: '',
    });
    setError('');
    setMessage('');
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editing)
        await updateAdminServicePrice(editing.id, { ...form, expected_version: editing.version });
      else await createAdminServicePrice(form);
      setMessage(
        editing
          ? 'Service price updated. Existing bookings keep their original amount.'
          : 'Service created.'
      );
      await load();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save service.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="py-6 md:py-8">
      <div className="container">
        <Link
          href="/admin/payments"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-accent"
        >
          <ArrowLeft size={16} />
          Back to transactions
        </Link>
        <AdminPageHeader
          title="Service Pricing"
          description="Set prices for future bookings. Existing holds, appointments, payments, and receipts are never repriced."
          action={
            canWrite ? (
              <button type="button" className="btn btn-accent" onClick={beginCreate}>
                <Plus size={16} />
                Add Service
              </button>
            ) : undefined
          }
        />
        {message && (
          <p
            role="status"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-success"
          >
            {message}
          </p>
        )}
        {error && !open && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
        {!canWrite && (
          <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-navy">
            You have read-only access. An administrator or manager must publish price changes.
          </p>
        )}

        {loading ? (
          <div className="h-40 animate-pulse rounded-lg bg-white" />
        ) : services.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center text-text-light">
            No services configured.
          </div>
        ) : (
          <div className="grid gap-6">
            {Object.entries(grouped).map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-3 text-lg font-bold capitalize text-navy">{category}</h2>
                <div className="grid gap-3 lg:grid-cols-2">
                  {items.map((service) => (
                    <article
                      key={service.id}
                      className="rounded-xl border border-border bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-navy">{service.name}</h3>
                            <StatusBadge tone={service.is_active ? 'success' : 'neutral'}>
                              {service.is_active ? 'Active' : 'Inactive'}
                            </StatusBadge>
                          </div>
                          <p className="mt-1 text-sm text-text-light">
                            {service.description || 'No description'}
                          </p>
                        </div>
                        <p className="shrink-0 text-xl font-bold text-navy">
                          {money(service.price)}
                        </p>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-text-light">Applies to</dt>
                          <dd className="font-semibold text-navy">
                            {service.doctor_name || 'All doctors'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-text-light">Visit type</dt>
                          <dd className="font-semibold capitalize text-navy">
                            {service.appointment_type?.replace('_', ' ') || 'All types'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-text-light">Effective</dt>
                          <dd className="font-semibold text-navy">
                            {String(service.effective_from).slice(0, 10)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-text-light">Version</dt>
                          <dd className="font-semibold text-navy">{service.version}</dd>
                        </div>
                      </dl>
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                        <span className="inline-flex items-center gap-1 text-xs text-text-light">
                          <History size={14} />
                          {service.price_history?.length || 0} recorded version(s)
                          {String(service.effective_from).slice(0, 10) > today()
                            ? ' · scheduled'
                            : ''}
                        </span>
                        {canWrite && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => beginEdit(service)}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {open && (
          <FocusTrap>
            <div
              className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pricing-form-title"
            >
              <div className="mx-auto my-6 max-w-2xl rounded-xl bg-white p-5 shadow-xl sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="pricing-form-title" className="text-xl font-bold text-navy">
                      {editing ? 'Edit service' : 'Add service'}
                    </h2>
                    <p className="mt-1 text-sm text-text-light">
                      Changes apply to new slot holds only.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setOpen(false)}
                  >
                    <X size={16} />
                    Close
                  </button>
                </div>
                {error && (
                  <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-danger">
                    {error}
                  </p>
                )}
                <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={save}>
                  <label className="form-group mb-0">
                    <span>Service name</span>
                    <input
                      required
                      maxLength={120}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </label>
                  <label className="form-group mb-0">
                    <span>Stable code</span>
                    <input
                      required
                      pattern="[a-z0-9_]+"
                      placeholder="consultation"
                      disabled={Boolean(editing)}
                      value={form.code}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                        })
                      }
                    />
                  </label>
                  <label className="form-group mb-0 sm:col-span-2">
                    <span>Description</span>
                    <textarea
                      maxLength={500}
                      value={form.description || ''}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </label>
                  <label className="form-group mb-0">
                    <span>Category</span>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    >
                      <option value="consultation">Consultation</option>
                      <option value="counselling">Counselling</option>
                      <option value="diagnostic">Diagnostic</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="form-group mb-0">
                    <span>Price (INR)</span>
                    <input
                      required
                      type="number"
                      min="0"
                      max="10000000"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    />
                  </label>
                  <label className="form-group mb-0">
                    <span>Doctor</span>
                    <select
                      value={form.doctor_id || ''}
                      onChange={(e) => setForm({ ...form, doctor_id: e.target.value || null })}
                    >
                      <option value="">All doctors</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-group mb-0">
                    <span>Appointment type</span>
                    <select
                      value={form.appointment_type || ''}
                      onChange={(e) =>
                        setForm({ ...form, appointment_type: (e.target.value || null) as any })
                      }
                    >
                      <option value="">All types</option>
                      <option value="new">New consultation</option>
                      <option value="follow_up">Follow-up</option>
                    </select>
                  </label>
                  <label className="form-group mb-0">
                    <span>Effective from</span>
                    <input
                      required
                      type="date"
                      value={form.effective_from}
                      onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                    />
                  </label>
                  <label className="form-group mb-0">
                    <span>Reason for change</span>
                    <input
                      required
                      minLength={5}
                      maxLength={300}
                      placeholder="Annual price review"
                      value={form.change_reason}
                      onChange={(e) => setForm({ ...form, change_reason: e.target.value })}
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                    <span className="text-sm font-semibold text-navy">
                      Available for new charges
                    </span>
                  </label>
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.is_public}
                      onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                    />
                    <span className="text-sm font-semibold text-navy">Visible to patients</span>
                  </label>
                  <div className="sm:col-span-2 rounded-lg bg-blue-50 p-3 text-sm text-navy">
                    Saving creates a new audited version. It does not change an existing booking or
                    transaction.
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <button type="submit" className="btn btn-accent" disabled={saving}>
                      {saving ? 'Saving...' : 'Save price'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </FocusTrap>
        )}
      </div>
    </section>
  );
}
