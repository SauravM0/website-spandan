import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { clinicSettings, PRIVACY_POLICY_VERSION } from '@/lib/settings';

export const metadata: Metadata = {
  title: `Privacy Policy | ${clinicSettings.name}`,
  description: `${clinicSettings.name}'s privacy policy — how we collect, use, store, and protect your personal data in compliance with the Digital Personal Data Protection Act (DPDPA) 2023.`,
  alternates: {
    canonical: '/privacy',
  },
};

const sections = [
  { id: 'who-we-are', title: 'Who We Are (Controller Identity)' },
  { id: 'data-we-collect', title: 'Data We Collect by Workflow' },
  { id: 'purpose-and-basis', title: 'Purpose and Legal Basis' },
  { id: 'mandatory-vs-optional', title: 'Mandatory vs Optional Information' },
  { id: 'processors', title: 'Third-Party Processors' },
  { id: 'retention', title: 'Data Retention' },
  { id: 'security', title: 'Data Security' },
  { id: 'cookies', title: 'Cookies and Browser Storage' },
  { id: 'your-rights', title: 'Your Rights Under DPDPA 2023' },
  { id: 'children', title: 'Children and Guardian Consent' },
  { id: 'cross-border', title: 'Cross-Border Data Transfer' },
  { id: 'complaints', title: 'Grievance Redressal and Contact' },
  { id: 'changes', title: 'Changes to This Policy' },
] as const;

