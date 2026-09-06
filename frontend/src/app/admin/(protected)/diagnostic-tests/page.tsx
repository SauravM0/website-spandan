'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Save, Search } from 'lucide-react';
import { getAdminDiagnosticTests, updateAdminDiagnosticTest, type AdminDiagnosticTest } from '@/lib/api';
import Button from '@/components/ui/Button';

export default function AdminDiagnosticTestsPage() {
  const [tests, setTests] = useState<AdminDiagnosticTest[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminDiagnosticTests()
      .then((result) => setTests(result.tests || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load diagnostic tests.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(tests.map((test) => test.category))).sort(), [tests]);
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tests.filter((test) => (!category || test.category === category) && (!needle || test.name.toLowerCase().includes(needle) || test.category.toLowerCase().includes(needle)));
  }, [category, search, tests]);

  const replaceTest = (updated: AdminDiagnosticTest) => setTests((current) => current.map((test) => test.id === updated.id ? updated : test));

  return (
    <section className="py-8"><div className="container">
      <div className="mb-6"><h1 className="text-2xl font-bold text-ink">Diagnostic Tests</h1><p className="mt-1 text-sm text-text-light">Set test prices and public availability. A positive confirmed price enables online payment for new custom packages.</p></div>
      <div className="mb-6 grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <label className="form-group mb-0"><span>Search</span><span className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={17} /><input className="w-full pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Test name or category" /></span></label>
        <label className="form-group mb-0"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      {error && <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error}</div>}
      {loading ? <div className="flex h-56 items-center justify-center rounded-lg bg-white text-text-light"><Loader2 className="mr-2 animate-spin" size={20} /> Loading tests…</div> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
          <table className="w-full min-w-[920px] text-left text-sm"><thead><tr className="border-b border-border bg-bg-alt">{['#','Test','Category','Price (₹)','Price confirmed','Public','Action'].map((label) => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead><tbody>{visible.map((test) => <DiagnosticTestRow key={test.id} test={test} onUpdated={replaceTest} />)}</tbody></table>
          {visible.length === 0 && <p className="p-6 text-sm text-text-light">No diagnostic tests match these filters.</p>}
        </div>
      )}
    </div></section>
  );
}

function DiagnosticTestRow({ test, onUpdated }: { test: AdminDiagnosticTest; onUpdated: (test: AdminDiagnosticTest) => void }) {
  const [price, setPrice] = useState(String(test.price || 0));
  const [confirmed, setConfirmed] = useState(test.price_confirmed);
  const [active, setActive] = useState(test.is_active);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setPrice(String(test.price || 0)); setConfirmed(test.price_confirmed); setActive(test.is_active); }, [test]);

  const save = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      const result = await updateAdminDiagnosticTest(test.id, { expected_version: test.version, price: Number(price || 0), price_confirmed: confirmed, is_active: active, preparation_instructions: test.preparation_instructions });
      onUpdated(result.test); setSaved(true); window.setTimeout(() => setSaved(false), 1800);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save this test.'); }
    finally { setSaving(false); }
  };

  return <tr className="border-b border-border align-top"><td className="p-3 text-text-light">{test.source_number}</td><td className="p-3"><p className="font-semibold text-ink">{test.name}</p>{test.requires_clinic_confirmation && <p className="mt-1 text-xs text-amber-700">Name requires clinic confirmation</p>}{error && <p className="mt-1 text-xs text-danger">{error}</p>}</td><td className="p-3 text-text-light">{test.category}</td><td className="p-3"><input type="number" min="0" step="0.01" className="w-28" value={price} onChange={(event) => { setPrice(event.target.value); if (Number(event.target.value) <= 0) setConfirmed(false); }} /></td><td className="p-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={confirmed} disabled={Number(price) <= 0} onChange={(event) => setConfirmed(event.target.checked)} /><span>{confirmed ? 'Yes' : 'No'}</span></label></td><td className="p-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span>{active ? 'Visible' : 'Hidden'}</span></label></td><td className="p-3"><Button onClick={save} disabled={saving} variant="outline" size="sm" className="min-w-24 justify-center">{saving ? <Loader2 className="animate-spin" size={15} /> : saved ? <CheckCircle2 className="text-success" size={15} /> : <Save size={15} />}{saving ? 'Saving' : saved ? 'Saved' : 'Save'}</Button></td></tr>;
}
