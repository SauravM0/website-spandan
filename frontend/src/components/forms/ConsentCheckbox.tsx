import React from 'react';
import Link from 'next/link';
import { clinicSettings, PRIVACY_POLICY_VERSION } from '@/lib/settings';

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
          aria-required="true"
        />
        <span>
          I consent to{' '}
          <Link href="/privacy" className="underline hover:text-accent">
            {clinicSettings.name}
          </Link>{' '}
          contacting me regarding my enquiry in accordance with the{' '}
          <Link href="/privacy" className="underline hover:text-accent">
            Privacy Policy
          </Link>
          {' '}({PRIVACY_POLICY_VERSION})
        </span>
      </label>
    </div>
  );
}
