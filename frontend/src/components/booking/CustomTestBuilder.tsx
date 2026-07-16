'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Info,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  createCustomTestOrder,
  createPayment,
  getDiagnosticTests,
  type DiagnosticTest,
} from '@/lib/api';

type PatientForm = {
  full_name: string;
  age_years: string;
  gender: string;
  phone: string;
  email: string;
  preferred_date: string;
  clinical_notes: string;
};

const initialPatient: PatientForm = {
  full_name: '',
  age_years: '',
  gender: '',
  phone: '',
  email: '',
  preferred_date: '',
  clinical_notes: '',
};

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

function normalizedPhone(value: string) {
  const cleaned = value.replace(/[\s()-]/g, '');
  if (/^[6-9]\d{9}$/.test(cleaned)) return cleaned;
  return cleaned;
}

function Stepper({ step }: { step: number }) {
  const steps = ['Select tests', 'Patient details', 'Review & submit'];
  return (
    <ol className="mt-7 grid max-w-3xl grid-cols-3 gap-2" aria-label="Build package progress">
      {steps.map((label, index) => {
        const number = index + 1;
        const complete = step > number;
        const active = step === number;
        return (
          <li
            key={label}
            className="flex min-w-0 items-center gap-2 text-xs font-semibold sm:text-sm"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${complete || active ? 'border-accent bg-accent text-white' : 'border-border bg-white text-text-light'}`}
            >
              {complete ? <Check size={17} aria-label="Completed" /> : number}
            </span>
            <span className={active ? 'text-navy' : 'text-text-light'}>{label}</span>
            {number < 3 && (
              <span
                className={`ml-auto hidden h-px min-w-5 flex-1 sm:block ${complete ? 'bg-accent' : 'bg-border'}`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function CustomTestBuilder() {
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState<PatientForm>(initialPatient);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState<{ reference: string; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    getDiagnosticTests()
      .then((result) => {
        if (!active) return;
        setTests(result.tests || []);
        setCategories(result.categories || []);
      })
      .catch((err) => {
        if (active)
          setCatalogError(err instanceof Error ? err.message : 'Could not load diagnostic tests.');
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const testById = useMemo(() => new Map(tests.map((test) => [test.id, test])), [tests]);
  const selectedTests = selectedIds
    .map((id) => testById.get(id))
    .filter(Boolean) as DiagnosticTest[];
  const filteredTests = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tests.filter((test) => {
      if (category && test.category !== category) return false;
      if (!needle) return true;
      return [test.name, test.category, ...(test.aliases || [])].some((value) =>
        value.toLowerCase().includes(needle)
      );
    });
  }, [category, search, tests]);
  const allPricesConfirmed =
    selectedTests.length > 0 &&
    selectedTests.every((test) => test.price_confirmed && test.price > 0);
  const total = allPricesConfirmed ? selectedTests.reduce((sum, test) => sum + test.price, 0) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const patientComplete =
    patient.full_name.trim().length >= 2 &&
    /^[6-9]\d{9}$|^\+91[6-9]\d{9}$/.test(normalizedPhone(patient.phone)) &&
    Number(patient.age_years) >= 0 &&
    Number(patient.age_years) <= 130 &&
    Boolean(patient.gender);

  const toggleTest = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 30
          ? [...current, id]
          : current
    );
  };

  const updatePatient = (name: keyof PatientForm, value: string) => {
    setPatient((current) => ({ ...current, [name]: value }));
  };

  const submit = async () => {
    if (!patientComplete || selectedIds.length === 0 || !consent) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const phone = normalizedPhone(patient.phone);
      const result = await createCustomTestOrder({
        purchaser_name: patient.full_name.trim(),
        phone,
        email: patient.email.trim() || undefined,
        preferred_date: patient.preferred_date || undefined,
        clinical_notes: patient.clinical_notes.trim() || undefined,
        source_language: 'en',
        consent: true,
        test_ids: selectedIds,
        patient: {
          full_name: patient.full_name.trim(),
          phone,
          email: patient.email.trim() || undefined,
          age_years: Number(patient.age_years),
          gender: patient.gender,
        },
      });
      if (result.order.payment_required) {
        const payment = await createPayment({ order_id: result.order.id });
        window.location.href = payment.payment.checkout_url;
        return;
      }
      setSuccess({ reference: result.order.order_number, message: result.message });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Your test request could not be submitted.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <section className="section min-h-[70vh] bg-bg-alt">
        <div className="container max-w-2xl">
          <div className="soft-card p-7 text-center md:p-10">
            <CheckCircle2 className="mx-auto text-success" size={52} aria-hidden="true" />
            <p className="mt-5 text-sm font-bold uppercase tracking-wide text-accent">
              Request received
            </p>
            <h1 className="mt-2 text-3xl font-bold text-navy">
              Your test request has been submitted
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-text-light">{success.message}</p>
            <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-blue-50 p-4">
              <p className="text-sm text-text-light">Request reference</p>
              <p className="mt-1 text-xl font-bold text-navy">{success.reference}</p>
            </div>
            <p className="mt-5 text-sm text-text-light">
              Keep this reference when contacting the clinic.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/packages" className="btn btn-accent">
                Back to Packages
              </Link>
              <Link href="/contact" className="btn btn-outline">
                Contact Clinic
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="soft-page-hero">
        <div className="container py-10 md:py-12">
          <p className="text-sm font-bold uppercase tracking-wide text-pink-700">
            Build your package
          </p>
          <h1 className="mt-2 heading-display">
            {step === 1
              ? 'Choose Tests for Your Package'
              : step === 2
                ? 'Patient Details'
                : 'Review Your Test Request'}
          </h1>
          <p className="mt-3 max-w-2xl text-text-light">
            {step === 1
              ? 'Search and select individual diagnostic tests based on the patient’s needs.'
              : step === 2
                ? 'Tell us who the selected tests are for.'
                : 'Check the selected tests and patient information before submitting.'}
          </p>
          <Stepper step={step} />
        </div>
      </section>

      <section className="section bg-bg-alt">
        <div className="container">
          {catalogError && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-danger"
            >
              {catalogError}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="soft-card p-5 md:p-6">
                <label className="relative block">
                  <span className="sr-only">Search tests</span>
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-light"
                    size={19}
                    aria-hidden="true"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-h-[50px] w-full rounded-2xl border border-border bg-white pl-12 pr-4"
                    placeholder="Search by test name or category"
                  />
                </label>
                <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Test categories">
                  <button
                    type="button"
                    onClick={() => setCategory('')}
                    className={`btn btn-sm shrink-0 ${category ? 'btn-outline' : 'btn-primary'}`}
                  >
                    All Tests
                  </button>
                  {categories.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setCategory(item)}
                      className={`btn btn-sm shrink-0 ${category === item ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm font-semibold text-accent">
                  {filteredTests.length} tests available
                </p>

                {catalogLoading ? (
                  <div className="flex min-h-72 items-center justify-center text-text-light">
                    <Loader2 className="mr-2 animate-spin" size={20} /> Loading tests…
                  </div>
                ) : (
                  <div className="mt-3 grid max-h-[650px] gap-2 overflow-y-auto pr-1">
                    {filteredTests.map((test) => {
                      const selected = selectedIds.includes(test.id);
                      return (
                        <button
                          key={test.id}
                          type="button"
                          onClick={() => toggleTest(test.id)}
                          aria-pressed={selected}
                          className={`grid min-h-[68px] grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border p-3 text-left transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto] ${selected ? 'border-accent bg-blue-50/70' : 'border-border bg-white hover:border-accent/50'}`}
                        >
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-md border ${selected ? 'border-accent bg-accent text-white' : 'border-border bg-white'}`}
                          >
                            {selected && <Check size={15} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-navy">{test.name}</span>
                            <span className="mt-1 inline-flex rounded-full bg-bg-alt px-2 py-0.5 text-xs text-text-light">
                              {test.category}
                            </span>
                          </span>
                          <span className="col-start-2 text-sm font-semibold text-text-light sm:col-start-auto">
                            {test.price_confirmed && test.price > 0
                              ? formatMoney(test.price)
                              : 'Price to be updated'}
                          </span>
                        </button>
                      );
                    })}
                    {filteredTests.length === 0 && (
                      <p className="p-8 text-center text-text-light">No tests match this search.</p>
                    )}
                  </div>
                )}
              </div>
              <SelectionSummary
                selectedTests={selectedTests}
                allPricesConfirmed={allPricesConfirmed}
                total={total}
                onRemove={toggleTest}
                onClear={() => setSelectedIds([])}
                action={
                  <button
                    type="button"
                    disabled={selectedIds.length === 0}
                    onClick={() => setStep(2)}
                    className="btn btn-accent w-full justify-center disabled:opacity-50"
                  >
                    Continue to Patient Details <ArrowRight size={17} />
                  </button>
                }
              />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="soft-card p-5 md:p-7">
                <h2 className="text-xl font-bold text-navy">Patient information</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <label className="form-group mb-0">
                    <span>Full name</span>
                    <input
                      value={patient.full_name}
                      onChange={(event) => updatePatient('full_name', event.target.value)}
                      autoComplete="name"
                    />
                  </label>
                  <label className="form-group mb-0">
                    <span>Age</span>
                    <input
                      type="number"
                      min="0"
                      max="130"
                      value={patient.age_years}
                      onChange={(event) => updatePatient('age_years', event.target.value)}
                    />
                  </label>
                  <label className="form-group mb-0">
                    <span>Gender</span>
                    <select
                      value={patient.gender}
                      onChange={(event) => updatePatient('gender', event.target.value)}
                    >
                      <option value="">Select</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Other</option>
                      <option>Prefer not to say</option>
                    </select>
                  </label>
                  <label className="form-group mb-0">
                    <span>Mobile number</span>
                    <input
                      type="tel"
                      value={patient.phone}
                      onChange={(event) => updatePatient('phone', event.target.value)}
                      autoComplete="tel"
                      placeholder="10-digit Indian mobile number"
                    />
                  </label>
                  <label className="form-group mb-0">
                    <span>Email (optional)</span>
                    <input
                      type="email"
                      value={patient.email}
                      onChange={(event) => updatePatient('email', event.target.value)}
                      autoComplete="email"
                    />
                  </label>
                  <label className="form-group mb-0">
                    <span>Preferred test date (optional)</span>
                    <input
                      type="date"
                      min={today}
                      value={patient.preferred_date}
                      onChange={(event) => updatePatient('preferred_date', event.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-7 border-t border-border pt-6">
                  <h2 className="text-lg font-bold text-navy">Additional information (optional)</h2>
                  <label className="form-group mb-0 mt-4">
                    <span>Doctor&apos;s advice or special requirements</span>
                    <textarea
                      rows={4}
                      maxLength={1000}
                      value={patient.clinical_notes}
                      onChange={(event) => updatePatient('clinical_notes', event.target.value)}
                      placeholder="Add any instructions shared by the doctor"
                    />
                  </label>
                </div>
                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    className="btn btn-outline justify-center"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft size={17} /> Back to Tests
                  </button>
                  <button
                    type="button"
                    disabled={!patientComplete}
                    className="btn btn-accent justify-center disabled:opacity-50"
                    onClick={() => setStep(3)}
                  >
                    Review My Request <ArrowRight size={17} />
                  </button>
                </div>
              </div>
              <SelectionSummary
                selectedTests={selectedTests}
                allPricesConfirmed={allPricesConfirmed}
                total={total}
                onRemove={toggleTest}
                onEdit={() => setStep(1)}
              />
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="grid gap-5">
                <div className="soft-card p-5 md:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-navy">Selected tests</h2>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm font-semibold text-accent hover:underline"
                    >
                      Edit tests
                    </button>
                  </div>
                  <div className="mt-4 divide-y divide-border rounded-2xl border border-border">
                    {selectedTests.map((test) => (
                      <div
                        key={test.id}
                        className="grid gap-1 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div>
                          <p className="font-semibold text-navy">{test.name}</p>
                          <p className="text-xs text-text-light">{test.category}</p>
                        </div>
                        <p className="text-sm text-text-light">
                          {test.price_confirmed && test.price > 0
                            ? formatMoney(test.price)
                            : 'Price to be updated'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="soft-card p-5 md:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-navy">Patient details</h2>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-sm font-semibold text-accent hover:underline"
                    >
                      Edit details
                    </button>
                  </div>
                  <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-text-light">Patient</dt>
                      <dd className="font-semibold text-navy">{patient.full_name}</dd>
                    </div>
                    <div>
                      <dt className="text-text-light">Age / Gender</dt>
                      <dd className="font-semibold text-navy">
                        {patient.age_years} / {patient.gender}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-light">Mobile</dt>
                      <dd className="font-semibold text-navy">{patient.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-text-light">Preferred date</dt>
                      <dd className="font-semibold text-navy">
                        {patient.preferred_date || 'Not selected'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
                  <h2 className="flex items-center gap-2 font-bold text-navy">
                    <Info size={19} /> What happens next?
                  </h2>
                  <ol className="mt-3 grid gap-2 text-sm text-text-light">
                    <li>1. Submit your request.</li>
                    <li>2. The clinic confirms price, preparation and availability.</li>
                    <li>3. Pay after confirmation when pricing is pending.</li>
                  </ol>
                </div>
              </div>
              <aside className="soft-card h-fit p-6 lg:sticky lg:top-24">
                <h2 className="text-xl font-bold text-navy">Request Summary</h2>
                <p className="mt-5 flex items-center gap-2 font-semibold">
                  <ClipboardCheck className="text-accent" size={21} /> {selectedTests.length}{' '}
                  diagnostic tests
                </p>
                <div className="mt-5 flex items-center justify-between border-y border-border py-5">
                  <span className="font-bold text-navy">Estimated total</span>
                  <span className="font-bold text-navy">
                    {allPricesConfirmed ? formatMoney(total) : 'To be confirmed'}
                  </span>
                </div>
                {!allPricesConfirmed && (
                  <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-text-light">
                    <Info className="mb-2 text-accent" size={19} />
                    <strong className="text-navy">No payment is required now.</strong>
                    <p className="mt-1">
                      The clinic will contact you after prices and availability are confirmed.
                    </p>
                  </div>
                )}
                {allPricesConfirmed && (
                  <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm text-text-light">
                    <CreditCard className="mb-2 text-accent" size={19} />
                    <strong className="text-navy">Online payment available.</strong>
                    <p className="mt-1">
                      After creating the order, you will continue to the secure payment page.
                    </p>
                  </div>
                )}
                <label className="mt-5 flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>
                    I confirm the patient information and selected tests are correct, and agree to
                    be contacted about this request.
                  </span>
                </label>
                {submitError && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
                  >
                    {submitError}
                  </div>
                )}
                <button
                  type="button"
                  disabled={!consent || submitting}
                  onClick={submit}
                  className="btn btn-accent mt-5 w-full justify-center disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={17} /> Submitting…
                    </>
                  ) : allPricesConfirmed ? (
                    <>
                      <CreditCard size={17} /> Submit and Pay
                    </>
                  ) : (
                    <>
                      Submit Test Request <ArrowRight size={17} />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep(2)}
                  className="btn btn-outline mt-3 w-full justify-center"
                >
                  <ArrowLeft size={17} /> Back
                </button>
                <p className="mt-5 flex items-start gap-2 text-xs text-text-light">
                  <LockKeyhole className="mt-0.5 shrink-0" size={14} /> Patient details are
                  collected securely and used only for this request.
                </p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function SelectionSummary({
  selectedTests,
  allPricesConfirmed,
  total,
  onRemove,
  onClear,
  onEdit,
  action,
}: {
  selectedTests: DiagnosticTest[];
  allPricesConfirmed: boolean;
  total: number;
  onRemove: (id: string) => void;
  onClear?: () => void;
  onEdit?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <aside className="soft-card h-fit p-6 lg:sticky lg:top-24">
      <h2 className="text-xl font-bold text-navy">Your Custom Package</h2>
      {selectedTests.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-bg-alt p-4 text-sm text-text-light">
          Select tests to begin building the package.
        </p>
      ) : (
        <div className="mt-4 grid gap-2">
          {selectedTests.map((test) => (
            <div
              key={test.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <span className="min-w-0 truncate text-sm font-semibold text-navy">{test.name}</span>
              <button
                type="button"
                onClick={() => onRemove(test.id)}
                aria-label={`Remove ${test.name}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-light hover:bg-pink-50 hover:text-danger"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-semibold text-accent">
          {selectedTests.length} {selectedTests.length === 1 ? 'test' : 'tests'} selected
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-bold text-navy">Total</span>
          <span className="font-bold text-navy">
            {allPricesConfirmed ? formatMoney(total) : 'To be confirmed'}
          </span>
        </div>
      </div>
      {action && <div className="mt-5">{action}</div>}
      {onClear && selectedTests.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 w-full text-center text-sm font-semibold text-accent hover:underline"
        >
          Clear selection
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-4 text-sm font-semibold text-accent hover:underline"
        >
          Edit selected tests
        </button>
      )}
      <p className="mt-5 flex items-start gap-2 text-xs text-text-light">
        <ShieldCheck className="mt-0.5 shrink-0 text-accent" size={15} /> The clinic confirms
        preparation instructions, timing and any pending prices.
      </p>
    </aside>
  );
}
