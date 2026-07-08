'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';

export default function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-outline btn-sm"
      aria-label="Reset calculator"
      title="Reset calculator"
    >
      <RotateCcw size={16} aria-hidden="true" />
      Reset
    </button>
  );
}
