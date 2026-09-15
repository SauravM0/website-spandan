/**
 * Curated professional profile data for the clinic's published doctors.
 *
 * Source of truth: the doctors' own curricula vitae supplied by the clinic
 * (Dr Tukaram Aute, Aug 2023; Dr Pratibha Pawal-Aute, Feb 2026). Every field
 * below is a verbatim professional fact from those documents — qualifications,
 * appointments, memberships, procedures, awards, teaching. No outcome claims,
 * success rates, patient counts, or testimonials belong in this file.
 *
 * The backend `doctors` table only stores name/slug/speciality/qualifications,
 * so this module supplies the richer profile the public pages render. It is
 * keyed by the same slug the API returns and merged over the API payload, which
 * keeps profiles complete even when the backend is unreachable.
 */

export type EducationEntry = {
  year: string;
  degree: string;
  institution: string;
  university?: string;
};

export type AppointmentEntry = {
  role: string;
  organisation: string;
  period: string;
  current: boolean;
};

export type AwardEntry = {
  year: string;
  title: string;
  awardedBy: string;
};

export type CourseEntry = {
  year: string;
  title: string;
  organisation?: string;
};

export type TalkEntry = {
  year: string;
  topic: string;
  forum: string;
};

export type DoctorProfile = {
  slug: string;
  name: string;
  /** Formal title as written on the CV letterhead. */
  role: string;
  speciality: string;
  qualifications: string;
  qualificationList: string[];
  /** Maharashtra Medical Council registration number. */
  registration: string;
  registrationCouncil: string;
  /** Local portrait under /public, so it can go through the image optimiser. */
  photo: string;
  /** One patient-facing paragraph, derived only from CV facts. */
  summary: string;
  /** Year the primary super-speciality qualification was completed. */
  practisingSince: number;
  education: EducationEntry[];
  appointments: AppointmentEntry[];
  pastAppointments: AppointmentEntry[];
  memberships: string[];
  /** Procedures or clinical areas stated on the CV. */
  clinicalFocus: string[];
  awards: AwardEntry[];
  courses: CourseEntry[];
  selectedTalks: TalkEntry[];
  books: string[];
  languages: string[];
};

