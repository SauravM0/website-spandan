-- Migration 048: Replace placeholder doctor bios with CV-verified profile text.
--
-- The 002 seed stored internal editorial notes ("[NEEDS CONFIRMATION: ...]",
-- "Not confirmed — leave blank or ask doctor") directly in doctors.bio. Those
-- notes are visible in the admin portal and would leak to patients the moment
-- bio is added to a public payload. Both doctors have since supplied signed
-- curricula vitae, so every fact below is sourced and safe to publish.
--
-- Source: Dr Tukaram Aute CV (Aug 2023); Dr Pratibha Pawal-Aute CV (Feb 2026).

UPDATE doctors
SET
  qualifications = 'MBBS, MD (Medicine), DM (Cardiology)',
  bio = concat_ws(
    E'\n\n',
    'Consultant Interventional Cardiologist. Maharashtra Medical Council registration 2006/01/0160.',
    'Education: DM (Cardiology), Grant Medical College & Sir J.J. Hospital, Mumbai (2014); MD (Medicine), Indira Gandhi Government Medical College, Nagpur (2010); MBBS, Government Medical College, Aurangabad (2004). All MUHS Nashik.',
    'Current roles: Spandan Super Speciality Clinic since 2015; Consultant Interventional Cardiologist, MGM Medical College since July 2015; MIT Hospital since 2019.',
    'Past roles: Assistant Professor, Department of Cardiology, Sir J.J. Hospital, Mumbai (2014); three-year DM residency in adult and paediatric cardiology, Grant Government Medical College & Sir J.J. Hospital, Mumbai.',
    'Membership: Life Member, Cardiological Society of India.',
    'Procedural expertise: coronary angiography and angioplasty; radial angiography and angioplasty; primary angioplasty; complex angioplasty (bifurcation, CTO); renal angiography and angioplasty; permanent pacemaker implantation; device closure (ASD, PDA, VSD); balloon valvuloplasty (mitral, pulmonary, aortic); coarctation of the aorta.'
  ),
  updated_at = NOW()
WHERE slug = 'dr-tukaram-aute';

UPDATE doctors
SET
  qualifications = 'MBBS, MD (Paediatrics), DM (Endocrinology)',
  bio = concat_ws(
    E'\n\n',
    'Consultant Endocrinologist. Maharashtra Medical Council registration 2006/04/1983.',
    'Education: DM (Endocrinology), T.N. Medical College & B.Y.L. Nair Charitable Hospital, Mumbai (2013); MD (Paediatrics), Seth G.S. Medical College & KEM Hospital, Mumbai (2009); MBBS, Grant Medical College & J.J. Group of Hospitals, Mumbai (2006). All MUHS Nashik.',
    'Current roles: Spandan Super Speciality Clinic since 2015; Consultant Endocrinologist, MGM Medical College; Joint Treasurer, Maharashtra Endocrine Society since 2024.',
    'Past roles: Assistant Professor and Super Speciality Medical Officer in Endocrinology, B.Y.L. Nair Charitable Hospital & T.N. Medical College, Mumbai; Lecturer in Paediatrics, Bandra Bhabha Hospital, Mumbai.',
    'Memberships: ISPAE; Endocrine Society of India (ESI 995); RSSDI (9588); Indian Society of Bone and Mineral Research (287/11); Indian Thyroid Society (LM-3055).',
    'Awards: 12th A.V. Gandhi Award for Excellence in Endocrinology, Hyderabad (2014); Certificate of Merit, District Collector, Women and Child Welfare, Beed (2017).',
    'Clinical focus: diabetes mellitus including gestational diabetes; thyroid disorders; bone and mineral disorders; obesity and metabolic health; paediatric and adolescent endocrinology; growth and puberty disorders; PCOS; disorders of sex development; pituitary, adrenal, and parathyroid disorders.',
    'Author of "Myths About Diabetes" (Marathi).'
  ),
  updated_at = NOW()
WHERE slug = 'dr-pratibha-aute';