export default function PrivacyPolicyPage() {
  const currYear = new Date().getFullYear();

  return (
    <>
      <section className="soft-page-hero py-16">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-text-light">Version: {PRIVACY_POLICY_VERSION} | Effective: 8 July 2026</p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-[800px]">
          <nav aria-label="Table of contents" className="soft-card mb-10 p-6">
            <h2 className="text-lg font-bold text-navy mb-4">Contents</h2>
            <ul className="space-y-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-accent hover:text-accent-light underline text-sm">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="prose max-w-none">
            <section id="who-we-are" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">1. Who We Are (Controller Identity)</h2>
              <p className="mb-3">
                {clinicSettings.name} is the data controller responsible for the personal data collected 
                through this website.
              </p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li><strong>Clinic:</strong> {clinicSettings.name}</li>
                <li><strong>Address:</strong> {clinicSettings.address}, {clinicSettings.city}, {clinicSettings.state} {clinicSettings.pincode}, India</li>
                <li><strong>Phone:</strong> <a href={`tel:${clinicSettings.phone}`} className="text-accent underline">{clinicSettings.phone}</a></li>
                <li><strong>Email:</strong> <a href={`mailto:${clinicSettings.email}`} className="text-accent underline">{clinicSettings.email}</a></li>
              </ul>
            </section>

            <section id="data-we-collect" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">2. Data We Collect by Workflow</h2>
              <p className="mb-3">
                The data we collect depends on how you interact with our website. Below is a complete 
                inventory of personal data collected in each workflow.
              </p>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">Enquiry Form</h3>
              <p className="text-sm text-text-light mb-2">When you submit an enquiry through our contact, doctor, or package enquiry forms:</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Full name (required)</li>
                <li>Phone number, Indian mobile with +91 prefix (required)</li>
                <li>Email address (optional)</li>
                <li>Preferred appointment date (optional)</li>
                <li>Preferred time window (optional)</li>
                <li>Referring doctor name (optional)</li>
                <li>Free-text message (optional, max 1000 characters)</li>
                <li>Selected package or doctor ID (if applicable)</li>
                <li>Interface language (English, Hindi, or Marathi)</li>
                <li>Consent timestamp</li>
              </ul>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">Appointment Booking</h3>
              <p className="text-sm text-text-light mb-2">When you book an appointment online:</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Full name</li>
                <li>Phone number</li>
                <li>Email address (optional)</li>
                <li>Date of birth or age (years, months, days)</li>
                <li>Gender (optional)</li>
                <li>Address, city, state, pincode (optional)</li>
                <li>ABHA number (optional)</li>
                <li>Last four digits of Aadhaar (optional)</li>
                <li>Preferred language</li>
                <li>Appointment date, time, and doctor selection</li>
                <li>Referral source</li>
                <li>Consent version and timestamp</li>
              </ul>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">Package Order</h3>
              <p className="text-sm text-text-light mb-2">When you purchase a health package:</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Purchaser name, phone, email</li>
                <li>Patient name (if different from purchaser)</li>
                <li>Package selection and quantity</li>
                <li>Payment information (processed through PhonePe &mdash; we do not store full card or UPI credentials)</li>
                <li>Policy version reference</li>
              </ul>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">Clinic Visit (Offline)</h3>
              <p className="text-sm text-text-light mb-1">When you visit the clinic, additional records are created by staff:</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Appointment records linked to your profile</li>
                <li>Clinical notes entered by treating doctors (not submitted via website)</li>
                <li>Payment and receipt records</li>
              </ul>
            </section>

            <section id="purpose-and-basis" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">3. Purpose and Legal Basis</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold">Purpose</th>
                      <th className="text-left py-2 pr-4 font-semibold">Data Used</th>
                      <th className="text-left py-2 font-semibold">Legal Basis (DPDPA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">Respond to your enquiry</td>
                      <td className="py-2 pr-4">Name, phone, email, message</td>
                      <td className="py-2">Consent (Section 6)</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">Schedule and manage appointments</td>
                      <td className="py-2 pr-4">Name, phone, DOB, gender, address</td>
                      <td className="py-2">Consent + Contract performance</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">Process payments and issue receipts</td>
                      <td className="py-2 pr-4">Name, phone, email, payment reference</td>
                      <td className="py-2">Contract performance + Legal obligation (tax)</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">Send internal staff notifications</td>
                      <td className="py-2 pr-4">Name, phone, email, package/dates</td>
                      <td className="py-2">Legitimate interest (service delivery)</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">Maintain audit trail for data governance</td>
                      <td className="py-2 pr-4">Action logs, IP hash, timestamps</td>
                      <td className="py-2">Legal obligation + Legitimate interest</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">Comply with tax and regulatory requirements</td>
                      <td className="py-2 pr-4">Payment records, invoices, receipts</td>
                      <td className="py-2">Legal obligation</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="mandatory-vs-optional" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">4. Mandatory vs Optional Information</h2>
              <p className="mb-3">
                We clearly mark required fields on all forms. If mandatory information is not provided, 
                we cannot process the corresponding request (e.g., we cannot contact you without your 
                name and phone number).
              </p>
              <p className="mb-3">
                Optional fields help us serve you better (e.g., a preferred date helps us schedule 
                efficiently) but are not required to proceed.
              </p>
              <p className="font-semibold text-sm">
                Important: Do not include sensitive health information, medical reports, or emergency 
                details in free-text message fields. Please use phone or in-person consultation for 
                such communications.
              </p>
            </section>

            <section id="processors" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">5. Third-Party Processors</h2>
              <p className="mb-3">
                We engage the following third-party service providers who process personal data on our 
                behalf. All processors are contractually bound to process data only for our specified 
                purposes and to maintain appropriate security measures.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold">Processor</th>
                      <th className="text-left py-2 pr-4 font-semibold">Service</th>
                      <th className="text-left py-2 pr-4 font-semibold">Data Accessed</th>
                      <th className="text-left py-2 font-semibold">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">Email service provider (SMTP)</td>
                      <td className="py-2 pr-4">Sending enquiry notifications to clinic staff</td>
                      <td className="py-2 pr-4">Name, phone, email, enquiry details</td>
                      <td className="py-2">India</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">PhonePe Private Limited</td>
                      <td className="py-2 pr-4">Payment processing for appointments and packages</td>
                      <td className="py-2 pr-4">Name, phone, payment amount, transaction reference</td>
                      <td className="py-2">India</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">Meta Platforms Inc. (WhatsApp Business API)</td>
                      <td className="py-2 pr-4">Sending enquiry and appointment notifications to clinic staff</td>
                      <td className="py-2 pr-4">Name, phone, enquiry/appointment reference</td>
                      <td className="py-2">India / United States</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">YouTube (Google LLC)</td>
                      <td className="py-2 pr-4">Embedded health education videos (nocookie domain)</td>
                      <td className="py-2 pr-4">None — privacy-enhanced mode</td>
                      <td className="py-2">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-text-light">
                We do not sell, rent, or share your personal data with third parties for their own 
                marketing or any purpose other than those listed above.
              </p>
            </section>

            <section id="retention" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">6. Data Retention</h2>
              <p className="mb-3">
                We retain personal data only as long as necessary to fulfil the purposes for which it 
                was collected, or as required by law.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>
                  <strong>Enquiries (appointment requests):</strong> Archived 90 days after reaching 
                  a terminal status (completed or closed/no response). Archived records are excluded 
                  from active views but retained for audit purposes.
                </li>
                <li>
                  <strong>Patient records:</strong> Retained for the duration of the patient 
                  relationship plus the period required by Indian medical council regulations.
                </li>
                <li>
                  <strong>Payment and financial records:</strong> Retained for 7 years as required 
                  by Indian tax laws (Income Tax Act, 1961).
                </li>
                <li>
                  <strong>Audit logs:</strong> Retained for a minimum of 3 years.
                </li>
                <li>
                  <strong>Notification logs:</strong> Retained for 1 year.
                </li>
              </ul>
              <p className="mt-3 text-sm">
                You may request earlier deletion of your data (see &ldquo;Your Rights&rdquo; below). 
                However, we may need to retain certain records to comply with legal obligations.
              </p>
            </section>

            <section id="security" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">7. Data Security</h2>
              <p className="mb-3">
                We implement reasonable technical and organisational measures appropriate to the 
                nature of the personal data we process. These include:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Encryption in transit using TLS for all API communications</li>
                <li>Database-level access controls restricted to authorised staff only</li>
                <li>Password hashing for staff accounts (bcrypt)</li>
                <li>CSRF token protection on all state-changing requests</li>
                <li>Rate limiting on public enquiry submissions</li>
                <li>Session management with configurable expiry</li>
                <li>Structured logging without intentional PII inclusion</li>
              </ul>
              <p className="mt-3 text-sm text-text-light">
                No security measure is infallible. We review and update our security practices 
                periodically but cannot guarantee absolute protection against all threats.
              </p>
            </section>

            <section id="cookies" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">8. Cookies and Browser Storage</h2>
              <p className="mb-3">
                We use minimal browser storage. No tracking cookies, third-party analytics, or 
                advertising technologies are used on this website.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold">Storage Type</th>
                      <th className="text-left py-2 pr-4 font-semibold">Name</th>
                      <th className="text-left py-2 pr-4 font-semibold">Purpose</th>
                      <th className="text-left py-2 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">Cookie (HTTP-only)</td>
                      <td className="py-2 pr-4">admin_session</td>
                      <td className="py-2 pr-4">Authenticated admin session</td>
                      <td className="py-2">24 hours (configurable)</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">localStorage</td>
                      <td className="py-2 pr-4">consent_banner</td>
                      <td className="py-2 pr-4">Remembers dismissal of consent notice</td>
                      <td className="py-2">Until cleared</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">localStorage</td>
                      <td className="py-2 pr-4">i18nextLng</td>
                      <td className="py-2 pr-4">Saved language preference</td>
                      <td className="py-2">Until cleared</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 pr-4">In-memory (session)</td>
                      <td className="py-2 pr-4">CSRF token</td>
                      <td className="py-2 pr-4">Form submission security</td>
                      <td className="py-2">1 hour</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="soft-card mt-3 p-4 text-sm">
                <strong>No tracking technologies are used.</strong> We do not use Google Analytics, 
                Facebook Pixel, or any other analytics or behavioural tracking tools.
              </p>
            </section>

            <section id="your-rights" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">9. Your Rights Under DPDPA 2023</h2>
              <p className="mb-3">
                Under the Digital Personal Data Protection Act (DPDPA) 2023, you have the following 
                rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>
                  <strong>Right to Access:</strong> Request a summary of the personal data we hold 
                  about you and how it has been processed.
                </li>
                <li>
                  <strong>Right to Correction:</strong> Request correction of inaccurate or incomplete 
                  personal data.
                </li>
                <li>
                  <strong>Right to Deletion:</strong> Request deletion of your personal data, subject 
                  to legal retention requirements.
                </li>
                <li>
                  <strong>Right to Withdraw Consent:</strong> Withdraw your consent at any time. 
                  Withdrawal does not affect the lawfulness of processing before withdrawal.
                </li>
                <li>
                  <strong>Right to Grieve:</strong> Lodge a grievance regarding any violation of 
                  your data protection rights.
                </li>
              </ul>
              <p className="mt-3 text-sm">
                To exercise any of these rights, please contact us using the details in the 
                section below. We will respond within the timeframe prescribed by DPDPA 2023.
              </p>
            </section>

            <section id="children" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">10. Children and Guardian Consent</h2>
              <p className="mb-3">
                Our services are intended for persons who are 18 years of age or older. We do not 
                knowingly collect personal data of children without verifiable parental or guardian 
                consent.
              </p>
              <p className="mb-3">
                When a parent or guardian books an appointment or enquiry on behalf of a minor, 
                the guardian&apos;s consent is deemed to cover the minor&apos;s data provided in 
                the course of that transaction.
              </p>
              <p className="text-sm">
                If you believe we have inadvertently collected personal data of a child without 
                appropriate consent, please contact us immediately so we can take corrective action.
              </p>
            </section>

            <section id="cross-border" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">11. Cross-Border Data Transfer</h2>
              <p className="mb-3">
                Your personal data is primarily stored and processed on servers located in India. 
                Where third-party processors operate globally (e.g., WhatsApp notifications), 
                data may be transferred to jurisdictions with equivalent data protection standards 
                as required by DPDPA 2023.
              </p>
              <p className="text-sm text-text-light">
                We do not transfer your data to jurisdictions without adequate protection safeguards 
                unless explicitly authorised by your consent or by law.
              </p>
            </section>

            <section id="complaints" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">12. Grievance Redressal and Contact</h2>
              <p className="mb-3">
                If you have any questions, concerns, or complaints about this Privacy Policy or our 
                data practices, please contact us:
              </p>
              <div className="soft-card mb-4 p-5">
                <p className="mb-2"><strong>Contact:</strong> {clinicSettings.name}</p>
                <p className="mb-2"><strong>Phone:</strong> <a href={`tel:${clinicSettings.phone}`} className="text-accent underline">{clinicSettings.phone}</a></p>
                <p className="mb-2"><strong>Email:</strong> <a href={`mailto:${clinicSettings.email}`} className="text-accent underline">{clinicSettings.email}</a></p>
                <p className="mb-2"><strong>Address:</strong> {clinicSettings.address}, {clinicSettings.city}, {clinicSettings.state} {clinicSettings.pincode}</p>
                <p><strong>Website:</strong> <Link href="/contact" className="text-accent underline">Contact page</Link></p>
              </div>
              <p className="mb-3">
                We will acknowledge receipt of your grievance within 48 hours and resolve it within 
                the period prescribed by DPDPA 2023.
              </p>
              <p className="text-sm text-text-light">
                If you are not satisfied with our response, you may file a complaint with the 
                Data Protection Board of India.
              </p>
            </section>

            <section id="changes" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">13. Changes to This Policy</h2>
              <p className="mb-3">
                We may update this Privacy Policy from time to time. The current version is 
                identified by the version number and effective date at the top of this page.
              </p>
              <p className="mb-3">
                Material changes will be notified through the website. Your continued use of our 
                services after a change constitutes acceptance of the updated policy. For 
                significant changes that affect your rights, we may seek fresh consent where 
                required by law.
              </p>
              <p className="text-sm text-text-light">
                Previous versions of this policy are available upon request.
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
