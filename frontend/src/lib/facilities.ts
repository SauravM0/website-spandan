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
    name: 'InBody 270 body composition analyser',
    publicDescription: 'Body composition assessment on the InBody 270 analyser, used as supporting information for metabolic and weight-related review.',
    purpose: 'May support discussion of body composition, metabolic risk, and follow-up planning.',
    process: 'Clinic staff guide the test when advised. Results should be interpreted with clinical context.',
    preparation: 'Ask the clinic whether food, exercise, hydration, or device-related precautions apply before your appointment.',
    visitRequirement: 'Call first so the clinic can confirm suitability and availability.',
    media: {
      src: '/Services/inbody.png',
      alt: 'InBody 270 body composition analyser used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-07-07',
    order: 10,
  },
  {
    id: 'cgms',
    category: 'Diabetes and endocrine diagnostics',
    name: 'Continuous glucose monitoring system',
    publicDescription: 'Sensor-based glucose-pattern monitoring used for selected diabetes reviews, using systems such as Abbott FreeStyle Libre, Vixxa, and iCAN (Sinocare) sensors.',
    purpose: 'May help understand glucose trends across meals, sleep, medication, and daily activity.',
    process: 'A sensor is applied or arranged as per clinic protocol, followed by report review with the doctor.',
    preparation: 'Carry current diabetes medicines, insulin details if applicable, and recent reports.',
    visitRequirement: 'Call the clinic first, or come with a doctor referral. Sensor availability varies by system.',
    media: {
      src: '/Services/cgms.png',
      alt: 'Continuous glucose monitoring sensor used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
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
    media: {
      src: '/Services/abpm.png',
      alt: 'Ambulatory blood pressure monitor used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
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
    media: {
      src: '/Services/holter-monitor.png',
      alt: 'Holter rhythm monitor used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
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
    media: {
      src: '/Services/sleep-study.png',
      alt: 'Sleep study diagnostic equipment used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-07-07',
    order: 14,
  },
  {
    id: 'insulin-pump',
    category: 'Sleep and therapy support',
    name: 'Insulin pump therapy support (Medtronic MiniMed 780G)',
    publicDescription: 'Therapy support information for selected patients using or considering advanced insulin delivery, including the Medtronic MiniMed 780G pump.',
    purpose: 'May support selected diabetes management discussions under specialist supervision.',
    process: 'Doctor assessment and counselling determine whether this path is relevant for a patient.',
    preparation: 'Carry current insulin schedule, glucose records, CGMS reports if available, and previous prescriptions.',
    visitRequirement: 'Requires specialist consultation before planning.',
    // TODO(clinic): replace with the clinic's own MiniMed 780G pump photograph
    // once it is supplied; this is the insulin-delivery image already on file.
    media: {
      src: '/Services/insulin-pen.png',
      alt: 'Insulin delivery device used in diabetes therapy support at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-07-07',
    order: 15,
  },
  {
    id: 'echocardiography',
    category: 'Cardiac diagnostics',
    name: '2D echocardiography (two machines)',
    publicDescription: 'Ultrasound imaging of the heart on two in-clinic echocardiography machines, used to look at chamber size, valve function, and pumping function.',
    purpose: 'Supports assessment of breathlessness, murmurs, valve disease, and heart function follow-up.',
    process: 'The cardiologist performs the scan in clinic and explains the findings during the consultation.',
    preparation: 'No fasting is needed. Wear clothing that allows easy chest access and bring previous echo reports.',
    visitRequirement: 'Call first so a cardiology consulting slot and machine availability can be confirmed.',
    // TODO(clinic): add the exact make and model of both echo machines once supplied.
    media: {
      src: '/Services/2d-echo.png',
      alt: '2D echocardiography machine used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-10-20',
    order: 16,
  },
  {
    id: 'ecg',
    category: 'Cardiac diagnostics',
    name: 'ECG (electrocardiogram)',
    publicDescription: 'A resting electrocardiogram recorded in clinic to look at heart rhythm and electrical conduction.',
    purpose: 'Supports assessment of chest pain, palpitations, rhythm concerns, and routine cardiac review.',
    process: 'Electrodes are placed on the chest and limbs and the recording takes only a few minutes.',
    preparation: 'No preparation is needed. Carry previous ECG tracings if you have them.',
    visitRequirement: 'Call first to confirm current timing for walk-in investigations.',
    // TODO(clinic): add the exact make and model of the ECG machine once supplied.
    media: {
      src: '/Services/ecg-machine.png',
      alt: 'ECG machine used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-10-20',
    order: 17,
  },
  {
    id: 'tmt',
    category: 'Cardiac diagnostics',
    name: 'TMT (treadmill stress test)',
    publicDescription: 'A treadmill-based exercise test that records the ECG and blood pressure response while the heart is under controlled physical stress.',
    purpose: 'May support evaluation of exertional chest pain, exercise capacity, and cardiac risk assessment.',
    process: 'Walking speed and incline increase in stages under supervision while the ECG is recorded throughout.',
    preparation: 'Ask the clinic about fasting, medicines to hold, footwear, and clothing before the appointment.',
    visitRequirement: 'Requires a cardiologist consultation and a booked slot. Call the clinic first.',
    // TODO(clinic): add the exact make and model of the TMT machine once supplied.
    media: {
      src: '/Services/tmt-machine.png',
      alt: 'Treadmill stress test machine used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-10-20',
    order: 18,
  },
  {
    id: 'fundus-screening',
    category: 'Diabetes and endocrine diagnostics',
    name: '3Nethra fundus camera',
    publicDescription: 'A non-mydriatic fundus camera used for diabetic retinopathy screening during diabetes review.',
    purpose: 'Supports screening of the retina for diabetes-related changes so timely referral can be arranged when needed.',
    process: 'Retinal images are captured in clinic and reviewed as part of the diabetes consultation.',
    preparation: 'Ask the clinic whether eye drops will be used and whether you should arrange transport home.',
    visitRequirement: 'Call first so screening can be planned alongside a diabetes consultation.',
    media: {
      src: '/Services/retina-photo-machine.png',
      alt: '3Nethra fundus camera used for diabetic retinopathy screening at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-10-20',
    order: 19,
  },
  {
    id: 'fibroscan',
    category: 'Diabetes and endocrine diagnostics',
    name: 'FibroScan (Echosens)',
    publicDescription: 'A non-invasive scan that measures liver stiffness and fat, used in selected metabolic and fatty-liver assessments.',
    purpose: 'May support assessment of fatty liver and liver stiffness in patients with diabetes, obesity, or metabolic concerns.',
    process: 'A probe is placed on the skin over the liver and readings are taken in a few minutes without needles.',
    preparation: 'Fasting is usually required. Confirm the exact fasting duration with the clinic before visiting.',
    visitRequirement: 'Call first to confirm suitability, fasting instructions, and machine availability.',
    media: {
      src: '/Services/liver-fibroscan.png',
      alt: 'FibroScan liver assessment machine used at Spandan Clinic',
      width: 1254,
      height: 1254,
    },
    published: true,
    verifiedAt: '2026-10-20',
    order: 20,
  },
];

export function publishedFacilities() {
  return facilities
    .filter((facility) => facility.published)
    .sort((a, b) => a.order - b.order);
}
