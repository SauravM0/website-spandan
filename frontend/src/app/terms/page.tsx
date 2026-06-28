import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use | Spandan Super Speciality Clinic',
  description: 'Terms of use for the Spandan Super Speciality Clinic website. Learn about your rights and responsibilities when using our services.',
};

export default function TermsOfUsePage() {
  return (
    <>
      <section className="bg-navy text-white py-16">
        <div className="container">
          <h1 className="text-3xl font-bold">Terms of Use</h1>
          <p className="opacity-80 mt-2">Last updated: June 18, 2026</p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-[800px]">
          <div className="prose max-w-none">
            <h2 className="text-xl font-bold text-navy mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing or using the Spandan Super Speciality Clinic website, you agree to be bound 
              by these Terms of Use. If you do not agree, please do not use this website.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">2. Use of Service</h2>
            <p className="mb-4">
              This website is provided for the purpose of learning about our clinic, our diagnostic 
              packages, and submitting enquiries for appointments. You agree to use this website 
              only for lawful purposes and in a way that does not infringe the rights of others.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">3. Enquiry Submissions</h2>
            <p className="mb-4">
              By submitting an enquiry through this website, you confirm that the information 
              provided is accurate and that you consent to being contacted by our clinic staff 
              regarding your enquiry. Submitting false or misleading information may result in 
              your enquiry being rejected.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">4. Medical Disclaimer</h2>
            <p className="mb-4">
              The health-related information published on this website, including articles and 
              blog posts, is for general educational purposes only. It is not a substitute for 
              professional medical advice, diagnosis, or treatment. Always seek the advice of 
              your physician or qualified healthcare provider with any questions you may have 
              regarding a medical condition.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">5. Intellectual Property</h2>
            <p className="mb-4">
              All content on this website, including text, images, graphics, and logos, is the 
              property of Spandan Super Speciality Clinic unless otherwise stated. You may not 
              reproduce, distribute, or modify any content without prior written permission.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">6. Limitation of Liability</h2>
            <p className="mb-4">
              Spandan Super Speciality Clinic shall not be liable for any damages arising from 
              the use or inability to use this website, including but not limited to indirect, 
              incidental, or consequential damages.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">7. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these Terms of Use at any time. Changes will be 
              effective immediately upon posting. Your continued use of the website after changes 
              constitutes acceptance of the new terms.
            </p>

            <h2 className="text-xl font-bold text-navy mt-8 mb-4">8. Governing Law</h2>
            <p className="mb-4">
              These terms are governed by the laws of India. Any disputes shall be subject to the 
              jurisdiction of courts in Chhatrapati Sambhajinagar, Maharashtra.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
