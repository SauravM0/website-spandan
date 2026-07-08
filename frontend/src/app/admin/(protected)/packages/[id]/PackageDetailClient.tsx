'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getAdminPackageDetail, updateAdminPackage } from '@/lib/api';

type PackageForm = {
  name: string;
  slug: string;
  category: string;
  short_description: string;
  description: string;
  base_price: string;
  discounted_price: string;
  tax_applicable: boolean;
  tax_name: string;
  tax_rate: string;
  convenience_fee: string;
  gateway_fee_policy: string;
  purchase_status: string;
  purchase_enabled: boolean;
  is_active: boolean;
  is_featured: boolean;
  publication_status: string;
  badge_text: string;
  discount_label: string;
  prep_instructions: string;
  terms_text: string;
  no_refund_text: string;
  consultation_included: boolean;
  fasting_required: boolean;
  fasting_hours: string;
  fasting_duration: string;
  age_sex_applicability: string;
  exclusions: string;
  report_turnaround: string;
  medical_disclaimer: string;
  available_days: string;
  blackout_dates: string;
  max_bookings_per_day: string;
  preferred_date_required: boolean;
  date_optional: boolean;
  display_order: string;
  effective_start: string;
  effective_end: string;
  primary_doctor_id: string;
  test_category: string;
};

type TestItem = {
  id?: string;
  test_name: string;
  test_category: string;
  description: string;
};

function pkgToForm(pkg: any): PackageForm {
  return {
    name: pkg.name || '',
    slug: pkg.slug || '',
    category: pkg.category || '',
    short_description: pkg.short_description || '',
    description: pkg.description || '',
    base_price: pkg.base_price?.toString() || '0',
    discounted_price: pkg.discounted_price != null ? pkg.discounted_price.toString() : '',
    tax_applicable: pkg.tax_applicable ?? false,
    tax_name: pkg.tax_name || '',
    tax_rate: pkg.tax_rate?.toString() || '0',
    convenience_fee: pkg.convenience_fee?.toString() || '0',
    gateway_fee_policy: pkg.gateway_fee_policy || '',
    purchase_status: pkg.purchase_status || 'available',
    purchase_enabled: pkg.purchase_enabled ?? true,
    is_active: pkg.is_active ?? true,
    is_featured: pkg.is_featured ?? false,
    publication_status: pkg.publication_status || 'draft',
    badge_text: pkg.badge_text || '',
    discount_label: pkg.discount_label || '',
    prep_instructions: pkg.prep_instructions || '',
    terms_text: pkg.terms_text || '',
    no_refund_text: pkg.no_refund_text || '',
    consultation_included: pkg.consultation_included ?? false,
    fasting_required: pkg.fasting_required ?? false,
    fasting_hours: pkg.fasting_hours?.toString() || '',
    fasting_duration: pkg.fasting_duration || '',
    age_sex_applicability: pkg.age_sex_applicability || '',
    exclusions: pkg.exclusions || '',
    report_turnaround: pkg.report_turnaround || '',
    medical_disclaimer: pkg.medical_disclaimer || '',
    available_days: Array.isArray(pkg.available_days) ? pkg.available_days.join(', ') : '',
    blackout_dates: Array.isArray(pkg.blackout_dates) ? pkg.blackout_dates.join(', ') : '',
    max_bookings_per_day: pkg.max_bookings_per_day?.toString() || '',
    preferred_date_required: pkg.preferred_date_required ?? false,
    date_optional: pkg.date_optional ?? true,
    display_order: pkg.display_order?.toString() || '0',
    effective_start: pkg.effective_start ? pkg.effective_start.slice(0, 10) : '',
    effective_end: pkg.effective_end ? pkg.effective_end.slice(0, 10) : '',
    primary_doctor_id: pkg.primary_doctor_id || '',
    test_category: pkg.test_category || '',
  };
}