export const doctorProfiles: Record<string, DoctorProfile> = {
  'dr-tukaram-aute': {
    slug: 'dr-tukaram-aute',
    name: 'Dr. Tukaram Sonaji Aute',
    role: 'Consultant Interventional Cardiologist',
    speciality: 'Cardiology',
    qualifications: 'MBBS, MD (Medicine), DM (Cardiology)',
    qualificationList: ['MBBS', 'MD (Medicine)', 'DM (Cardiology)'],
    registration: '2006/01/0160',
    registrationCouncil: 'Maharashtra Medical Council',
    photo: '/doctors/dr-tukaram-sonaji-aute.png',
    summary:
      'Dr. Tukaram Aute is a Consultant Interventional Cardiologist who completed his DM in Cardiology at Grant Medical College and Sir J.J. Hospital, Mumbai, where he trained in both adult and paediatric cardiology and later served as Assistant Professor. He has consulted at Spandan Super Speciality Clinic since 2015 and teaches DM Cardiology students at MGM Medical College, Chhatrapati Sambhajinagar.',
    practisingSince: 2014,
    education: [
      {
        year: '2014',
        degree: 'DM (Cardiology)',
        institution: 'Grant Medical College & Sir J.J. Hospital, Mumbai',
        university: 'MUHS Nashik',
      },
      {
        year: '2010',
        degree: 'MD (Medicine)',
        institution: 'Indira Gandhi Government Medical College, Nagpur',
        university: 'MUHS Nashik',
      },
      {
        year: '2004',
        degree: 'MBBS',
        institution: 'Government Medical College, Aurangabad',
        university: 'MUHS Nashik',
      },
    ],
    appointments: [
      {
        role: 'Consultant Interventional Cardiologist',
        organisation: 'Spandan Super Speciality Clinic, Chhatrapati Sambhajinagar',
        period: 'Since 2015',
        current: true,
      },
      {
        role: 'Consultant Interventional Cardiologist',
        organisation: 'MGM Medical College, Chhatrapati Sambhajinagar',
        period: 'Since July 2015',
        current: true,
      },
      {
        role: 'Consultant Interventional Cardiologist',
        organisation: 'MIT Hospital, Chhatrapati Sambhajinagar',
        period: 'Since 2019',
        current: true,
      },
    ],
    pastAppointments: [
      {
        role: 'Assistant Professor, Department of Cardiology',
        organisation: 'Sir J.J. Hospital, Mumbai',
        period: '2014 — 1 year',
        current: false,
      },
      {
        role: 'DM Registrar, Department of Cardiology (adult and paediatric)',
        organisation: 'Grant Government Medical College & Sir J.J. Hospital, Mumbai',
        period: '3-year residency',
        current: false,
      },
    ],
    memberships: ['Life Member, Cardiological Society of India'],
    clinicalFocus: [
      'Coronary angiography and angioplasty',
      'Radial angiography and angioplasty',
      'Primary angioplasty',
      'Complex angioplasty (bifurcation and CTO)',
      'Renal angiography and angioplasty',
      'Permanent pacemaker implantation',
      'Device closure (ASD, PDA, VSD)',
      'Balloon valvuloplasty (mitral, pulmonary, aortic)',
      'Coarctation of the aorta',
    ],
    awards: [],
    courses: [
      {
        year: 'Ongoing',
        title:
          'National and international conferences with hands-on training in complex cardiac interventions',
      },
    ],
    selectedTalks: [
      {
        year: '2018',
        topic: 'Preventive cardiology',
        forum: 'IMA Gangapur',
      },
      {
        year: '2018',
        topic: 'Approach to dyslipidaemia',
        forum: 'IMA Chhatrapati Sambhajinagar',
      },
      {
        year: '2017',
        topic: 'Management of rheumatic heart disease',
        forum: 'IMA Georai, Beed',
      },
      {
        year: '2017',
        topic: 'Diagnosis and management of young hypertension',
        forum: 'IMA Mehkar',
      },
      {
        year: '2016',
        topic: 'Diagnosis and management of unstable angina',
        forum: 'IMA Sillod',
      },
      {
        year: '2016',
        topic: 'Approach to ischaemic heart disease',
        forum: 'IMA Kannad',
      },
      {
        year: '2015',
        topic: 'Management of acute coronary syndrome',
        forum: 'Chalisgaon IMA & MGM Medical College Conclave',
      },
      {
        year: 'Ongoing',
        topic: 'Teaching for DM Cardiology and BPMT students',
        forum: 'MGM Medical College',
      },
    ],
    books: [],
    languages: ['English', 'Hindi', 'Marathi'],
  },

  'dr-pratibha-aute': {
    slug: 'dr-pratibha-aute',
    name: 'Dr. Pratibha Pawal-Aute',
    role: 'Consultant Endocrinologist',
    speciality: 'Endocrinology',
    qualifications: 'MBBS, MD (Paediatrics), DM (Endocrinology)',
    qualificationList: ['MBBS', 'MD (Paediatrics)', 'DM (Endocrinology)'],
    registration: '2006/04/1983',
    registrationCouncil: 'Maharashtra Medical Council',
    photo: '/doctors/dr-pratibha-pawal-aute.png',
    summary:
      'Dr. Pratibha Pawal-Aute is a Consultant Endocrinologist with dual training in paediatrics and endocrinology, completing her MD (Paediatrics) at Seth G.S. Medical College and KEM Hospital and her DM (Endocrinology) at T.N. Medical College and B.Y.L. Nair Hospital, Mumbai. She has consulted at Spandan Super Speciality Clinic since 2015, teaches at MGM Medical College, serves as Joint Treasurer of the Maharashtra Endocrine Society, and has published widely on bone and mineral disease, thyroid disorders, and paediatric endocrinology.',
    practisingSince: 2013,
    education: [
      {
        year: '2013',
        degree: 'DM (Endocrinology)',
        institution: 'T.N. Medical College & B.Y.L. Nair Charitable Hospital, Mumbai',
        university: 'MUHS Nashik',
      },
      {
        year: '2009',
        degree: 'MD (Paediatrics)',
        institution: 'Seth G.S. Medical College & KEM Hospital, Mumbai',
        university: 'MUHS Nashik',
      },
      {
        year: '2006',
        degree: 'MBBS',
        institution: 'Grant Medical College & J.J. Group of Hospitals, Mumbai',
        university: 'MUHS Nashik',
      },
    ],
    appointments: [
      {
        role: 'Consultant Endocrinologist',
        organisation: 'Spandan Super Speciality Clinic, Chhatrapati Sambhajinagar',
        period: 'Since 2015',
        current: true,
      },
      {
        role: 'Consultant Endocrinologist',
        organisation: 'MGM Medical College, Chhatrapati Sambhajinagar',
        period: 'Current',
        current: true,
      },
      {
        role: 'Joint Treasurer',
        organisation: 'Maharashtra Endocrine Society',
        period: 'Since 2024',
        current: true,
      },
    ],
    pastAppointments: [
      {
        role: 'Assistant Professor, Endocrinology',
        organisation: 'B.Y.L. Nair Charitable Hospital & T.N. Medical College, Mumbai',
        period: '1 year',
        current: false,
      },
      {
        role: 'Super Speciality Medical Officer, Endocrinology',
        organisation: 'B.Y.L. Nair Charitable Hospital & T.N. Medical College, Mumbai',
        period: '1 year',
        current: false,
      },
      {
        role: 'Lecturer in Paediatrics',
        organisation: 'Bandra Bhabha Hospital, Mumbai',
        period: '6 months',
        current: false,
      },
    ],
    memberships: [
      'Life Member, Indian Society for Pediatric and Adolescent Endocrinology (ISPAE)',
      'Life Member, Endocrine Society of India (ESI 995)',
      'Life Member, Research Society for the Study of Diabetes in India (RSSDI 9588)',
      'Life Member, Indian Society of Bone and Mineral Research (ISBMR 287/11)',
      'Life Member, Indian Thyroid Society (LM-3055)',
    ],
    clinicalFocus: [
      'Diabetes mellitus — type 1, type 2, and gestational',
      'Thyroid disorders and thyroid function interpretation',
      'Bone and mineral disorders, including rickets and osteoporosis',
      'Obesity and metabolic health',
      'Paediatric and adolescent endocrinology',
      'Growth, puberty, and short stature evaluation',
      'Polycystic ovary syndrome and reproductive endocrinology',
      'Disorders of sex development',
      'Pituitary, adrenal, and parathyroid disorders',
    ],
    awards: [
      {
        year: '2014',
        title:
          'Best Conclusion from the Paper — research on vitamin D supplementation protocols, 12th A.V. Gandhi Award for Excellence in Endocrinology, Hyderabad',
        awardedBy: 'A.V. Gandhi Award Committee',
      },
      {
        year: '2017',
        title: 'Certificate of Merit, presented on World Women’s Day',
        awardedBy: 'District Collector, Women and Child Welfare, Beed',
      },
    ],
    courses: [
      {
        year: '2018',
        title: 'AIAARO National Obesity Conference — Chairperson and Scientific Committee member',
        organisation: 'Chhatrapati Sambhajinagar',
      },
      {
        year: '2018',
        title: 'Specialist Certification of Obesity Professional Education (SCOPE)',
        organisation: 'World Obesity Federation',
      },
      {
        year: '2016',
        title: 'DFSICON 2016 — Scientific Committee member',
        organisation: 'Chhatrapati Sambhajinagar',
      },
      {
        year: '2014',
        title: 'Paediatric endocrine training, APPES & APEG Joint Fellows School',
        organisation: 'Darwin, Australia',
      },
      {
        year: '2014',
        title: 'DXA workshop, ISBMR 2014',
        organisation: 'B.Y.L. Nair Hospital, Mumbai',
      },
      {
        year: '2013',
        title: 'Growth Hormone Symposium “Basics to Therapeutics” — organiser',
        organisation: 'B.Y.L. Nair Ch. Hospital, Mumbai',
      },
      {
        year: '2012',
        title: 'RIA and DXA training',
        organisation: 'BARC, Mumbai',
      },
      {
        year: '2012',
        title: 'Post-graduate workshop in clinical endocrinology',
        organisation: 'Amrita Institute, Kochi',
      },
    ],
    selectedTalks: [
      {
        year: '2026',
        topic: 'Management of gestational diabetes: a practical clinical guide',
        forum: 'Maha Endocon 2026, Nashik',
      },
      {
        year: '2026',
        topic: 'In-hospital management of hyperglycaemia',
        forum: 'Maha Endocon 2026, Nashik',
      },
      {
        year: '2025',
        topic: 'Approach to disorders of sex development in neonates',
        forum: 'Dept. of Neonatology, GMC Chhatrapati Sambhajinagar',
      },
      {
        year: '2025',
        topic: 'Approach to congenital hypothyroidism',
        forum: 'Dept. of Neonatology, GMC Chhatrapati Sambhajinagar',
      },
      {
        year: '2024',
        topic: 'Management of paediatric Graves’ disease',
        forum: 'ESICON 2024, Visakhapatnam',
      },
      {
        year: '2024',
        topic: 'Role of lifestyle modification in the management of diabetes mellitus',
        forum: 'CME on Lifestyle and Health, Jalna',
      },
      {
        year: '2024',
        topic: 'Screening for co-morbid conditions in women with diabetes',
        forum: 'WE CARE Conference, Bengaluru',
      },
      {
        year: '2023',
        topic: 'Interpretation of thyroid function tests',
        forum: 'GMC Chhatrapati Sambhajinagar',
      },
      {
        year: '2022',
        topic: 'When TSH does not come down despite optimal thyroxine dosage',
        forum: 'Maha Endocrine Society virtual thyroid update',
      },
      {
        year: '2022',
        topic: 'Psychological challenges in women with diabetes',
        forum: 'WE CARE national conference',
      },
      {
        year: '2019',
        topic: 'Case-based discussion in endocrinology',
        forum: 'MULTICON 2019, IMA Buldana',
      },
      {
        year: '2018',
        topic: 'Subclinical hypothyroidism and co-morbidities',
        forum: 'IMA Chhatrapati Sambhajinagar',
      },
      {
        year: '2018',
        topic: 'Pre-operative diabetes management',
        forum: 'IHOP–IMA Chhatrapati Sambhajinagar',
      },
      {
        year: '2017',
        topic: 'Diabetic ketoacidosis',
        forum: 'Chhatrapati Sambhajinagar Academy of Pediatrics',
      },
      {
        year: '2015',
        topic: 'Management of polycystic ovary disease',
        forum: 'Latur Obstetrics & Gynaecological Society',
      },
      {
        year: '2014',
        topic: 'Approach to short stature',
        forum: 'Marathwada Region Pediatric Conference',
      },
    ],
    books: ['Myths About Diabetes (Marathi)'],
    languages: ['English', 'Hindi', 'Marathi'],
  },
};

