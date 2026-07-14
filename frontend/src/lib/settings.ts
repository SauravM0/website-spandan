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
  email: 'info@spandanclinic.com',
  whatsapp: '917798095795',
  timings: 'Monday to Saturday, 7:00 AM to 8:00 PM',
  mapQuery: 'Spandan%20Super%20Speciality%20Clinic%20Garkheda%20Chhatrapati%20Sambhajinagar',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Spandan%20Super%20Speciality%20Clinic%20Garkheda%20Chhatrapati%20Sambhajinagar',
  emergencyNote: 'For emergencies, call local emergency services first.',
  emergencyNumber: '108',
  supportedLanguages,
  consultationFee: 700,
  social: {
    whatsapp: 'https://wa.me/917798095795',
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
    linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL || '',
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
  },
};

export type ClinicSettings = typeof clinicSettings;

export const clinicLinks = {
  phone: `tel:${clinicSettings.phone}`,
  email: `mailto:${clinicSettings.email}`,
  whatsapp: clinicSettings.social.whatsapp,
  directions: clinicSettings.googleMapsUrl,
} as const;
