import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { clinicSettings, TERMS_POLICY_VERSION } from '@/lib/settings';

export const metadata: Metadata = {
  title: `Terms of Use | ${clinicSettings.name}`,
  description: `Terms of use, payment policy, cancellation policy, and refund policy for ${clinicSettings.name}. Learn about appointment booking, fees, and your rights.`,
  alternates: {
    canonical: '/terms',
  },
};

const sections = [
  { id: 'scope', title: 'Scope and Definitions' },
  { id: 'appointments', title: 'Appointment Holds and Booking' },
  { id: 'payments', title: 'Fees and Payment' },
  { id: 'cancellations', title: 'Rescheduling, Cancellation, and No-Show' },
  { id: 'packages', title: 'Package Booking and Preparation' },
  { id: 'refunds', title: 'Refund Eligibility, Process, and Timeline' },
  { id: 'payment-failure', title: 'Payment Failure and Duplicate Debit' },
  { id: 'receipts', title: 'Receipts' },
  { id: 'medical-disclaimer', title: 'Medical and Emergency Disclaimer' },
  { id: 'content', title: 'Content Use and Intellectual Property' },
  { id: 'limitations', title: 'Limitation of Liability' },
  { id: 'contact', title: 'Contact and Dispute Resolution' },
  { id: 'changes', title: 'Changes to These Terms' },
] as const;

