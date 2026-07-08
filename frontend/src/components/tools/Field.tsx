'use client';

import React, { useId } from 'react';

interface FieldProps {
  id: string;
  label: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
}

export default function Field({ id, label, suffix, value, onChange, min, max }: FieldProps) {
  const errorId = useId();
  const num = value === '' ? null : Number(value);
  const error =
    num !== null && !Number.isFinite(num)
      ? 'Enter a valid number.'
      : min !== undefined && num !== null && num < min
        ? `Minimum is ${min}.`
        : max !== undefined && num !== null && num > max
          ? `Maximum is ${max}.`
          : null;

  return (
    <div className="form-group mb-0">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`
            ${suffix ? 'pr-16' : ''}
            ${error ? 'border-red-400 focus:border-red-500' : ''}
          `}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-light pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
