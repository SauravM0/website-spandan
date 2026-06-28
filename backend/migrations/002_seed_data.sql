-- Migration 002: Seed data for doctors and default admin staff user
-- Data based on clinic content report

INSERT INTO doctors (name, slug, speciality, qualifications, bio) VALUES
  ('Dr. Tukaram Sonaji Aute', 'dr-tukaram-aute', 'Cardiology',
   'MBBS, MD, DM (Cardiology)',
   'Education: J.J. Hospital, Mumbai (per clinic poster).\n\nRegistration: Maharashtra Medical Council Reg. No. 2006010160 (19 Jan 2006) — verified, safe to publish.\n\nTeaching Role: Assistant Professor, Dept. of Cardiology, MGM Medical College (verified).\n\nNotable Achievement: Subspecialty in interventional cardiology and congenital heart device closure. [NEEDS CONFIRMATION: single-source — confirm before publishing.]\n\nMedia / Recognition: None found.'),
  ('Dr. Pratibha Pawal-Aute', 'dr-pratibha-aute', 'Endocrinology',
   'MBBS, MD, DM (Endocrinology)',
   'Education: GS Medical College & KEM Hospital, Mumbai. [NEEDS CONFIRMATION: confirm exact wording with doctor.]\n\nTeaching Role: MGM Medical College. [NEEDS CONFIRMATION: confirm with doctor before publishing — see Doc 8 §2.4.]\n\nYears of Experience: Not confirmed — leave blank or ask doctor.\n\nNotable Achievement: Published case study, Journal of ASEAN Federation of Endocrine Societies, 2024 (Doc 8 §2.2). [NEEDS CONFIRMATION: patient-friendly wording needs doctor sign-off before publishing.]\n\nMedia / Recognition: ESICON 2024 speaker; Zee 24 Taas diabetes segment (Doc 8 §2.3).\n\nOther Affiliations: Do NOT mention without doctor''s explicit OK (Doc 8 §2.4).')
ON CONFLICT (slug) DO NOTHING;

-- Seed packages (clinic poster verified data)
INSERT INTO packages (slug, name, short_description, description, base_price, discounted_price, show_price_publicly, prep_instructions, category, primary_doctor_id, display_order) VALUES
  ('advance-cardiac-package', 'Advance Cardiac Package',
   'Comprehensive cardiac evaluation with advanced diagnostics',
   'Complete heart health assessment including 2D Echo, TMT, Holter monitoring, and advanced lipid profile.',
   4999, 3499, false,
   'Fasting for 8-10 hours required. Avoid caffeine and smoking on test day. Wear comfortable clothing.',
   'cardiac', (SELECT id FROM doctors WHERE slug = 'dr-tukaram-aute'), 1),
  ('basic-cardiac-package', 'Basic Cardiac Package',
   'Essential cardiac screening for early detection',
   'ECG, ECHO, and lipid profile for baseline cardiac assessment.',
   2999, 1999, false,
   'Fasting for 8-10 hours required.',
   'cardiac', (SELECT id FROM doctors WHERE slug = 'dr-tukaram-aute'), 2),
  ('diabetes-management-package', 'Diabetes Management Package',
   'Complete diabetes evaluation and monitoring',
   'HbA1c, fasting glucose, post-prandial glucose, insulin levels, and comprehensive metabolic panel.',
   2499, 1799, false,
   'Fasting for 10-12 hours required. Continue regular medications unless advised otherwise.',
   'diabetes', (SELECT id FROM doctors WHERE slug = 'dr-pratibha-aute'), 3),
  ('thyroid-profile', 'Thyroid Profile',
   'Comprehensive thyroid function testing',
   'T3, T4, TSH, Anti-TPO antibodies for complete thyroid assessment.',
   999, 699, false,
   'No special preparation required. Inform about any thyroid medications.',
   'hormones', (SELECT id FROM doctors WHERE slug = 'dr-pratibha-aute'), 4),
  ('full-body-checkup', 'Full Body Checkup',
   'Comprehensive health assessment with 60+ parameters',
   'CBC, Lipid Profile, LFT, KFT, Thyroid, Blood Sugar, Vitamin profile, and more.',
   2999, 1999, false,
   'Fasting for 10-12 hours required. Only water is allowed.',
   'general', (SELECT id FROM doctors WHERE slug = 'dr-tukaram-aute'), 5)
ON CONFLICT (slug) DO NOTHING;

-- Seed package tests
INSERT INTO package_tests (package_id, test_name, sort_order)
SELECT p.id, t.test_name, t.sort_order
FROM packages p
CROSS JOIN LATERAL (
  VALUES
    ('advance-cardiac-package', 'ECG', 1),
    ('advance-cardiac-package', '2D Echocardiography with Doppler', 2),
    ('advance-cardiac-package', 'Treadmill Test (TMT)', 3),
    ('advance-cardiac-package', 'Lipid Profile', 4),
    ('advance-cardiac-package', 'Cardiac Enzymes (CK-MB, Troponin)', 5),
    ('advance-cardiac-package', 'CRP (C-Reactive Protein)', 6),
    ('advance-cardiac-package', 'Homocysteine', 7),
    ('advance-cardiac-package', 'HbA1c', 8),
    ('basic-cardiac-package', 'ECG', 1),
    ('basic-cardiac-package', '2D Echocardiography', 2),
    ('basic-cardiac-package', 'Lipid Profile', 3),
    ('basic-cardiac-package', 'Chest X-Ray', 4),
    ('diabetes-management-package', 'Fasting Blood Sugar', 1),
    ('diabetes-management-package', 'HbA1c', 2),
    ('diabetes-management-package', 'Post Prandial Blood Sugar', 3),
    ('diabetes-management-package', 'Insulin Level (Fasting)', 4),
    ('diabetes-management-package', 'Urine Routine & Microscopy', 5),
    ('diabetes-management-package', 'Lipid Profile', 6),
    ('diabetes-management-package', 'Kidney Function Test', 7),
    ('thyroid-profile', 'T3 (Triiodothyronine)', 1),
    ('thyroid-profile', 'T4 (Thyroxine)', 2),
    ('thyroid-profile', 'TSH (Thyroid Stimulating Hormone)', 3),
    ('thyroid-profile', 'Anti-TPO Antibodies', 4),
    ('full-body-checkup', 'Complete Blood Count (CBC)', 1),
    ('full-body-checkup', 'Lipid Profile', 2),
    ('full-body-checkup', 'Liver Function Test (LFT)', 3),
    ('full-body-checkup', 'Kidney Function Test (KFT)', 4),
    ('full-body-checkup', 'Thyroid Profile (T3, T4, TSH)', 5),
    ('full-body-checkup', 'Fasting & Post Prandial Blood Sugar', 6),
    ('full-body-checkup', 'Urine Routine & Microscopy', 7),
    ('full-body-checkup', 'Vitamin D & B12', 8),
    ('full-body-checkup', 'Iron Studies', 9),
    ('full-body-checkup', 'Calcium & Phosphorus', 10)
) AS t(slug, test_name, sort_order)
WHERE p.slug = t.slug;
