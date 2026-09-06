import React from 'react';
import type { Metadata } from 'next';
import LazyMap from '@/components/contact/LazyMap';
import { clinicSettings } from '@/lib/settings';
import { Phone, MessageCircle, MapPin, Clock, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: `Contact Us | ${clinicSettings.name}`,
  description: `Contact ${clinicSettings.name} by phone, WhatsApp, email, or in person in ${clinicSettings.city}.`,
  openGraph: {
    title: `Contact ${clinicSettings.name}`,
    description: `Call, WhatsApp, or visit our clinic in ${clinicSettings.city}.`,
  },
  alternates: {
    canonical: '/contact',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'MedicalClinic',
  name: clinicSettings.name,
  telephone: clinicSettings.phone,
  email: clinicSettings.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: clinicSettings.address,
    addressLocality: clinicSettings.city,
    addressRegion: clinicSettings.state,
    postalCode: clinicSettings.pincode,
    addressCountry: 'IN',
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '07:00',
    closes: '20:00',
  },
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="soft-page-hero py-16 text-center" aria-labelledby="contact-heading">
        <div className="container">
          <h1 id="contact-heading" className="text-3xl md:text-4xl font-bold mb-3">Contact Us</h1>
          <p className="text-lg mb-8 text-text-light">Call, WhatsApp, email, or visit us. We&apos;re here to help.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              href={`tel:${clinicSettings.phone}`}
              variant="accent"
              aria-label={`Call ${clinicSettings.name} at ${clinicSettings.phone}`}
            >
              <Phone size={18} aria-hidden="true" />
              Call Now
            </Button>
            <Button
              href={clinicSettings.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              aria-label={`WhatsApp ${clinicSettings.name}`}
            >
              <MessageCircle size={18} aria-hidden="true" />
              WhatsApp
            </Button>
            <Button
              href={clinicSettings.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              aria-label="Get directions to clinic"
            >
              <MapPin size={18} aria-hidden="true" />
              Get Directions
            </Button>
          </div>
        </div>
      </section>

      <section className="section" aria-label="Contact details">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div>
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <MapPin size={18} className="text-accent" aria-hidden="true" />
                  Our Address
                </h3>
                <p className="text-text-light leading-relaxed">
                  {clinicSettings.name}<br />
                  {clinicSettings.address}<br />
                  {clinicSettings.city}, {clinicSettings.state} {clinicSettings.pincode}
                </p>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Phone size={18} className="text-accent" aria-hidden="true" />
                  Phone
                </h3>
                <p>
                  <a
                    href={`tel:${clinicSettings.phone}`}
                    className="text-accent hover:text-accent-light font-semibold min-h-[44px] inline-flex items-center"
                  >
                    {clinicSettings.phone}
                  </a>
                </p>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2">Email</h3>
                <p>
                  <a
                    href={`mailto:${clinicSettings.email}`}
                    className="text-accent hover:text-accent-light font-semibold min-h-[44px] inline-flex items-center"
                  >
                    {clinicSettings.email}
                  </a>
                </p>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Clock size={18} className="text-accent" aria-hidden="true" />
                  Working Hours
                </h3>
                <table className="text-sm text-text-light" aria-label="Clinic working hours">
                  <tbody>
                    <tr><td className="pr-6 py-1 font-medium">Monday - Saturday</td><td>7:00 AM - 8:00 PM</td></tr>
                    <tr><td className="pr-6 py-1 font-medium">Sunday</td><td>Closed</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="soft-card mb-8 p-5">
                <p className="text-sm text-text-light flex items-start gap-2">
                  <MapPin size={16} className="text-text-light mt-0.5 shrink-0" aria-hidden="true" />
                  <span>Free parking available for patients.</span>
                </p>
                <p className="text-sm text-text-light flex items-start gap-2 mt-2">
                  <MapPin size={16} className="text-text-light mt-0.5 shrink-0" aria-hidden="true" />
                  <span>Wheelchair-accessible entrance available.</span>
                </p>
              </div>

              <div className="mb-8 rounded-2xl bg-amber-50 p-5 shadow-lg" role="alert">
                <p className="text-sm font-semibold text-amber-800 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>For medical emergencies, please call local emergency services (108) or proceed to the nearest hospital.</span>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Find Us</h3>
                <a
                  href={clinicSettings.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mb-3 text-sm font-semibold text-accent hover:text-accent-light min-h-[44px]"
                >
                  <MapPin size={16} aria-hidden="true" />
                  Open in Google Maps
                </a>
                <div className="soft-card overflow-hidden">
                  <LazyMap />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
