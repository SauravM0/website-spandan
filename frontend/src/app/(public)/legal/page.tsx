import React from 'react';
import type { Metadata } from 'next';
import { FileText, ShieldCheck, UserCheck } from 'lucide-react';
import PrivacyPolicyContent from '@/components/legal/PrivacyPolicyContent';
import TermsContent from '@/components/legal/TermsContent';
import DataRightsForm from '@/components/legal/DataRightsForm';
import { clinicSettings, PRIVACY_POLICY_VERSION, TERMS_POLICY_VERSION } from '@/lib/settings';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: `Privacy, Terms & Your Data | ${clinicSettings.name}`,
  description: `Privacy policy, terms of use, and data rights requests for ${clinicSettings.name}, under the Digital Personal Data Protection Act (DPDPA) 2023.`,
  alternates: { canonical: '/legal' },
  openGraph: {
    title: `Privacy, Terms & Your Data | ${clinicSettings.name}`,
    description: 'Privacy policy, terms of use, and how to exercise your data rights.',
  },
};

export default function LegalPage() {
  return (
    <>
      <section className="soft-page-hero">
        <div className="container py-14 md:py-18">
          <div className="measure">
            <p className="eyebrow">Policies</p>
            <h1 className="heading-display mt-3 text-ink">Privacy, terms and your data</h1>
            <p className="lede mt-4">
              How the clinic handles your personal data, the terms that apply to using this site,
              and how to ask us to access, correct or delete what we hold.
            </p>
            <p className="mt-4 text-sm text-text-light">
              Privacy {PRIVACY_POLICY_VERSION} · Terms {TERMS_POLICY_VERSION} · Effective 8 July 2026
            </p>
          </div>

          <nav aria-label="Policy sections" className="mt-8 flex flex-wrap gap-2">
            <Button href="#privacy" variant="outline" size="sm">
              <ShieldCheck size={15} aria-hidden="true" />
              Privacy policy
            </Button>
            <Button href="#terms" variant="outline" size="sm">
              <FileText size={15} aria-hidden="true" />
              Terms of use
            </Button>
            <Button href="#data-request" variant="outline" size="sm">
              <UserCheck size={15} aria-hidden="true" />
              Request your data
            </Button>
          </nav>
        </div>
      </section>

      <div id="privacy" className="section scroll-mt-24">
        <PrivacyPolicyContent />
      </div>

      <div id="terms" className="section section-alt scroll-mt-24">
        <TermsContent />
      </div>

      <div className="scroll-mt-24">
        <DataRightsForm />
      </div>
    </>
  );
}
