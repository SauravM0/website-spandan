import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ConsentBanner from '@/components/layout/ConsentBanner';
import StickyCTA from '@/components/home/StickyCTA';
import SkipLink from '@/components/ui/SkipLink';
import { clinicSettings } from '@/lib/settings';

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
            name: clinicSettings.name,
            image: '/logo.png',
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
            openingHoursSpecification: [
              {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                opens: '08:00',
                closes: '20:00',
              },
            ],
          }),
        }}
      />
      <Navbar />
      <main id="main-content" className="relative flex-1" tabIndex={-1}>{children}</main>
      <Footer />
      <ConsentBanner />
      <StickyCTA />
    </>
  );
}