function formToPayload(form: PackageForm, tests: TestItem[]): Record<string, unknown> {
  const availableDays = form.available_days
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  const blackoutDates = form.blackout_dates
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);

  return {
    name: form.name,
    slug: form.slug,
    category: form.category,
    short_description: form.short_description || null,
    description: form.description || null,
    base_price: Number(form.base_price),
    discounted_price: form.discounted_price ? Number(form.discounted_price) : null,
    tax_applicable: form.tax_applicable,
    tax_name: form.tax_name || null,
    tax_rate: Number(form.tax_rate),
    convenience_fee: Number(form.convenience_fee),
    gateway_fee_policy: form.gateway_fee_policy || null,
    purchase_status: form.purchase_status,
    purchase_enabled: form.purchase_enabled,
    is_active: form.is_active,
    is_featured: form.is_featured,
    publication_status: form.publication_status,
    badge_text: form.badge_text || null,
    discount_label: form.discount_label || null,
    prep_instructions: form.prep_instructions || null,
    terms_text: form.terms_text || null,
    no_refund_text: form.no_refund_text || null,
    consultation_included: form.consultation_included,
    fasting_required: form.fasting_required,
    fasting_hours: form.fasting_hours ? Number(form.fasting_hours) : null,
    fasting_duration: form.fasting_duration || null,
    age_sex_applicability: form.age_sex_applicability || null,
    exclusions: form.exclusions || null,
    report_turnaround: form.report_turnaround || null,
    medical_disclaimer: form.medical_disclaimer || null,
    available_days: availableDays.length ? availableDays : null,
    blackout_dates: blackoutDates.length ? blackoutDates : null,
    max_bookings_per_day: form.max_bookings_per_day ? Number(form.max_bookings_per_day) : null,
    preferred_date_required: form.preferred_date_required,
    date_optional: form.date_optional,
    display_order: Number(form.display_order),
    effective_start: form.effective_start || null,
    effective_end: form.effective_end || null,
    primary_doctor_id: form.primary_doctor_id || null,
    test_category: form.test_category || null,
    tests: tests.map((t) => ({
      test_name: t.test_name,
      test_category: t.test_category || null,
      description: t.description || null,
    })),
  };
}

