import React from 'react';
import type { Metadata } from 'next';
import EnquiryForm from '../../components/forms/EnquiryForm';

export const metadata: Metadata = {
  title: 'Contact Us | Spandan Super Speciality Clinic',
  description: 'Get in touch with Spandan Clinic. Call, email, or visit us in Chhatrapati Sambhajinagar. Submit an enquiry for appointments and health packages.',
  openGraph: {
    title: 'Contact Spandan Super Speciality Clinic',
    description: 'Reach out to us for appointments and enquiries.',
  },
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-navy text-white py-16 text-center">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Contact Us</h1>
          <p className="opacity-85 text-lg">We're here to help. Reach out to us anytime.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-2 gap-12">
            <div>
              <div className="mb-10">
                <h3 className="text-lg font-semibold mb-2">Our Address</h3>
                <p className="text-text-light leading-relaxed">
                  Spandan Super Speciality Clinic<br />
                  Plot No. 63, Alankar Housing Society,<br />
                  Beside Essar Petrol Pump,<br />
                  Gajanan Maharaj Mandir Rd, Pundlik Nagar,<br />
                  Garkheda, Chhatrapati Sambhajinagar,<br />
                  Maharashtra 431009
                </p>
              </div>

              <div className="mb-10">
                <h3 className="text-lg font-semibold mb-2">Phone</h3>
                <p className="text-text-light">+91 7798095795</p>
                <p className="text-text-light">+91 9552399823</p>
              </div>

              <div className="mb-10">
                <h3 className="text-lg font-semibold mb-2">Email</h3>
                <p className="text-text-light">info@spandanclinic.com</p>
              </div>

              <div className="mb-10">
                <h3 className="text-lg font-semibold mb-2">Working Hours</h3>
                <table className="text-sm text-text-light">
                  <tbody>
                    <tr><td className="pr-4 py-1">Mon - Sat</td><td>7:00 AM - 8:00 PM</td></tr>
                    <tr><td className="pr-4 py-1">Sunday</td><td>Closed</td></tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Find Us</h3>
                <a
                  href="https://maps.google.com/?q=Plot+No.+63+Alankar+Housing+Society+Garkheda+Chhatrapati+Sambhajinagar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-3 text-sm font-semibold text-accent hover:text-accent-light"
                >
                  Open in Google Maps
                </a>
                <div className="rounded-lg overflow-hidden shadow border border-border">
                  <iframe
                    title="Spandan Super Speciality Clinic location"
                    src="https://www.google.com/maps?q=Plot%20No.%2063%2C%20Alankar%20Housing%20Society%2C%20Garkheda%2C%20Chhatrapati%20Sambhajinagar%20431009&output=embed"
                    className="h-[320px] w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-6 text-center">Send us a message</h3>
              <EnquiryForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
