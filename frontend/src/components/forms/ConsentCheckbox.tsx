import React from 'react';
import Link from 'next/link';

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function ConsentCheckbox({ checked, onChange }: ConsentCheckboxProps) {
  return (
    <div className="text-sm mb-5">
      <label className="flex items-start gap-2 font-normal cursor-pointer min-h-[44px]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 accent-accent mt-0.5"
          required
        />
        <span>
          I consent to{' '}
          <Link href="/privacy" className="underline hover:text-accent">
            Spandan Super Speciality Clinic
          </Link>{' '}
          contacting me regarding my enquiry in accordance with the{' '}
          <Link href="/privacy" className="underline hover:text-accent">
            Privacy Policy
          </Link>
        </span>
      </label>
    </div>
  );
}
