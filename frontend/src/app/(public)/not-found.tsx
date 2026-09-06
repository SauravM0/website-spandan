import React from 'react';
import type { Metadata } from 'next';
import { clinicSettings } from '@/lib/settings';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="section text-center py-24" aria-labelledby="not-found-heading">
      <div className="container max-w-[600px]">
        <p className="text-8xl font-extrabold text-accent/20 mb-2 leading-none">404</p>
        <h1 id="not-found-heading" className="text-3xl font-bold text-ink mb-3">
          Page not found
        </h1>
        <p className="text-text-light mb-2">
          The page you are looking for does not exist or has been moved.
        </p>
        <p className="text-text-light text-sm mb-8">
          You may have followed a broken link, or the page may have been removed.
        </p>

        <div className="mb-8">
          <p className="text-sm font-semibold text-text-light mb-3 uppercase tracking-wide">
            Try these pages instead
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              href="/"
              variant="accent"
            >
              Home
            </Button>
            <Button
              href={`tel:${clinicSettings.phone}`}
              variant="accent"
            >
              Call the Clinic
            </Button>
            <Button
              href="/doctors"
              variant="outline"
            >
              Our Doctors
            </Button>
            <Button
              href="/care"
              variant="outline"
            >
              Health Packages
            </Button>
            <Button
              href="/contact"
              variant="outline"
            >
              Contact Us
            </Button>
          </div>
        </div>

        <div className="soft-card p-5">
          <p className="text-sm font-semibold text-ink mb-2">Need immediate help?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              href={`tel:${clinicSettings.phone}`}
              variant="accent"
              aria-label={`Call ${clinicSettings.name}`}
            >
              Call {clinicSettings.phone}
            </Button>
            <Button
              href={clinicSettings.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
            >
              WhatsApp us
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
