'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Plus } from 'lucide-react';
import { createPackageOrder, createPayment, getPackageCommerceCatalog, quotePackageOrder } from '@/lib/api';
import { usePackageOrderReducer, usePackageOrderCalculations } from '@/components/booking/PackageOrderReducer';
import CartItemForm from '@/components/booking/CartItemForm';

function money(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Confirmed by clinic';
  const amount = Number(value);
  return Number.isFinite(amount) ? `Rs. ${amount.toLocaleString('en-IN')}` : 'Confirmed by clinic';
}

export default function BookPackagePage() {
  return (
    <Suspense fallback={<section className="section"><div className="container">Loading package booking...</div></section>}>
      <BookPackageContent />
    </Suspense>
  );
}

function BookPackageContent() {
  const params = useSearchParams();
  const selectedPackage = params.get('package') || '';
  const [state, dispatch] = usePackageOrderReducer(selectedPackage);
  const { step, buyer, items, loading, error, acknowledged, quote, recoveryReference } = state;
  const [packages, setPackages] = React.useState<any[]>([]);

  useEffect(() => {
    getPackageCommerceCatalog()
      .then((data) => setPackages(data.packages || []))
      .catch(() => dispatch({ type: 'SET_ERROR', error: 'Could not load health packages.' }));
  }, []);

  const { packageById, subtotal, tax, fee, total, buyerComplete, itemsComplete } = usePackageOrderCalculations(items, packages);
  const firstPackage = packageById.get(items[0]?.package_id);
  const displayedSubtotal = quote?.subtotal ?? subtotal;
  const displayedTax = quote?.tax_total ?? tax;
  const displayedFee = quote?.fee_total ?? fee;
  const displayedTotal = quote?.total ?? total;

  const buildQuotePayload = () => ({
    preferred_date: buyer.preferred_date || undefined,
    items: items.map((item) => ({
      package_id: item.package_id,
      quantity: Number(item.quantity || 1),
      preferred_date: item.preferred_date || buyer.preferred_date || undefined,
    })),
  });

  const reviewOrder = async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: '' });
    try {
      const result = await quotePackageOrder(buildQuotePayload());
      dispatch({ type: 'SET_QUOTE', quote: result.quote });
      dispatch({ type: 'SET_STEP', step: 3 });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Could not create server quote.' });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const submit = async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: '' });
    dispatch({ type: 'SET_RECOVERY_REFERENCE', reference: '' });
    try {
      const latestQuote = await quotePackageOrder(buildQuotePayload());
      dispatch({ type: 'SET_QUOTE', quote: latestQuote.quote });
      const orderResult = await createPackageOrder({
        purchaser_name: buyer.purchaser_name,
        phone: buyer.phone,
        email: buyer.email || undefined,
        preferred_date: buyer.preferred_date || undefined,
        items: items.map((item) => ({
          package_id: item.package_id,
          quantity: Number(item.quantity || 1),
          preferred_date: item.preferred_date || buyer.preferred_date || undefined,
          patient: {
            full_name: item.patient_name,
            phone: buyer.phone,
            email: buyer.email || undefined,
            gender: item.gender,
            age_years: Number(item.age_years),
            guardian: item.guardian_name ? { full_name: item.guardian_name, phone: buyer.phone, relationship: item.guardian_relation || 'guardian' } : undefined,
          },
        })),
      });
      dispatch({ type: 'SET_RECOVERY_REFERENCE', reference: orderResult.order.order_number || orderResult.order.id });
      const paymentResult = await createPayment({ order_id: orderResult.order.id });
      window.location.href = paymentResult.payment.redirect_url;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Package booking failed' });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  return (
    <>
      <section className="soft-page-hero py-12">
        <div className="container">
          <h1 className="text-3xl font-bold">Book Health Package</h1>
          <p className="mt-2 max-w-2xl text-text-light">Select packages, assign them to patients, review preparation details, and pay online.</p>
        </div>
      </section>

      <section className="section">
        <div className="container grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="soft-card p-5 md:p-6">
            <div className="mb-6 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
              {['Packages', 'Patients', 'Review'].map((label, index) => (
                <div key={label} className={`rounded-2xl p-3 transition-all duration-300 ${step === index + 1 ? 'bg-gradient-to-r from-accent to-primary text-white shadow-[0_10px_24px_rgba(43,138,198,0.16)]' : 'border border-primary/20 bg-white text-text-light shadow-[0_8px_20px_rgba(23,58,94,0.06)]'}`}>{label}</div>
              ))}
            </div>

            {step === 1 && (
              <div className="grid gap-4">
                <h2 className="text-xl font-bold text-navy">Browse packages</h2>
                <p className="text-sm text-text-light">You can add up to 20 patient/package items before payment.</p>
                <div className="grid gap-3">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_ITEM_FIELD', id: items[0].id, name: 'package_id', value: pkg.id })}
                      className={`rounded-3xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(43,138,198,0.12)] ${items[0]?.package_id === pkg.id ? 'border-accent bg-blue-50 text-navy shadow-[0_10px_24px_rgba(43,138,198,0.12)]' : 'border-primary/20 bg-white text-navy shadow-[0_8px_20px_rgba(23,58,94,0.06)]'}`}
                    >
                      <span className="block font-semibold text-navy">{pkg.name}</span>
                      <span className="mt-1 block text-sm text-text-light">{pkg.short_description || pkg.description || 'Preventive health package'}</span>
                      <span className="mt-2 block text-sm font-semibold text-accent">View details and continue</span>
                    </button>
                  ))}
                </div>
                <button disabled={!items[0]?.package_id} className="btn btn-accent justify-center disabled:opacity-50" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}>Continue</button>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-5">
                <h2 className="text-xl font-bold text-navy">Family/member cart</h2>
                <p className="text-sm text-text-light">Preferred dates are requests, not confirmed appointments. The clinic confirms actual timing after order review.</p>
                <div className="form-row">
                  <div className="form-group"><label>Purchaser name</label><input value={buyer.purchaser_name} onChange={(e) => dispatch({ type: 'SET_BUYER_FIELD', name: 'purchaser_name', value: e.target.value })} /></div>
                  <div className="form-group"><label>Phone</label><input value={buyer.phone} onChange={(e) => dispatch({ type: 'SET_BUYER_FIELD', name: 'phone', value: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Email (optional)</label><input type="email" value={buyer.email} onChange={(e) => dispatch({ type: 'SET_BUYER_FIELD', name: 'email', value: e.target.value })} /></div>
                  <div className="form-group"><label>Preferred date (request)</label><input type="date" value={buyer.preferred_date} onChange={(e) => dispatch({ type: 'SET_BUYER_FIELD', name: 'preferred_date', value: e.target.value })} /></div>
                </div>

                <div className="grid gap-4">
                  {items.map((item, index) => (
                    <CartItemForm
                      key={item.id}
                      item={item}
                      index={index}
                      packages={packages}
                      onChange={(id, name, value) => dispatch({ type: 'SET_ITEM_FIELD', id, name, value })}
                      onRemove={(id) => dispatch({ type: 'REMOVE_ITEM', id })}
                      canRemove={items.length > 1}
                    />
                  ))}
                </div>

                <button type="button" disabled={items.length >= 20} className="btn btn-outline justify-center disabled:opacity-50" onClick={() => dispatch({ type: 'ADD_ITEM' })}><Plus size={18} /> Add another package or patient</button>
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}>Back</button>
                  <button disabled={loading || !buyerComplete(buyer) || !itemsComplete(items)} className="btn btn-accent flex-1 disabled:opacity-50" onClick={reviewOrder}>{loading ? 'Creating quote...' : 'Review order'}</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5">
                <h2 className="text-xl font-bold text-navy">Review and pay</h2>
                <div className="rounded-3xl bg-blue-50/70 p-4 text-sm">
                  <p><strong>Purchaser:</strong> {buyer.purchaser_name}</p>
                  <p><strong>Preferred date request:</strong> {buyer.preferred_date}</p>
                  <p><strong>Items:</strong> {items.length}</p>
                  <p><strong>Subtotal:</strong> {money(displayedSubtotal)}</p>
                  <p><strong>Tax:</strong> {money(displayedTax)}</p>
                  <p><strong>Convenience fee:</strong> {money(displayedFee)}</p>
                  <p><strong>Server quote total:</strong> {money(displayedTotal)}</p>
                  {quote?.policy_version && <p><strong>Policy version:</strong> {quote.policy_version}</p>}
                </div>
                <div className="soft-card p-4 text-sm text-text-light">
                  <p className="font-semibold text-navy">Before payment</p>
                  <p className="mt-2">Selected packages, patient assignment, preferred date request, preparation instructions, tax, and convenience fee are saved with this order.</p>
                  <p className="mt-2">{firstPackage?.no_refund_text || firstPackage?.terms_text || 'Package payments are generally non-refundable after payment verification. Contact the clinic for exceptional medical or operational cases.'}</p>
                  <p className="mt-2">For exceptional cases, please contact Spandan Clinic reception with your order number.</p>
                </div>
                <label className="flex items-start gap-3 text-sm">
                  <input className="mt-1" type="checkbox" checked={acknowledged} onChange={(e) => dispatch({ type: 'SET_ACKNOWLEDGED', value: e.target.checked })} />
                  <span>I acknowledge the package terms, preparation instructions, and no-refund policy.</span>
                </label>
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
                    <p>{error}</p>
                    {recoveryReference && <p className="mt-1 text-text-light">Recovery reference: {recoveryReference}</p>}
                  </div>
                )}
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}>Back</button>
                  <button className="btn btn-accent flex-1 disabled:opacity-50" disabled={loading || !acknowledged} onClick={submit}>
                    {loading ? 'Creating order...' : <><CreditCard size={18} /> Continue to payment</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="soft-card p-6">
            <h2 className="text-lg font-bold text-navy">Package details</h2>
            <p className="mt-3 font-semibold">{firstPackage?.name || 'Select a package'}</p>
            <p className="mt-2 text-sm text-text-light">{firstPackage?.short_description || 'Prices and preparation details appear after package selection.'}</p>
            <div className="mt-5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><span>Original price</span><strong>{money(firstPackage?.base_price)}</strong></div>
              <div className="mt-2 flex justify-between"><span>Discounted price</span><strong>{money(firstPackage?.discounted_price || firstPackage?.base_price)}</strong></div>
              <div className="mt-2 flex justify-between"><span>Server quote total</span><strong>{money(displayedTotal)}</strong></div>
            </div>
            {quote && <p className="mt-4 text-xs text-text-light">Quote is refreshed again before order creation and payment.</p>}
            {firstPackage?.prep_instructions && <p className="mt-5 text-sm text-text-light">{firstPackage.prep_instructions}</p>}
          </aside>
        </div>
      </section>
    </>
  );
}
