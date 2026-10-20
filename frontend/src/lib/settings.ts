export const PRIVACY_POLICY_VERSION = 'privacy-policy-v1-2026-07-08';
export const TERMS_POLICY_VERSION = 'terms-policy-v1-2026-07-08';

export const supportedLanguages = ['en', 'hi', 'mr'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const clinicSettings = {
  name: 'Spandan Super Speciality Clinic',
  tagline: 'Advanced diagnostics and expert medical care',
  address: 'Plot No. 63, Alankar Housing Society, Beside Essar Petrol Pump, Gajanan Maharaj Mandir Rd, Pundlik Nagar, Garkheda',
  city: 'Chhatrapati Sambhajinagar',
  state: 'Maharashtra',
  pincode: '431009',
  phone: '+917798095795',
  email: 'spandansuperclinic@gmail.com',
  whatsapp: '917798095795',
  timings: 'Monday to Saturday, 8:00 AM to 8:00 PM',
  closedDay: 'Sunday closed',
  /** Both consultants hold their own consulting window inside the clinic's opening hours. */
  consultingHours: 'Doctors consult 1:00 PM to 7:00 PM, Monday to Saturday',
  /** The clinic posts short-notice closures on its WhatsApp status rather than here. */
  holidayNote: 'For holidays and short-notice closures, check the clinic number’s WhatsApp status.',
  appointmentNote: 'Please take a prior appointment for a smooth consultation.',
  mapQuery: 'Spandan%20Super%20Speciality%20Clinic%20Garkheda%20Chhatrapati%20Sambhajinagar',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Spandan%20Super%20Speciality%20Clinic%20Garkheda%20Chhatrapati%20Sambhajinagar',
  emergencyNote: 'For emergencies, call local emergency services first.',
  emergencyNumber: '108',
  supportedLanguages,
  consultationFee: 700,
  social: {
    whatsapp: 'https://wa.me/917798095795',
    instagram:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
      'https://www.instagram.com/spandan_clinic_sambhaji_nagar',
    linkedin:
      process.env.NEXT_PUBLIC_LINKEDIN_URL ||
      'https://www.linkedin.com/in/dr-pratibha-pawal-aute',
    facebook:
      process.env.NEXT_PUBLIC_FACEBOOK_URL ||
      'https://www.facebook.com/people/Spandan-Superspeciality-Clinic',
    youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || 'https://www.youtube.com/@Pratibhapawal',
  },
};

export type ClinicSettings = typeof clinicSettings;

export const clinicLinks = {
  phone: `tel:${clinicSettings.phone}`,
  email: `mailto:${clinicSettings.email}`,
  whatsapp: clinicSettings.social.whatsapp,
  directions: clinicSettings.googleMapsUrl,
} as const;

/**
 * WhatsApp deep link for the clinic, optionally pre-filling the message so the
 * enquiry arrives with context (package name, service, doctor).
 */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${clinicSettings.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