export default function PackageDetailClient({ id }: { id: string }) {
  const [pkg, setPkg] = useState<any>(null);
  const [form, setForm] = useState<PackageForm | null>(null);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dirty, setDirty] = useState(false);
  const requestRef = useRef(0);
  const initialFormRef = useRef<string>('');

  const load = useCallback(async () => {
    const reqId = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await getAdminPackageDetail('', id);
      if (reqId !== requestRef.current) return;
      const p = res.package;
      setPkg(p);
      const f = pkgToForm(p);
      setForm(f);
      setTests(
        (p.tests || []).map((t: any) => ({
          id: t.id,
          test_name: t.test_name,
          test_category: t.test_category || '',
          description: t.description || '',
        }))
      );
      initialFormRef.current = JSON.stringify({ form: f, tests: p.tests || [] });
      setDirty(false);
    } catch (err) {
      if (reqId !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load package.');
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = useCallback(
    (patch: Partial<PackageForm>) => {
      setForm((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        const currentStr = JSON.stringify({ form: next, tests });
        setDirty(currentStr !== initialFormRef.current);
        return next;
      });
    },
    [tests]
  );

  const updateTests = useCallback(
    (newTests: TestItem[]) => {
      setTests(newTests);
      const currentStr = JSON.stringify({ form, tests: newTests });
      setDirty(currentStr !== initialFormRef.current);
    },
    [form]
  );

  const handleAddTest = () => {
    updateTests([...tests, { test_name: '', test_category: '', description: '' }]);
  };

  const handleRemoveTest = (index: number) => {
    updateTests(tests.filter((_, i) => i !== index));
  };

  const handleTestChange = (index: number, field: keyof TestItem, value: string) => {
    const updated = tests.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    updateTests(updated);
  };

  const handleTestMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= tests.length) return;
    const updated = [...tests];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    updateTests(updated);
  };

  const handleSave = async () => {
    if (!form || !pkg) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = formToPayload(form, tests);
      await updateAdminPackage('', id, payload, pkg.version);
      setSuccess('Package saved successfully.');
      setDirty(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save package.';
      if (message.includes('409') || message.includes('CONFLICT') || message.includes('modified')) {
        setError('This package was modified by another user. Please review changes and save again.');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    updateForm({ [name]: type === 'checkbox' ? checked : value } as any);
  };

  const formatPrice = (val: string) => {
    const n = Number(val);
    return Number.isFinite(n) ? `₹${n.toLocaleString()}` : '';
  };

  if (loading) {
    return (
      <section className="py-8">
        <div className="container max-w-[900px]">
          <div className="mb-6 h-10 w-64 animate-pulse rounded bg-white" />
          <div className="mb-6 h-64 animate-pulse rounded-xl bg-white" />
          <div className="h-48 animate-pulse rounded-xl bg-white" />
        </div>
      </section>
    );
  }

  if (error && !pkg) {
    return (
      <section className="py-8">
        <div className="container max-w-[900px]">
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-center">
            <p className="text-sm font-semibold text-danger">{error}</p>
            <button type="button" onClick={load} className="btn btn-outline mt-4">
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!pkg || !form) {
    return (
      <section className="py-8">
        <div className="container max-w-[900px]">
          <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-text-light">
            Package not found.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 md:py-8">
      <div className="container max-w-[900px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-navy sm:text-2xl">{pkg.name}</h1>
            <p className="text-sm text-text-light">
              v{pkg.version} &middot; {pkg.category} &middot; {pkg.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Unsaved changes
              </span>
            )}
            <a
              href={`/packages/${pkg.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
            >
              Preview
            </a>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="btn btn-primary btn-sm min-h-10"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>
        )}
        {success && (
          <p className="mb-4 rounded-md bg-success/10 p-3 text-sm font-semibold text-success">{success}</p>
        )}

        <div className="space-y-6">
          {/* Identity */}
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-navy">Identity</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-group">
                <label>Name *</label>
                <input name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Slug</label>
                <input name="slug" value={form.slug} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input name="category" value={form.category} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Test Category</label>
                <input name="test_category" value={form.test_category} onChange={handleChange} />
              </div>
              <div className="form-group sm:col-span-2">
                <label>Short Description</label>
                <textarea name="short_description" value={form.short_description} onChange={handleChange} rows={2} />
              </div>
              <div className="form-group sm:col-span-2">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={4} />
              </div>
              <div className="form-group">
                <label>Display Order</label>
                <input name="display_order" type="number" min="0" value={form.display_order} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Primary Doctor ID</label>
                <input name="primary_doctor_id" value={form.primary_doctor_id} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Tests */}
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Tests</h2>
              <button type="button" onClick={handleAddTest} className="btn btn-outline btn-sm">
                + Add test
              </button>
            </div>
            {tests.length === 0 ? (
              <p className="text-sm text-text-light">No tests added yet.</p>
            ) : (
              <div className="space-y-3">
                {tests.map((test, index) => (
                  <div key={index} className="flex flex-wrap items-start gap-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => handleTestMove(index, index - 1)}
                        disabled={index === 0}
                        className="btn btn-outline btn-sm min-h-[28px] min-w-[28px] p-0"
                        aria-label="Move up"
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestMove(index, index + 1)}
                        disabled={index === tests.length - 1}
                        className="btn btn-outline btn-sm min-h-[28px] min-w-[28px] p-0"
                        aria-label="Move down"
                      >
                        &darr;
                      </button>
                    </div>
                    <div className="flex-1 grid gap-2 sm:grid-cols-3">
                      <div className="form-group mb-0">
                        <label className="text-xs">Test Name *</label>
                        <input
                          value={test.test_name}
                          onChange={(e) => handleTestChange(index, 'test_name', e.target.value)}
                          className="w-full rounded border border-border p-2 text-sm"
                          placeholder="e.g. Complete Blood Count"
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label className="text-xs">Category</label>
                        <input
                          value={test.test_category}
                          onChange={(e) => handleTestChange(index, 'test_category', e.target.value)}
                          className="w-full rounded border border-border p-2 text-sm"
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label className="text-xs">Description</label>
                        <input
                          value={test.description}
                          onChange={(e) => handleTestChange(index, 'description', e.target.value)}
                          className="w-full rounded border border-border p-2 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTest(index)}
                      className="btn btn-outline btn-sm text-danger"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-navy">Pricing</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="form-group">
                <label>Base Price *</label>
                <input name="base_price" type="number" min="0" step="0.01" value={form.base_price} onChange={handleChange} required />
                <p className="mt-1 text-xs text-text-light">{formatPrice(form.base_price)}</p>
              </div>
              <div className="form-group">
                <label>Discounted Price</label>
                <input name="discounted_price" type="number" min="0" step="0.01" value={form.discounted_price} onChange={handleChange} />
                {form.discounted_price && <p className="mt-1 text-xs text-text-light">{formatPrice(form.discounted_price)}</p>}
              </div>
              <div className="form-group">
                <label>Discount Label</label>
                <input name="discount_label" value={form.discount_label} onChange={handleChange} placeholder="e.g. 20% off" />
              </div>
              <div className="form-group">
                <label>Tax Rate (%)</label>
                <input name="tax_rate" type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Tax Name</label>
                <input name="tax_name" value={form.tax_name} onChange={handleChange} placeholder="e.g. GST" />
              </div>
              <div className="form-group">
                <label>Convenience Fee</label>
                <input name="convenience_fee" type="number" min="0" step="0.01" value={form.convenience_fee} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Gateway Fee Policy</label>
                <input name="gateway_fee_policy" value={form.gateway_fee_policy} onChange={handleChange} placeholder="e.g. included" />
              </div>
              <div className="form-group">
                <label>Max Bookings / Day</label>
                <input name="max_bookings_per_day" type="number" min="1" value={form.max_bookings_per_day} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" name="tax_applicable" checked={form.tax_applicable} onChange={handleChange} className="mr-2" />
                  Tax Applicable
                </label>
              </div>
            </div>
          </div>

          {/* Validity */}
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-navy">Validity</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-group">
                <label>Effective From</label>
                <input name="effective_start" type="date" value={form.effective_start} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Effective Until</label>
                <input name="effective_end" type="date" value={form.effective_end} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Available Days</label>
                <input name="available_days" value={form.available_days} onChange={handleChange} placeholder="Monday, Tuesday, ..." />
              </div>
              <div className="form-group">
                <label>Blackout Dates</label>
                <input name="blackout_dates" value={form.blackout_dates} onChange={handleChange} placeholder="YYYY-MM-DD, YYYY-MM-DD" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="preferred_date_required" checked={form.preferred_date_required} onChange={handleChange} />
                  Preferred Date Required
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="date_optional" checked={form.date_optional} onChange={handleChange} />
                  Date Optional
                </label>
              </div>
            </div>
          </div>

          {/* Preparation */}
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-navy">Preparation & Suitability</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-group sm:col-span-2">
                <label>Prep Instructions</label>
                <textarea name="prep_instructions" value={form.prep_instructions} onChange={handleChange} rows={3} />
              </div>
              <div className="form-group">
                <label>Age / Sex Applicability</label>
                <input name="age_sex_applicability" value={form.age_sex_applicability} onChange={handleChange} placeholder="e.g. All ages, Both genders" />
              </div>
              <div className="form-group">
                <label>Exclusions</label>
                <input name="exclusions" value={form.exclusions} onChange={handleChange} placeholder="e.g. Not for pregnant women" />
              </div>
              <div className="form-group">
                <label>Fasting Duration</label>
                <input name="fasting_duration" value={form.fasting_duration} onChange={handleChange} placeholder="e.g. 8-12 hours" />
              </div>
              <div className="form-group">
                <label>Fasting Hours</label>
                <input name="fasting_hours" type="number" min="0" max="24" value={form.fasting_hours} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Report Turnaround</label>
                <input name="report_turnaround" value={form.report_turnaround} onChange={handleChange} placeholder="e.g. 24-48 hours" />
              </div>
              <div className="form-group sm:col-span-2">
                <label>Medical Disclaimer</label>
                <textarea name="medical_disclaimer" value={form.medical_disclaimer} onChange={handleChange} rows={2} />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="consultation_included" checked={form.consultation_included} onChange={handleChange} />
                  Consultation Included
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="fasting_required" checked={form.fasting_required} onChange={handleChange} />
                  Fasting Required
                </label>
              </div>
            </div>
          </div>

          {/* Publish */}
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-navy">Publish</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="form-group">
                <label>Publication Status</label>
                <select name="publication_status" value={form.publication_status} onChange={handleChange}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div className="form-group">
                <label>Purchase Status</label>
                <select name="purchase_status" value={form.purchase_status} onChange={handleChange}>
                  <option value="available">Available</option>
                  <option value="temporarily_unavailable">Temporarily Unavailable</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
              <div className="form-group">
                <label>Badge Text</label>
                <input name="badge_text" value={form.badge_text} onChange={handleChange} placeholder="e.g. Popular" />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                  Active
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleChange} />
                  Featured
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="purchase_enabled" checked={form.purchase_enabled} onChange={handleChange} />
                  Purchase Enabled
                </label>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-navy">Terms & Policies</h2>
            <div className="grid gap-4">
              <div className="form-group">
                <label>Terms Text</label>
                <textarea name="terms_text" value={form.terms_text} onChange={handleChange} rows={3} />
              </div>
              <div className="form-group">
                <label>No-Refund Acknowledgement</label>
                <textarea name="no_refund_text" value={form.no_refund_text} onChange={handleChange} rows={2} />
              </div>
            </div>
          </div>

          {/* Save footer */}
          <div className="sticky bottom-0 -mx-4 border-t border-border bg-white p-4 sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-text-light">
                {dirty ? (
                  <span className="font-semibold text-amber-700">Unsaved changes</span>
                ) : (
                  <span>All changes saved</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="btn btn-primary min-h-10"
              >
                {saving ? 'Saving...' : 'Save package'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