export default function TermsOfUsePage() {
  return (
    <>
      <section className="soft-page-hero py-16">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold">Terms of Use</h1>
          <p className="mt-2 text-text-light">
            Version: {TERMS_POLICY_VERSION} | Effective: 8 July 2026
          </p>
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
            <section id="scope" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">1. Scope and Definitions</h2>
              <p className="mb-3">
                These Terms of Use (&ldquo;Terms&rdquo;) govern your use of the {clinicSettings.name} 
                website and the services offered through it, including appointment booking, diagnostic 
                package purchases, and enquiries.
              </p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li><strong>&ldquo;Clinic&rdquo;</strong> means {clinicSettings.name}.</li>
                <li><strong>&ldquo;Website&rdquo;</strong> means the clinic website.</li>
                <li><strong>&ldquo;Services&rdquo;</strong> means appointment booking, package ordering, enquiries, and related features.</li>
                <li><strong>&ldquo;You&rdquo;</strong> means the person accessing or using the website.</li>
                <li><strong>&ldquo;We&rdquo;</strong> means the clinic.</li>
              </ul>
            </section>

            <section id="appointments" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">2. Appointment Holds and Booking</h2>
              <p className="mb-3">
                When you book an appointment through our website, the selected time slot is temporarily 
                held while payment is being processed. If payment is not completed within the hold 
                duration, the slot is automatically released and made available to others.
              </p>
              <p className="mb-3">
                An appointment is confirmed only after successful payment verification by our system. 
                A confirmation with appointment details is displayed on screen and can also be sent 
                via email if provided.
              </p>
              <p className="text-sm text-text-light">
                Appointment holds expire after the configured duration (typically 10&ndash;15 minutes). 
                We recommend completing payment promptly to secure your slot.
              </p>
            </section>

            <section id="payments" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">3. Fees and Payment</h2>
              <p className="mb-3">
                All fees are displayed in Indian Rupees (INR) and include applicable taxes unless 
                stated otherwise. The consultation fee shown at booking is the applicable fee at 
                the time of booking.
              </p>
              <p className="mb-3">
                Payments are processed through PhonePe, a third-party payment gateway. We do not 
                store your full payment instrument details (card numbers, UPI credentials, or 
                bank account numbers) on our servers.
              </p>
              <p className="mb-3">
                By making a payment, you authorise the clinic to charge the applicable fees 
                through the selected payment method. Payment is due at the time of booking for 
                appointments and at the time of order for packages.
              </p>
              <p className="text-sm text-text-light">
                Discounted prices, where shown, are valid only for the duration specified and 
                cannot be combined with other offers unless explicitly stated.
              </p>
            </section>

            <section id="cancellations" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">4. Rescheduling, Cancellation, and No-Show</h2>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">Rescheduling</h3>
              <p className="mb-3">
                To reschedule an appointment, please contact the clinic by phone. Rescheduling 
                is subject to doctor availability. Fees already paid can be applied to the 
                rescheduled appointment.
              </p>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">Cancellation</h3>
              <p className="mb-3">
                Appointment cancellations must be made by contacting the clinic directly. 
                The cancellation cutoff is typically 24 hours before the scheduled time. 
                Cancellations made after the cutoff may be treated as a no-show.
              </p>
              <p className="mb-3">
                Package orders can be cancelled before the scheduled test date. Please contact 
                the clinic to request cancellation.
              </p>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">No-Show</h3>
              <p className="mb-3">
                If you do not arrive for your scheduled appointment without prior cancellation, 
                it will be recorded as a no-show. No-show appointments are generally not eligible 
                for a refund. Contact the clinic if exceptional circumstances apply.
              </p>
              <p className="text-sm text-text-light">
                Please call us at least 24 hours in advance if you need to cancel or reschedule.
              </p>
            </section>

            <section id="packages" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">5. Package Booking and Preparation</h2>
              <p className="mb-3">
                Diagnostic health packages can be purchased through our website. Each package 
                includes specific tests as described on the package detail page.
              </p>
              <p className="mb-3">
                Some packages require fasting or other preparation. Please review the preparation 
                instructions provided with each package before your appointment. Failure to follow 
                preparation instructions may affect test results.
              </p>
              <p className="mb-3">
                Package prices and test panels are subject to change. Purchases are honoured at 
                the price and test configuration in effect at the time of purchase.
              </p>
              <p className="text-sm text-text-light">
                Specific package terms and no-refund conditions (if any) are displayed on the 
                package detail page and during checkout.
              </p>
            </section>

            <section id="refunds" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">6. Refund Eligibility, Process, and Timeline</h2>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">Appointment Fees</h3>
              <p className="mb-3">
                Consultation fees for appointments cancelled before the cutoff time (24 hours 
                before scheduled time) may be eligible for a refund or credit toward a future 
                appointment. Cancellations after the cutoff and no-shows are generally not 
                refundable.
              </p>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">Package Payments</h3>
              <p className="mb-3">
                Package payments are generally non-refundable after payment verification. 
                Certain packages may have specific no-refund terms displayed at the time of 
                purchase. Exceptions may be considered for verified medical or operational 
                reasons at the clinic&rsquo;s discretion.
              </p>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">Refund Process</h3>
              <p className="mb-3">
                All refunds are processed manually by clinic staff. To request a refund, please 
                contact us with your order or payment reference number. Refunds are processed 
                back to the original payment method where possible.
              </p>

              <h3 className="text-lg font-semibold text-navy mt-6 mb-2">Refund Timeline</h3>
              <p className="mb-3">
                Approved refunds are typically processed within 7&ndash;14 business days. The 
                actual credit to your account depends on your bank or payment provider&rsquo;s 
                processing times.
              </p>
              <p className="text-sm text-text-light">
                Refund eligibility is assessed on a case-by-case basis. Please contact us for 
                any refund-related queries.
              </p>
            </section>

            <section id="payment-failure" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">7. Payment Failure and Duplicate Debit</h2>
              <p className="mb-3">
                If a payment attempt fails but your account shows a debit, the amount is typically 
                reversed by your bank or payment provider within 3&ndash;5 business days. Please 
                contact us if the reversal does not occur within this period.
              </p>
              <p className="mb-3">
                In the rare event of a duplicate debit, please contact the clinic with your 
                payment reference details. We will verify and initiate a refund for the 
                duplicate amount.
              </p>
              <p className="text-sm text-text-light">
                Our payment integration includes idempotency checks to prevent duplicate 
                charges, but we recommend not resubmitting a payment until the first attempt 
                result is confirmed.
              </p>
            </section>

            <section id="receipts" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">8. Receipts</h2>
              <p className="mb-3">
                A payment receipt is generated for every completed transaction. Receipts are 
                issued electronically and can be downloaded from the payment confirmation page 
                or requested by contacting the clinic.
              </p>
              <p className="mb-3">
                Each receipt includes a unique receipt number, transaction details, and a 
                checksum for verification. Receipts serve as proof of payment and should be 
                retained for your records.
              </p>
              <p className="text-sm text-text-light">
                Duplicate receipts can be requested by contacting the clinic with your order 
                or appointment details.
              </p>
            </section>

            <section id="medical-disclaimer" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">9. Medical and Emergency Disclaimer</h2>
              <p className="mb-3">
                The health-related information published on this website, including articles, 
                blog posts, package descriptions, and test result explanations, is for general 
                educational and informational purposes only.
              </p>
              <p className="mb-3">
                It is <strong>not</strong> a substitute for professional medical advice, 
                diagnosis, or treatment. Always seek the advice of your physician or qualified 
                healthcare provider with any questions you may have regarding a medical condition.
              </p>
              <p className="mb-3">
                <strong>For medical emergencies, please call local emergency services (108) or 
                proceed to the nearest hospital immediately.</strong> Do not use this website, 
                its enquiry forms, or its communication features for emergency situations.
              </p>
              <p className="text-sm text-text-light">
                Test results and reports provided through our services should be reviewed and 
                interpreted by a qualified doctor. The clinic is not liable for outcomes based 
                on the use or misuse of information on this website.
              </p>
            </section>

            <section id="content" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">10. Content Use and Intellectual Property</h2>
              <p className="mb-3">
                All content on this website, including text, images, graphics, logos, videos, 
                and software, is the property of {clinicSettings.name} or its licensors and is 
                protected by applicable intellectual property laws.
              </p>
              <p className="mb-3">
                You may view, download, and print content for personal, non-commercial use only. 
                You may not reproduce, distribute, modify, create derivative works from, or 
                publicly display any content without prior written permission from the clinic.
              </p>
              <p className="text-sm text-text-light">
        All trademarks, service marks, and trade names are the property of {clinicSettings.name}.
              </p>
            </section>

            <section id="limitations" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">11. Limitation of Liability</h2>
              <p className="mb-3">
                To the maximum extent permitted by applicable law, {clinicSettings.name} shall 
                not be liable for any direct, indirect, incidental, consequential, or special 
                damages arising from or in connection with your use of the website or services, 
                including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-sm mb-3">
                <li>Any interruption or cessation of service</li>
                <li>Any errors or omissions in content</li>
                <li>Any loss or corruption of data</li>
                <li>Any unauthorised access to or alteration of your data</li>
                <li>Any reliance on information obtained through the website</li>
              </ul>
              <p className="mb-3">
                This limitation applies whether the alleged liability is based on contract, tort 
                (including negligence), strict liability, or any other legal theory, even if the 
                clinic has been advised of the possibility of such damage.
              </p>
              <p className="text-sm text-text-light">
                Nothing in these Terms limits or excludes liability for death or personal injury 
                caused by negligence, fraud, or any other liability that cannot be excluded under 
                applicable law.
              </p>
            </section>

            <section id="contact" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">12. Contact and Dispute Resolution</h2>
              <p className="mb-3">
                If you have any questions, concerns, or disputes regarding these Terms or your 
                use of our services, please contact us:
              </p>
              <div className="soft-card mb-4 p-5">
                <p className="mb-2"><strong>{clinicSettings.name}</strong></p>
                <p className="mb-2">Phone: <a href={`tel:${clinicSettings.phone}`} className="text-accent underline">{clinicSettings.phone}</a></p>
                <p className="mb-2">Email: <a href={`mailto:${clinicSettings.email}`} className="text-accent underline">{clinicSettings.email}</a></p>
                <p className="mb-2">Address: {clinicSettings.address}, {clinicSettings.city}, {clinicSettings.state} {clinicSettings.pincode}</p>
                <p><Link href="/contact" className="text-accent underline">Contact page</Link></p>
              </div>
              <p className="mb-3">
                Any disputes arising from these Terms shall be governed by the laws of India. 
                The courts in {clinicSettings.city}, {clinicSettings.state} shall have exclusive 
                jurisdiction.
              </p>
              <p className="text-sm text-text-light">
                We encourage you to contact us first to resolve any issues before pursuing 
                formal dispute resolution.
              </p>
            </section>

            <section id="changes" className="mb-10 scroll-mt-24">
              <h2 className="text-xl font-bold text-navy mb-4">13. Changes to These Terms</h2>
              <p className="mb-3">
                We may update these Terms from time to time. The current version is identified 
                by the version number and effective date at the top of this page.
              </p>
              <p className="mb-3">
                Material changes will be communicated through the website. Your continued use 
                of our services after a change constitutes acceptance of the updated Terms. For 
                significant changes that affect your rights, we may seek fresh acknowledgement 
                during checkout where required.
              </p>
              <p className="text-sm text-text-light">
                Previous versions of these Terms are available upon request.
              </p>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
