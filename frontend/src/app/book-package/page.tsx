'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { createPackageOrder, createPayment, getPackageCommerceCatalog } from '../../lib/api';

type CartItem = {
  id: string;
  package_id: string;
  quantity: string;
  preferred_date: string;
  patient_name: string;
  age_years: string;
  gender: string;
  guardian_name: string;
  guardian_relation: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: unknown) {
  const amount = Number(value || 0);
  return amount > 0 ? `Rs. ${amount.toLocaleString('en-IN')}` : 'Confirmed by clinic';
}

function newItem(packageId = ''): CartItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    package_id: packageId,
    quantity: '1',
    preferred_date: today(),
    patient_name: '',
    age_years: '',
    gender: '',
    guardian_name: '',
    guardian_relation: '',
  };
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
  const [packages, setPackages] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [buyer, setBuyer] = useState({
    purchaser_name: '',
    phone: '',
    email: '',
    preferred_date: today(),
    city: '',
    state: 'Maharashtra',
    pin_code: '',
  });
  const [items, setItems] = useState<CartItem[]>([newItem(selectedPackage)]);

  useEffect(() => {
    getPackageCommerceCatalog()
      .then((data) => {
        setPackages(data.packages || []);
        if (!items[0]?.package_id && data.packages?.[0]) {
          setItems([newItem(data.packages[0].id)]);
        }
      })
      .catch(() => setError('Could not load health packages.'));
  }, []);

  const packageById = useMemo(() => new Map(packages.map((pkg) => [pkg.id, pkg])), [packages]);
  const subtotal = items.reduce((sum, item) => {
    const pkg = packageById.get(item.package_id);
    return sum + (Number(pkg?.discounted_price || pkg?.base_price || 0) * Number(item.quantity || 1));
  }, 0);
  const tax = items.reduce((sum, item) => {
    const pkg = packageById.get(item.package_id);
    const price = Number(pkg?.discounted_price || pkg?.base_price || 0) * Number(item.quantity || 1);
    return sum + (pkg?.tax_applicable ? (price * Number(pkg?.tax_rate || 0)) / 100 : 0);
  }, 0);
  const fee = items.reduce((sum, item) => sum + (Number(packageById.get(item.package_id)?.convenience_fee || 0) * Number(item.quantity || 1)), 0);
  const total = subtotal + tax + fee;

  const updateBuyer = (name: string, value: string) => setBuyer((prev) => ({ ...prev, [name]: value }));
  const updateItem = (id: string, name: keyof CartItem, value: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [name]: value } : item));
  };
  const addItem = () => setItems((prev) => [...prev, newItem(prev[0]?.package_id || packages[0]?.id || '')]);
  const removeItem = (id: string) => setItems((prev) => prev.length === 1 ? prev : prev.filter((item) => item.id !== id));

  const buyerComplete = buyer.purchaser_name && buyer.phone && buyer.city && buyer.state && buyer.pin_code && buyer.preferred_date;
  const itemsComplete = items.every((item) => {
    const pkg = packageById.get(item.package_id);
    return item.package_id
      && item.patient_name
      && item.age_years
      && item.gender
      && Number(item.quantity || 0) > 0
      && (!pkg?.preferred_date_required || item.preferred_date);
  });
  const firstSelectedPackage = packageById.get(items[0]?.package_id);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
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
            address: `${buyer.city}, ${buyer.state} - ${buyer.pin_code}`,
            guardian: item.guardian_name ? {
              full_name: item.guardian_name,
              phone: buyer.phone,
              relationship: item.guardian_relation || 'guardian',
            } : undefined,
          },
        })),
      });
      const paymentResult = await createPayment({ order_id: orderResult.order.id });
      window.location.href = paymentResult.payment.redirect_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Package booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="bg-navy py-12 text-white">
        <div className="container">
          <h1 className="text-3xl font-bold">Book Health Package</h1>
          <p className="mt-2 max-w-2xl text-white/80">Select packages, assign them to patients, review preparation details, and pay online.</p>
        </div>
      </section>

      <section className="section">
        <div className="container grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="rounded-lg border border-border bg-white p-5 shadow md:p-6">
            <div className="mb-6 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
              {['Packages', 'Patients', 'Review'].map((label, index) => (
                <div key={label} className={`rounded-md p-3 ${step === index + 1 ? 'bg-accent text-white' : 'bg-bg-alt text-text-light'}`}>{label}</div>
              ))}
            </div>

            {step === 1 && (
              <div className="grid gap-4">
                <h2 className="text-xl font-bold text-navy">Browse packages</h2>
                <div className="grid gap-3">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => updateItem(items[0].id, 'package_id', pkg.id)}
                      className={`rounded-lg border p-4 text-left ${items[0]?.package_id === pkg.id ? 'border-accent bg-accent/5' : 'border-border bg-white'}`}
                    >
                      <span className="block font-semibold text-navy">{pkg.name}</span>
                      <span className="mt-1 block text-sm text-text-light">{pkg.short_description || pkg.description || 'Preventive health package'}</span>
                      <span className="mt-2 block text-sm font-semibold text-accent">View details and continue</span>
                    </button>
                  ))}
                </div>
                <button disabled={!items[0]?.package_id} className="btn btn-accent justify-center disabled:opacity-50" onClick={() => setStep(2)}>
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-5">
                <h2 className="text-xl font-bold text-navy">Family/member cart</h2>
                <div className="form-row">
                  <div className="form-group"><label>Purchaser name</label><input value={buyer.purchaser_name} onChange={(event) => updateBuyer('purchaser_name', event.target.value)} /></div>
                  <div className="form-group"><label>Phone</label><input value={buyer.phone} onChange={(event) => updateBuyer('phone', event.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Email (optional)</label><input type="email" value={buyer.email} onChange={(event) => updateBuyer('email', event.target.value)} /></div>
                  <div className="form-group"><label>Preferred date</label><input type="date" min={today()} value={buyer.preferred_date} onChange={(event) => updateBuyer('preferred_date', event.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>City</label><input value={buyer.city} onChange={(event) => updateBuyer('city', event.target.value)} /></div>
                  <div className="form-group"><label>State</label><input value={buyer.state} onChange={(event) => updateBuyer('state', event.target.value)} /></div>
                </div>
                <div className="form-group"><label>PIN code</label><input value={buyer.pin_code} onChange={(event) => updateBuyer('pin_code', event.target.value)} /></div>

                <div className="grid gap-4">
                  {items.map((item, index) => {
                    const pkg = packageById.get(item.package_id);
                    return (
                      <div key={item.id} className="rounded-lg border border-border p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-navy">Patient {index + 1}</h3>
                          <button type="button" className="btn btn-sm btn-outline" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                            <Trash2 size={16} /> Remove
                          </button>
                        </div>
                        <div className="form-group"><label>Package</label><select value={item.package_id} onChange={(event) => updateItem(item.id, 'package_id', event.target.value)}>{packages.map((pkgOption) => <option key={pkgOption.id} value={pkgOption.id}>{pkgOption.name}</option>)}</select></div>
                        <div className="form-row">
                          <div className="form-group"><label>Quantity</label><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} /></div>
                          <div className="form-group"><label>Preferred package date</label><input type="date" min={today()} value={item.preferred_date} onChange={(event) => updateItem(item.id, 'preferred_date', event.target.value)} /></div>
                        </div>
                        <div className="form-row">
                          <div className="form-group"><label>Patient name</label><input value={item.patient_name} onChange={(event) => updateItem(item.id, 'patient_name', event.target.value)} /></div>
                          <div className="form-group"><label>Age</label><input type="number" min="0" value={item.age_years} onChange={(event) => updateItem(item.id, 'age_years', event.target.value)} /></div>
                        </div>
                        <div className="form-row">
                          <div className="form-group"><label>Gender</label><select value={item.gender} onChange={(event) => updateItem(item.id, 'gender', event.target.value)}><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option></select></div>
                          <div className="form-group"><label>Guardian name (optional)</label><input value={item.guardian_name} onChange={(event) => updateItem(item.id, 'guardian_name', event.target.value)} /></div>
                        </div>
                        <div className="form-group mb-0"><label>Guardian relation (optional)</label><input value={item.guardian_relation} onChange={(event) => updateItem(item.id, 'guardian_relation', event.target.value)} /></div>
                        <p className="mt-3 text-sm text-text-light">{pkg?.prep_instructions || 'Preparation instructions will be included on the confirmation page.'}</p>
                      </div>
                    );
                  })}
                </div>

                <button type="button" className="btn btn-outline justify-center" onClick={addItem}><Plus size={18} /> Add another package or patient</button>
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                  <button disabled={!buyerComplete || !itemsComplete} className="btn btn-accent flex-1 disabled:opacity-50" onClick={() => setStep(3)}>Review order</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5">
                <h2 className="text-xl font-bold text-navy">Review and pay</h2>
                <div className="rounded-md bg-bg-alt p-4 text-sm">
                  <p><strong>Purchaser:</strong> {buyer.purchaser_name}</p>
                  <p><strong>Preferred date:</strong> {buyer.preferred_date}</p>
                  <p><strong>Items:</strong> {items.length}</p>
                  <p><strong>Subtotal:</strong> {money(subtotal)}</p>
                  <p><strong>Tax:</strong> {money(tax)}</p>
                  <p><strong>Gateway/convenience fee:</strong> {money(fee)}</p>
                  <p><strong>Total:</strong> {money(total)}</p>
                </div>
                <div className="rounded-md border border-border p-4 text-sm text-text-light">
                  <p className="font-semibold text-navy">Before payment</p>
                  <p className="mt-2">Selected packages, patient assignment, preferred date policy, preparation instructions, tax, and convenience fee are saved with this order.</p>
                  <p className="mt-2">{firstSelectedPackage?.no_refund_text || firstSelectedPackage?.terms_text || 'Package payments are generally non-refundable after payment verification. Contact the clinic for exceptional medical or operational cases.'}</p>
                  <p className="mt-2">For exceptional cases, please contact Spandan Clinic reception with your order number.</p>
                </div>
                <label className="flex items-start gap-3 text-sm">
                  <input className="mt-1" type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
                  <span>I acknowledge the package terms, preparation instructions, and no-refund policy.</span>
                </label>
                {error && <p className="text-sm text-danger">{error}</p>}
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => setStep(2)}>Back</button>
                  <button className="btn btn-accent flex-1 disabled:opacity-50" disabled={loading || !acknowledged} onClick={submit}>
                    {loading ? 'Creating order...' : <><CreditCard size={18} /> Continue to payment</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-lg border border-border bg-bg-alt p-6">
            <h2 className="text-lg font-bold text-navy">Package details</h2>
            <p className="mt-3 font-semibold">{firstSelectedPackage?.name || 'Select a package'}</p>
            <p className="mt-2 text-sm text-text-light">{firstSelectedPackage?.short_description || 'Prices and preparation details appear after package selection.'}</p>
            <div className="mt-5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><span>Original price</span><strong>{money(firstSelectedPackage?.base_price)}</strong></div>
              <div className="mt-2 flex justify-between"><span>Discounted price</span><strong>{money(firstSelectedPackage?.discounted_price || firstSelectedPackage?.base_price)}</strong></div>
              <div className="mt-2 flex justify-between"><span>Cart total</span><strong>{money(total)}</strong></div>
            </div>
            {firstSelectedPackage?.prep_instructions && <p className="mt-5 text-sm text-text-light">{firstSelectedPackage.prep_instructions}</p>}
          </aside>
        </div>
      </section>
    </>
  );
}
