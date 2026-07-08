export type FacilityCategory = 'Environment' | 'Cardiac diagnostics' | 'Diabetes and endocrine diagnostics' | 'Sleep and therapy support';

export type FacilityMedia = {
  src: string;
  alt: string;
  width: number;
  height: number;
} | null;

export type FacilityRecord = {
  id: string;
  category: FacilityCategory;
  name: string;
  publicDescription: string;
  purpose: string;
  process: string;
  preparation: string;
  bookingRequirement: string;
  media: FacilityMedia;
  published: boolean;
  verifiedAt: string;
  order: number;
};

export const facilityReview = {
  owner: 'Clinic administration',
  reviewedAt: '2026-07-07',
};

export const facilities: FacilityRecord[] = [
  {
    id: 'clinic-environment',
    category: 'Environment',
    name: 'Clinic visit environment',
    publicDescription: 'Public clinic location and visit information for patients planning an in-person visit.',
    purpose: 'Helps patients confirm address, timings, and visit expectations before arriving.',
    process: 'Use the contact, map, or booking links to plan the visit. Bring previous prescriptions and reports when relevant.',
    preparation: 'No medical preparation is needed for general visit planning.',
    bookingRequirement: 'Appointment booking is recommended for specialist consultation.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 1,
  },
  {
    id: 'inbody',
    category: 'Diabetes and endocrine diagnostics',
    name: 'InBody body composition analysis',
    publicDescription: 'Body composition assessment used as supporting information for metabolic and weight-related review.',
    purpose: 'May support discussion of body composition, metabolic risk, and follow-up planning.',
    process: 'Clinic staff guide the test when advised. Results should be interpreted with clinical context.',
    preparation: 'Ask the clinic whether food, exercise, hydration, or device-related precautions apply before your appointment.',
    bookingRequirement: 'Book or call first so the clinic can confirm suitability and availability.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 2,
  },
  {
    id: 'cgms',
    category: 'Diabetes and endocrine diagnostics',
    name: 'Continuous glucose monitoring system',
    publicDescription: 'Sensor-based glucose-pattern monitoring used for selected diabetes reviews.',
    purpose: 'May help understand glucose trends across meals, sleep, medication, and daily activity.',
    process: 'A sensor is applied or arranged as per clinic protocol, followed by report review with the doctor.',
    preparation: 'Carry current diabetes medicines, insulin details if applicable, and recent reports.',
    bookingRequirement: 'Requires prior booking or doctor advice.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 3,
  },
  {
    id: 'abpm',
    category: 'Cardiac diagnostics',
    name: 'Ambulatory blood pressure monitoring',
    publicDescription: 'Blood pressure monitoring across daily activity and sleep for selected patients.',
    purpose: 'May support evaluation when clinic, home, or symptom-related BP readings need comparison.',
    process: 'The device records blood pressure readings over a defined monitoring period and is returned for review.',
    preparation: 'Wear comfortable clothing and ask about bathing, exercise, and device handling instructions.',
    bookingRequirement: 'Requires prior booking so device availability can be confirmed.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 4,
  },
  {
    id: 'holter',
    category: 'Cardiac diagnostics',
    name: 'Holter monitoring',
    publicDescription: 'Portable ECG rhythm monitoring used for selected heart rhythm concerns.',
    purpose: 'May support evaluation of palpitations, dizziness, rhythm symptoms, or rhythm follow-up.',
    process: 'A portable recorder is fitted for the advised monitoring duration and reviewed after return.',
    preparation: 'Ask about skin preparation, bathing restrictions, and how to record symptoms during monitoring.',
    bookingRequirement: 'Requires prior booking or doctor advice.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 5,
  },
  {
    id: 'sleep-study',
    category: 'Sleep and therapy support',
    name: 'Sleep study diagnostics',
    publicDescription: 'Sleep-related diagnostic support for selected patients with suspected sleep concerns.',
    purpose: 'May support review of snoring, sleep quality, fatigue, or sleep breathing concerns.',
    process: 'The clinic explains the study type, setup, duration, and report review process before scheduling.',
    preparation: 'Confirm medication, caffeine, sleep routine, and device setup instructions with the clinic.',
    bookingRequirement: 'Requires prior booking and clinic instructions.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 6,
  },
  {
    id: 'insulin-pump',
    category: 'Sleep and therapy support',
    name: 'Insulin pump therapy support',
    publicDescription: 'Therapy support information for selected patients using or considering advanced insulin delivery.',
    purpose: 'May support selected diabetes management discussions under specialist supervision.',
    process: 'Doctor assessment and counselling determine whether this path is relevant for a patient.',
    preparation: 'Carry current insulin schedule, glucose records, CGMS reports if available, and previous prescriptions.',
    bookingRequirement: 'Requires specialist consultation before planning.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 7,
  },
];

export function publishedFacilities() {
  return facilities
    .filter((facility) => facility.published)
    .sort((a, b) => a.order - b.order);
}
