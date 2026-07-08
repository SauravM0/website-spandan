'use client';

import React, { useMemo } from 'react';
import type { BookingForm } from './BookingReducer';

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const now = new Date();
  if (Number.isNaN(birth.getTime()) || birth > now) return null;
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

export function usePatientValidation(form: BookingForm) {
  const calculatedAge = useMemo(() => calculateAge(form.date_of_birth), [form.date_of_birth]);
  const ageYears = form.dob_unknown ? Number(form.age_years || 0) : calculatedAge?.years || 0;
  const isMinor = ageYears > 0 && ageYears < 18;

  const complete =
    form.full_name &&
    form.phone &&
    form.gender &&
    form.reason_for_visit &&
    ((form.dob_unknown && form.age_years) || (!form.dob_unknown && form.date_of_birth)) &&
    (!isMinor || (form.guardian_name && form.guardian_relation));

  return { calculatedAge, ageYears, isMinor, complete };
}

export default function PatientForm({
  form,
  onChange,
}: {
  form: BookingForm;
  onChange: (name: string, value: string | boolean) => void;
}) {
  const { calculatedAge, isMinor } = usePatientValidation(form);

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-bold text-navy">Patient details</h2>
      <div className="form-row">
        <div className="form-group">
          <label>Patient full name</label>
          <input value={form.full_name} onChange={(e) => onChange('full_name', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => onChange('phone', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Gender</label>
          <select value={form.gender} onChange={(e) => onChange('gender', e.target.value)}>
            <option value="">Select</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Email (optional)</label>
          <input type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={form.dob_unknown} onChange={(e) => onChange('dob_unknown', e.target.checked)} />
        Exact DOB not known
      </label>
      <div className="form-row">
        <div className="form-group">
          <label>Date of birth</label>
          <input type="date" disabled={form.dob_unknown} value={form.date_of_birth} onChange={(e) => onChange('date_of_birth', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Age when DOB unknown</label>
          <input type="number" min="0" disabled={!form.dob_unknown} value={form.age_years} onChange={(e) => onChange('age_years', e.target.value)} />
        </div>
      </div>
      {calculatedAge && !form.dob_unknown && (
        <p className="rounded-md bg-bg-alt p-3 text-sm">
          Calculated age: {calculatedAge.years} years, {calculatedAge.months} months, {calculatedAge.days} days
        </p>
      )}
      <div className="form-group"><label>Brief reason for visit</label><input value={form.reason_for_visit} onChange={(e) => onChange('reason_for_visit', e.target.value)} /></div>
      {(isMinor || form.guardian_name) && (
        <div className="form-row">
          <div className="form-group"><label>Guardian name</label><input value={form.guardian_name} onChange={(e) => onChange('guardian_name', e.target.value)} /></div>
          <div className="form-group"><label>Guardian relation</label><input value={form.guardian_relation} onChange={(e) => onChange('guardian_relation', e.target.value)} /></div>
        </div>
      )}
      <p className="text-sm text-text-light">Please enter details for the patient, even when a family member is booking. Do not enter identity numbers or detailed medical history here.</p>
    </div>
  );
}
