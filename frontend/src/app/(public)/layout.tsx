import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ConsentBanner from '@/components/layout/ConsentBanner';
import StickyCTA from '@/components/home/StickyCTA';
import SkipLink from '@/components/ui/SkipLink';
import { Activity, HeartPulse, Microscope, Scale, Stethoscope, Syringe } from 'lucide-react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'MedicalClinic',
            name: 'Spandan Super Speciality Clinic',
            image: '/logo.png',
            telephone: '+917798095795',
            email: 'info@spandanclinic.com',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Plot No. 63, Alankar Housing Society, Beside Essar Petrol Pump, Gajanan Maharaj Mandir Rd, Pundlik Nagar, Garkheda',
              addressLocality: 'Chhatrapati Sambhajinagar',
              addressRegion: 'Maharashtra',
              postalCode: '431009',
              addressCountry: 'IN',
            },
            openingHoursSpecification: [
              {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                opens: '07:00',
                closes: '20:00',
              },
            ],
          }),
        }}
      />
      <Navbar />
      <div className="clinical-motifs" aria-hidden="true">
        <HeartPulse className="clinical-motif clinical-motif-1" />
        <Stethoscope className="clinical-motif clinical-motif-2" />
        <Activity className="clinical-motif clinical-motif-3" />
        <Microscope className="clinical-motif clinical-motif-4" />
        <Syringe className="clinical-motif clinical-motif-5" />
        <Scale className="clinical-motif clinical-motif-6" />
        <HeartPulse className="clinical-motif clinical-motif-7" />
        <Activity className="clinical-motif clinical-motif-8" />
      </div>
      <main id="main-content" className="relative flex-1" tabIndex={-1}>{children}</main>
      <Footer />
      <ConsentBanner />
      <StickyCTA />
    </>
  );
}
