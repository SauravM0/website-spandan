import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Spandan Super Speciality Clinic',
  description: 'Spandan Clinic\'s privacy policy — how we collect, use, and protect your personal data in compliance with DPDPA 2023.',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <section className="bg-navy text-white py-16">
        <div className="container">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="opacity-80 mt-2">Last updated: June 18, 2026</p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-[800px]">
          <div className="prose max-w-none">
            <h2 className="text-xl font-bold text-navy mt-8 mb-4">1. Information We Collect</h2>
            <p className="mb-4">
              When you submit an enquiry through our website, we collect only the following information:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Your full name</li>
              <li>Your phone number</li>
              <li>Your email address (optional)</li>
              <li>Your preferred appointment date and time (optional)</li>
              <li>The diagnostic package you are interested in</li>
              <li>Referring doctor details (optional)</li>
            </ul>
            <p className="mb-4">
              We deliberately <strong>do not</strong> collect free-text symptom descriptions, detailed medical history, 
              or any sensitive health information through this website.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">
              Your information is used <strong>only</strong> to route your enquiry to the appropriate 
              doctor&apos;s staff so they can contact you to schedule an appointment. We do not use your 
              data for marketing, newsletters, or any purpose other than responding to your enquiry.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">3. Legal Basis (DPDPA 2023)</h2>
            <p className="mb-4">
              We process your personal data based on your explicit consent, which you provide by 
              checking the consent checkbox on our enquiry form. You have the right to withdraw 
              your consent at any time by contacting us.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">4. Data Retention</h2>
            <p className="mb-4">
              We retain your enquiry data for a period of <strong>90 days</strong> after the status 
              reaches &quot;completed&quot; or &quot;closed/no response&quot;. After this period, 
              records are automatically archived. You may request earlier deletion of your data 
              by contacting us.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">5. Data Sharing</h2>
            <p className="mb-4">
              Your data is shared only with relevant staff members at Spandan Super Speciality Clinic 
              who need it to respond to your enquiry. We do not sell, rent, or share your personal 
              data with third parties for their own purposes.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">6. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organisational measures to protect your personal 
              data, including encryption in transit (TLS 1.3), database-level access controls, 
              and regular security reviews as detailed in our Security & Compliance Plan.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">7. Your Rights</h2>
            <p className="mb-4">
              Under the Digital Personal Data Protection Act (DPDPA) 2023, you have the right to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Access your personal data held by us</li>
              <li>Correct any inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent at any time</li>
              <li>Grieve any violation of your rights</li>
            </ul>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">8. Grievance Redressal</h2>
            <p className="mb-4">
              If you have any concerns about how your data is handled, please contact us at:
            </p>
            <p className="mb-2"><strong>Email:</strong> privacy@spandanclinic.com</p>
            <p className="mb-4"><strong>Phone:</strong> +91-240-1234567</p>
            <p className="mb-4">
              We will respond to your grievance within the timeframe prescribed by DPDPA 2023.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">9. Contact</h2>
            <p className="mb-4">
              Spandan Super Speciality Clinic<br />
              Chhatrapati Sambhajinagar, Maharashtra, India<br />
              <Link href="/contact" className="text-accent underline">Contact Us</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
