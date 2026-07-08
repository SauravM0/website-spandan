import React from 'react';
import { Utensils } from 'lucide-react';

interface PrepInstructionsProps {
  instructions: string | null | undefined;
  fastingRequired?: boolean | null;
  fastingDuration?: string | null;
}

export default function PrepInstructions({
  instructions,
  fastingRequired,
  fastingDuration,
}: PrepInstructionsProps) {
  const fastingText = fastingRequired
    ? fastingDuration
      ? `Fasting required: ${fastingDuration}`
      : 'Fasting required. Confirm duration with the clinic.'
    : 'No fasting requirement is published for this package.';

  return (
    <div className="rounded-2xl bg-amber-50 p-5 shadow-[0_10px_30px_rgba(245,158,11,0.08)]">
      <div className="flex items-start gap-3">
        <Utensils className="mt-1 shrink-0 text-amber-800" size={22} aria-hidden="true" />
        <div>
          <h3 className="font-bold text-navy">Package-specific preparation</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-light">{fastingText}</p>
          {instructions ? (
            <p className="mt-3 text-sm leading-relaxed text-text-light">{instructions}</p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-text-light">
              The clinic will confirm preparation instructions before booking or payment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
