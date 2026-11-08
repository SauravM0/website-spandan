import React from 'react';
import { PhoneCall, RefreshCw } from 'lucide-react';
import { clinicSettings, whatsappLink } from '@/lib/settings';
import Button from '@/components/ui/Button';

/**
 * Shown when the backend could not be reached. This is deliberately not a 404:
 * the page may well exist, so we say what happened and give the visitor a way
 * to reach the clinic instead of a dead end.
 */
export default function ContentUnavailable({
  title = 'This information is temporarily unavailable',
  description = 'We could not load this from the clinic system just now. It is usually back within a few minutes — or call and the team will help straight away.',
  backHref,
  backLabel,
}: {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section className="section">
      <div className="container">
        <div className="card measure mx-auto p-8 text-center sm:p-10">
          <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-pill bg-wash-pink text-accent">
            <RefreshCw size={22} aria-hidden="true" />
          </span>
          <h1 className="heading-card text-ink">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-light">{description}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 min-[420px]:flex-row">
            <Button href={`tel:${clinicSettings.phone}`} variant="accent">
              <PhoneCall size={18} aria-hidden="true" />
              Call {clinicSettings.phone}
            </Button>
            <Button
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
            >
              WhatsApp
            </Button>
            {backHref ? (
              <Button href={backHref} variant="ghost">
                {backLabel || 'Go back'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
