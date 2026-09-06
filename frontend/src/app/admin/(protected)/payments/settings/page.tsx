'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, ShieldAlert } from 'lucide-react';
import { AdminPageHeader, StatusBadge } from '@/components/admin/AdminPrimitives';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import {
  createAdminPaymentSettings,
  getAdminPaymentSettings,
  type PaymentConfigurationInput,
} from '@/lib/api';
import Button from '@/components/ui/Button';

export default function PaymentSettingsPage() {
  const { hasCapability } = useAdminSession();
  const canWrite = hasCapability('admin.payment_settings.write');
  const [form, setForm] = useState<PaymentConfigurationInput | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const result = await getAdminPaymentSettings();
      setHistory(result.configurations || []);
      if (result.active) {
        setForm({
          payment_mode: result.active.payment_mode,
          direct_upi_enabled: Boolean(result.active.direct_upi_enabled),
          gateway_enabled: Boolean(result.active.gateway_enabled),
          active_provider: result.active.active_provider,
          merchant_upi_vpa: result.active.merchant_upi_vpa,
          merchant_display_name: result.active.merchant_display_name,
          merchant_payment_contact: result.active.merchant_payment_contact,
          merchant_category: result.active.merchant_category,
          upi_transaction_note_template: result.active.upi_transaction_note_template,
          payment_order_expiry_minutes: Number(result.active.payment_order_expiry_minutes),
          verification_reservation_minutes: Number(result.active.verification_reservation_minutes),
          utr_required: true,
          screenshot_enabled: Boolean(result.active.screenshot_enabled),
          screenshot_required: Boolean(result.active.screenshot_required),
          pay_at_clinic_enabled: Boolean(result.active.pay_at_clinic_enabled),
          effective_from: new Date().toISOString(),
          change_reason: '',
        });
      } else {
        setError('No bootstrap payment configuration exists. Apply the current database migration before editing settings.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load payment settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await createAdminPaymentSettings({
        ...form,
        merchant_upi_vpa: form.merchant_upi_vpa || null,
        merchant_display_name: form.merchant_display_name || null,
        merchant_payment_contact: form.merchant_payment_contact || null,
        merchant_category: form.merchant_category || null,
        upi_transaction_note_template: form.upi_transaction_note_template || null,
        effective_from: new Date(form.effective_from).toISOString(),
      });
      setMessage('A new immutable payment configuration version was activated. Existing payments were not changed.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save payment settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="py-6">
      <div className="container max-w-[1100px]">
        <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary" href="/admin/payments">
          <ArrowLeft size={16} /> Back to payments
        </Link>
        <AdminPageHeader
          title="Payment Settings"
          description="Activate one payment provider and publish versioned merchant instructions for new payments."
        />

        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <p>
            Direct UPI also requires the server emergency kill switch and separate encryption/HMAC
            secrets. Saving a VPA here never enables an incomplete runtime configuration.
          </p>
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
        {message && <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-success">{message}</p>}
        {loading ? (
          <div className="h-64 animate-pulse rounded-xl bg-white" />
        ) : form ? (
          <form className="grid gap-5 rounded-xl border border-border bg-white p-5 md:grid-cols-2" onSubmit={submit}>
            <label className="form-group mb-0">
              <span>Active provider</span>
              <select
                value={form.active_provider}
                onChange={(event) => {
                  const provider = event.target.value as PaymentConfigurationInput['active_provider'];
                  setForm({
                    ...form,
                    active_provider: provider,
                    payment_mode: provider,
                    direct_upi_enabled: provider === 'direct_upi',
                    gateway_enabled: provider === 'phonepe',
                  });
                }}
              >
                <option value="disabled">Disabled</option>
                <option value="direct_upi">Direct UPI with manual verification</option>
                <option value="phonepe">PhonePe gateway</option>
              </select>
            </label>
            <label className="form-group mb-0">
              <span>Effective from</span>
              <input
                type="datetime-local"
                required
                value={form.effective_from.slice(0, 16)}
                onChange={(event) => setForm({ ...form, effective_from: event.target.value })}
              />
            </label>
            <label className="form-group mb-0">
              <span>Merchant UPI VPA</span>
              <input
                value={form.merchant_upi_vpa || ''}
                onChange={(event) => setForm({ ...form, merchant_upi_vpa: event.target.value })}
                required={form.active_provider === 'direct_upi'}
                placeholder="merchant@bank"
              />
            </label>
            <label className="form-group mb-0">
              <span>Merchant display name</span>
              <input
                value={form.merchant_display_name || ''}
                onChange={(event) => setForm({ ...form, merchant_display_name: event.target.value })}
                required={form.active_provider === 'direct_upi'}
              />
            </label>
            <label className="form-group mb-0">
              <span>Payment contact</span>
              <input
                value={form.merchant_payment_contact || ''}
                onChange={(event) => setForm({ ...form, merchant_payment_contact: event.target.value })}
              />
            </label>
            <label className="form-group mb-0">
              <span>Merchant category (optional 4 digits)</span>
              <input
                inputMode="numeric"
                pattern="[0-9]{4}"
                value={form.merchant_category || ''}
                onChange={(event) => setForm({ ...form, merchant_category: event.target.value })}
              />
            </label>
            <label className="form-group mb-0 md:col-span-2">
              <span>Generic UPI note template</span>
              <input
                value={form.upi_transaction_note_template || ''}
                onChange={(event) => setForm({ ...form, upi_transaction_note_template: event.target.value })}
                required={form.active_provider === 'direct_upi'}
                maxLength={80}
              />
              <small>Use only the optional {'{reference}'} placeholder. Never enter diagnosis or patient details.</small>
            </label>
            <label className="form-group mb-0">
              <span>Payment expiry (minutes)</span>
              <input
                type="number"
                min={5}
                max={1440}
                value={form.payment_order_expiry_minutes}
                onChange={(event) => setForm({ ...form, payment_order_expiry_minutes: Number(event.target.value) })}
              />
            </label>
            <label className="form-group mb-0">
              <span>Verification reservation (minutes)</span>
              <input
                type="number"
                min={5}
                max={1440}
                value={form.verification_reservation_minutes}
                onChange={(event) => setForm({ ...form, verification_reservation_minutes: Number(event.target.value) })}
              />
            </label>
            <div className="grid gap-3 md:col-span-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.screenshot_enabled}
                  onChange={(event) => setForm({
                    ...form,
                    screenshot_enabled: event.target.checked,
                    screenshot_required: event.target.checked ? form.screenshot_required : false,
                  })}
                /> Screenshot enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.screenshot_required}
                  disabled={!form.screenshot_enabled}
                  onChange={(event) => setForm({ ...form, screenshot_required: event.target.checked })}
                /> Screenshot required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.pay_at_clinic_enabled}
                  onChange={(event) => setForm({ ...form, pay_at_clinic_enabled: event.target.checked })}
                /> Pay at clinic enabled
              </label>
            </div>
            <label className="form-group mb-0 md:col-span-2">
              <span>Change reason</span>
              <textarea
                required
                minLength={10}
                maxLength={500}
                value={form.change_reason}
                onChange={(event) => setForm({ ...form, change_reason: event.target.value })}
              />
            </label>
            <div className="md:col-span-2">
              <Button variant="accent" type="submit" disabled={!canWrite || saving}>
                <Save size={16} /> {saving ? 'Saving…' : 'Publish new version'}
              </Button>
              {!canWrite && <p className="mt-2 text-sm text-text-light">Only authorised administrators can change payment settings.</p>}
            </div>
          </form>
        ) : (
          <p className="rounded-xl border border-border bg-white p-6 text-sm text-text-light">
            Payment settings are unavailable until the database bootstrap configuration exists.
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-bold text-ink">Configuration history</h2>
          <div className="mt-3 grid gap-3">
            {history.map((item) => (
              <article key={item.id} className="rounded-xl border border-border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-ink">Version {item.configuration_version} · {item.active_provider}</p>
                  <StatusBadge tone={item.is_active ? 'success' : 'neutral'}>
                    {item.is_active ? 'Active' : 'Historical'}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm text-text-light">{item.change_reason}</p>
                <p className="mt-1 text-xs text-text-light">Updated {new Date(item.updated_at).toLocaleString()} by {item.updated_by_name || 'system bootstrap'}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
