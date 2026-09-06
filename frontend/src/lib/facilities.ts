export type FacilityCategory =
  | 'Environment'
  | 'Laboratory diagnostics'
  | 'Cardiac diagnostics'
  | 'Diabetes and endocrine diagnostics'
  | 'Sleep and therapy support';

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
  visitRequirement: string;
  media: FacilityMedia;
  published: boolean;
  verifiedAt: string;
  order: number;
};

export const facilityReview = {
  owner: 'Clinic administration',
  reviewedAt: '2026-07-14',
};

export const facilities: FacilityRecord[] = [
  {
    id: 'clinic-environment',
    category: 'Environment',
    name: 'Clinic visit environment',
    publicDescription: 'Public clinic location and visit information for patients planning an in-person visit.',
    purpose: 'Helps patients confirm address, timings, and visit expectations before arriving.',
    process: 'Use the contact or map links to plan the visit. Bring previous prescriptions and reports when relevant.',
    preparation: 'No medical preparation is needed for general visit planning.',
    visitRequirement: 'Call the clinic first so a specialist consultation slot can be confirmed.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 1,
  },
  {
    id: 'abbott-afinion-2',
    category: 'Laboratory diagnostics',
    name: 'Abbott Afinion 2 Analyzer',
    publicDescription: 'A compact point-of-care analyzer used for selected diabetes and metabolic investigations configured by the clinic.',
    purpose: 'Supports selected near-patient investigations so results can be considered alongside consultation and clinical history.',
    process: 'Clinic staff collect the test-specific sample and process it using the appropriate cartridge when that investigation is available.',
    preparation: 'Preparation and sample requirements depend on the selected test. Confirm instructions with the clinic before visiting.',
    visitRequirement: 'Call first to confirm the requested test, cartridge availability, preparation, and sample timing.',
    media: {
      src: '/equipment/abbott-afinion-2.png',
      alt: 'Abbott Afinion 2 point-of-care analyzer used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-07-14',
    order: 2,
  },
  {
    id: 'bio-rad-d-10',
    category: 'Laboratory diagnostics',
    name: 'Bio-Rad D-10 Hemoglobin Testing System',
    publicDescription: 'A dedicated hemoglobin testing system used for selected HbA1c and hemoglobin investigations offered by the clinic.',
    purpose: 'Supports laboratory assessment of long-term glucose control and selected hemoglobin investigations when advised.',
    process: 'A trained team member collects and processes the required blood sample using the clinic\'s active assay program.',
    preparation: 'Sample and preparation requirements depend on the requested investigation. Carry previous reports when relevant.',
    visitRequirement: 'Confirm the exact investigation and sample timing with the clinic before arrival.',
    media: {
      src: '/equipment/bio-rad-d-10.png',
      alt: 'Bio-Rad D-10 hemoglobin testing system used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-07-14',
    order: 3,
  },
  {
    id: 'erba-em-200',
    category: 'Laboratory diagnostics',
    name: 'Erba Mannheim EM 200',
    publicDescription: 'An automated clinical chemistry analyzer used for selected biochemistry investigations available through the clinic.',
    purpose: 'Supports consistent processing of selected clinical chemistry and metabolic investigations.',
    process: 'The requested test is checked against the clinic\'s active laboratory menu before the appropriate sample is collected and processed.',
    preparation: 'Some investigations may require fasting or timing instructions. Confirm the exact requirement before visiting.',
    visitRequirement: 'Call first to confirm whether the requested investigation is processed in clinic and whether preparation is required.',
    media: {
      src: '/equipment/erba-mannheim-em-200.png',
      alt: 'Erba Mannheim EM 200 clinical chemistry analyzer used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-07-14',
    order: 4,
  },
  {
    id: 'horiba-abx-micros-es-60',
    category: 'Laboratory diagnostics',
    name: 'HORIBA Medical ABX Micros ES 60',
    publicDescription: 'An automated hematology analyzer used for selected complete blood count and blood-cell investigations.',
    purpose: 'Supports selected hematology investigations requested as part of clinical assessment and follow-up.',
    process: 'A trained team member collects a blood sample and processes it according to the requested investigation and laboratory protocol.',
    preparation: 'Preparation is test-specific. Confirm instructions and bring relevant prescriptions or previous reports.',
    visitRequirement: 'Confirm the requested test and current sample-collection timing before travelling.',
    media: {
      src: '/equipment/horiba-abx-micros-es-60.png',
      alt: 'HORIBA Medical ABX Micros ES 60 hematology analyzer used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-07-14',
    order: 5,
  },
  {
    id: 'roche-cobas-e-411',
    category: 'Laboratory diagnostics',
    name: 'Roche cobas e 411 with Hitachi',
    publicDescription: 'An automated immunoassay analyzer used for selected thyroid, hormone, and other immunoassay investigations.',
    purpose: 'Supports selected immunoassay investigations used in specialist assessment and follow-up.',
    process: 'The clinic confirms that the requested assay is active before collecting and processing the appropriate sample.',
    preparation: 'Preparation and timing vary by investigation and medicine use. Ask the clinic for test-specific instructions.',
    visitRequirement: 'Call first to confirm the exact assay, preparation, sample timing, and current availability.',
    media: {
      src: '/equipment/roche-cobas-e-411.png',
      alt: 'Roche cobas e 411 immunoassay analyzer used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-07-14',
    order: 6,
  },
  {
    id: 'inbody',
    category: 'Diabetes and endocrine diagnostics',
    name: 'InBody body composition analysis',
    publicDescription: 'Body composition assessment used as supporting information for metabolic and weight-related review.',
    purpose: 'May support discussion of body composition, metabolic risk, and follow-up planning.',
    process: 'Clinic staff guide the test when advised. Results should be interpreted with clinical context.',
    preparation: 'Ask the clinic whether food, exercise, hydration, or device-related precautions apply before your appointment.',
    visitRequirement: 'Call first so the clinic can confirm suitability and availability.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 10,
  },
  {
    id: 'cgms',
    category: 'Diabetes and endocrine diagnostics',
    name: 'Continuous glucose monitoring system',
    publicDescription: 'Sensor-based glucose-pattern monitoring used for selected diabetes reviews.',
    purpose: 'May help understand glucose trends across meals, sleep, medication, and daily activity.',
    process: 'A sensor is applied or arranged as per clinic protocol, followed by report review with the doctor.',
    preparation: 'Carry current diabetes medicines, insulin details if applicable, and recent reports.',
    visitRequirement: 'Call the clinic first, or come with a doctor referral.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 11,
  },
  {
    id: 'abpm',
    category: 'Cardiac diagnostics',
    name: 'Ambulatory blood pressure monitoring',
    publicDescription: 'Blood pressure monitoring across daily activity and sleep for selected patients.',
    purpose: 'May support evaluation when clinic, home, or symptom-related BP readings need comparison.',
    process: 'The device records blood pressure readings over a defined monitoring period and is returned for review.',
    preparation: 'Wear comfortable clothing and ask about bathing, exercise, and device handling instructions.',
    visitRequirement: 'Call the clinic first so device availability can be confirmed.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 12,
  },
  {
    id: 'holter',
    category: 'Cardiac diagnostics',
    name: 'Holter monitoring',
    publicDescription: 'Portable ECG rhythm monitoring used for selected heart rhythm concerns.',
    purpose: 'May support evaluation of palpitations, dizziness, rhythm symptoms, or rhythm follow-up.',
    process: 'A portable recorder is fitted for the advised monitoring duration and reviewed after return.',
    preparation: 'Ask about skin preparation, bathing restrictions, and how to record symptoms during monitoring.',
    visitRequirement: 'Call the clinic first, or come with a doctor referral.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 13,
  },
  {
    id: 'sleep-study',
    category: 'Sleep and therapy support',
    name: 'Sleep study diagnostics',
    publicDescription: 'Sleep-related diagnostic support for selected patients with suspected sleep concerns.',
    purpose: 'May support review of snoring, sleep quality, fatigue, or sleep breathing concerns.',
    process: 'The clinic explains the study type, setup, duration, and report review process before scheduling.',
    preparation: 'Confirm medication, caffeine, sleep routine, and device setup instructions with the clinic.',
    visitRequirement: 'Call the clinic first for scheduling and preparation instructions.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 14,
  },
  {
    id: 'insulin-pump',
    category: 'Sleep and therapy support',
    name: 'Insulin pump therapy support',
    publicDescription: 'Therapy support information for selected patients using or considering advanced insulin delivery.',
    purpose: 'May support selected diabetes management discussions under specialist supervision.',
    process: 'Doctor assessment and counselling determine whether this path is relevant for a patient.',
    preparation: 'Carry current insulin schedule, glucose records, CGMS reports if available, and previous prescriptions.',
    visitRequirement: 'Requires specialist consultation before planning.',
    media: null,
    published: true,
    verifiedAt: '2026-07-07',
    order: 15,
  },
];

export function publishedFacilities() {
  return facilities
    .filter((facility) => facility.published)
    .sort((a, b) => a.order - b.order);
}
