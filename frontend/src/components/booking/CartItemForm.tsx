'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { CartItem } from './PackageOrderReducer';

export default function CartItemForm({
  item,
  index,
  packages,
  onChange,
  onRemove,
  canRemove,
}: {
  item: CartItem;
  index: number;
  packages: { id: string; name: string; prep_instructions?: string | null; preferred_date_required?: boolean }[];
  onChange: (id: string, name: keyof CartItem, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const pkg = packages.find((p) => p.id === item.package_id);
  const age = item.age_years === '' ? null : Number(item.age_years);
  const guardianRequired = age !== null && age >= 0 && age < 18;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-navy">Patient {index + 1}</h3>
        <button type="button" className="btn btn-sm btn-outline" onClick={() => onRemove(item.id)} disabled={!canRemove}>
          <Trash2 size={16} /> Remove
        </button>
      </div>
      <div className="form-group">
        <label>Package</label>
        <select value={item.package_id} onChange={(e) => onChange(item.id, 'package_id', e.target.value)}>
          {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Quantity</label><input type="number" min="1" value={item.quantity} onChange={(e) => onChange(item.id, 'quantity', e.target.value)} /></div>
        <div className="form-group"><label>Preferred package date (request)</label><input type="date" value={item.preferred_date} onChange={(e) => onChange(item.id, 'preferred_date', e.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label>Patient name</label><input value={item.patient_name} onChange={(e) => onChange(item.id, 'patient_name', e.target.value)} /></div>
        <div className="form-group"><label>Age</label><input type="number" min="0" value={item.age_years} onChange={(e) => onChange(item.id, 'age_years', e.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Gender</label>
          <select value={item.gender} onChange={(e) => onChange(item.id, 'gender', e.target.value)}>
            <option value="">Select</option><option>Female</option><option>Male</option><option>Other</option>
          </select>
        </div>
        <div className="form-group"><label>Guardian name {guardianRequired ? '(required for minors)' : '(optional)'}</label><input value={item.guardian_name} onChange={(e) => onChange(item.id, 'guardian_name', e.target.value)} /></div>
      </div>
      <div className="form-group mb-0"><label>Guardian relation {guardianRequired ? '(required for minors)' : '(optional)'}</label><input value={item.guardian_relation} onChange={(e) => onChange(item.id, 'guardian_relation', e.target.value)} /></div>
      {guardianRequired && (!item.guardian_name || !item.guardian_relation) && (
        <p className="mt-2 text-sm text-danger">Guardian name and relation are required for patients under 18.</p>
      )}
      {pkg?.prep_instructions && (
        <p className="mt-3 text-sm text-text-light">{pkg.prep_instructions}</p>
      )}
      <p className="mt-3 text-xs text-text-light">Preferred date is a request. The clinic confirms actual timing after order review.</p>
    </div>
  );
}