export function getDoctorProfile(slug: string): DoctorProfile | undefined {
  return doctorProfiles[slug];
}

export const doctorProfileList = Object.values(doctorProfiles);

/**
 * Minimal public summaries built from the curated profiles, used when the
 * doctors API is unreachable so the site never renders without its specialists.
 */
export function fallbackDoctorSummaries() {
  return doctorProfileList.map((profile) => ({
    slug: profile.slug,
    name: profile.name,
    speciality: profile.speciality,
    qualifications: profile.qualifications,
    photo_url: profile.photo,
    languages: profile.languages,
    published: true,
  }));
}

/** Teaching hospitals where the doctors earned their MD and DM degrees. */
export function trainingInstitutions(): string[] {
  const postgraduate = doctorProfileList.flatMap((profile) =>
    profile.education.filter((entry) => entry.degree !== 'MBBS').map((entry) => entry.institution)
  );
  return Array.from(new Set(postgraduate));
}

export function membershipCount(): number {
  return new Set(doctorProfileList.flatMap((profile) => profile.memberships)).size;
}

export function earliestYearAtClinic(): number {
  const years = doctorProfileList.flatMap((profile) =>
    profile.appointments
      .filter((entry) => entry.organisation.startsWith('Spandan'))
      .map((entry) => Number(entry.period.match(/\d{4}/)?.[0]))
      .filter((year) => Number.isFinite(year))
  );
  return Math.min(...years);
}
