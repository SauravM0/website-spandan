'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      size="sm"
      aria-label="Reset calculator"
      title="Reset calculator"
    >
      <RotateCcw size={16} aria-hidden="true" />
      Reset
    </Button>
  );
}
