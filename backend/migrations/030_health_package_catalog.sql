-- Replace the placeholder package catalog with the clinic-approved package list.

UPDATE packages
SET slug = 'diabetic-package'
WHERE slug = 'diabetes-management-package'
  AND NOT EXISTS (SELECT 1 FROM packages WHERE slug = 'diabetic-package');

UPDATE packages
SET slug = 'cardiac-package'
WHERE slug = 'basic-cardiac-package'
  AND NOT EXISTS (SELECT 1 FROM packages WHERE slug = 'cardiac-package');

UPDATE packages
SET slug = 'advanced-cardiac-package'
WHERE slug = 'advance-cardiac-package'
  AND NOT EXISTS (SELECT 1 FROM packages WHERE slug = 'advanced-cardiac-package');

UPDATE packages
SET slug = 'full-body-check-up-package'
WHERE slug = 'full-body-checkup'
  AND NOT EXISTS (SELECT 1 FROM packages WHERE slug = 'full-body-check-up-package');

INSERT INTO packages (
  slug, name, short_description, description, base_price, discounted_price,
  show_price_publicly, prep_instructions, category, test_category,
  primary_doctor_id, display_order, is_active, is_featured,
  consultation_included, fasting_required, fasting_duration,
  age_sex_applicability, exclusions, report_turnaround, medical_disclaimer,
  discount_label, purchase_status, purchase_enabled, publication_status,
  effective_start, effective_end
)
VALUES
  (
    'diabetic-package', 'Diabetic Package', NULL, NULL, 4240, 3000,
    true, NULL, 'diabetes', 'diabetes',
    (SELECT id FROM doctors WHERE slug = 'dr-pratibha-aute'), 1, true, true,
    false, false, NULL, NULL, NULL, NULL, NULL,
    '29% OFF', 'available', true, 'published', NULL, NULL
  ),
  (
    'cardiac-package', 'Cardiac Package', NULL, NULL, 5300, 2500,
    true, NULL, 'cardiac', 'cardiac',
    (SELECT id FROM doctors WHERE slug = 'dr-tukaram-aute'), 2, true, true,
    false, false, NULL, NULL, NULL, NULL, NULL,
    '53% OFF', 'available', true, 'published', NULL, NULL
  ),
  (
    'advanced-cardiac-package', 'Advanced Cardiac Package', NULL, NULL, 5620, 3400,
    true, NULL, 'cardiac', 'cardiac',
    (SELECT id FROM doctors WHERE slug = 'dr-tukaram-aute'), 3, true, true,
    false, false, NULL, NULL, NULL, NULL, NULL,
    '40% OFF', 'available', true, 'published', NULL, NULL
  ),
  (
    'diabetic-and-cardiac-package', 'Diabetic and Cardiac Package', NULL, NULL, 6540, 5200,
    true, NULL, 'combined', 'combined',
    NULL, 4, true, false,
    false, false, NULL, NULL, NULL, NULL, NULL,
    '20% OFF', 'available', true, 'published', NULL, NULL
  ),
  (
    'full-body-check-up-package', 'Full Body Check-up Package', NULL, NULL, 10000, 6000,
    true, NULL, 'preventive', 'preventive',
    NULL, 5, true, false,
    false, false, NULL, NULL, NULL, NULL, NULL,
    '40% OFF', 'available', true, 'published', NULL, NULL
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  discounted_price = EXCLUDED.discounted_price,
  show_price_publicly = EXCLUDED.show_price_publicly,
  prep_instructions = EXCLUDED.prep_instructions,
  category = EXCLUDED.category,
  test_category = EXCLUDED.test_category,
  primary_doctor_id = EXCLUDED.primary_doctor_id,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured,
  consultation_included = EXCLUDED.consultation_included,
  fasting_required = EXCLUDED.fasting_required,
  fasting_duration = EXCLUDED.fasting_duration,
  age_sex_applicability = EXCLUDED.age_sex_applicability,
  exclusions = EXCLUDED.exclusions,
  report_turnaround = EXCLUDED.report_turnaround,
  medical_disclaimer = EXCLUDED.medical_disclaimer,
  discount_label = EXCLUDED.discount_label,
  purchase_status = EXCLUDED.purchase_status,
  purchase_enabled = EXCLUDED.purchase_enabled,
  publication_status = EXCLUDED.publication_status,
  effective_start = EXCLUDED.effective_start,
  effective_end = EXCLUDED.effective_end,
  updated_at = NOW();

UPDATE packages
SET
  is_active = false,
  is_featured = false,
  purchase_enabled = false,
  publication_status = 'draft',
  updated_at = NOW()
WHERE slug IN (
  'diabetes-management-package',
  'basic-cardiac-package',
  'advance-cardiac-package',
  'full-body-checkup',
  'thyroid-profile'
);

DELETE FROM package_tests
WHERE package_id IN (
  SELECT id
  FROM packages
  WHERE slug IN (
    'diabetic-package',
    'cardiac-package',
    'advanced-cardiac-package',
    'diabetic-and-cardiac-package',
    'full-body-check-up-package'
  )
);

INSERT INTO package_tests (package_id, test_name, test_category, description, sort_order)
SELECT p.id, item.test_name, item.test_category, item.description, item.sort_order
FROM packages p
JOIN (
  VALUES
    ('diabetic-package', 'Body Composition Analysis', 'Health measurements', NULL, 1),
    ('diabetic-package', 'Complete Blood Count', 'Laboratory tests', 'CBC', 2),
    ('diabetic-package', 'HbA1c', 'Laboratory tests', 'Average Blood Sugar Test', 3),
    ('diabetic-package', 'Lipid Profile', 'Laboratory tests', 'Cholesterol Test', 4),
    ('diabetic-package', 'Serum Creatinine', 'Laboratory tests', 'Kidney Function Test', 5),
    ('diabetic-package', 'Urine Microalbumin', 'Laboratory tests', 'Urine Protein Test', 6),
    ('diabetic-package', 'SGPT and SGOT', 'Laboratory tests', 'Liver Enzyme Tests', 7),
    ('diabetic-package', 'TSH', 'Laboratory tests', 'Thyroid Test', 8),
    ('diabetic-package', 'Total Calcium', 'Laboratory tests', NULL, 9),
    ('diabetic-package', 'Retina/Fundus Examination', 'Eye examination', NULL, 10),
    ('diabetic-package', 'Dietitian Guidance', 'Guidance included', NULL, 11),
    ('diabetic-package', 'Diabetes Specialist Guidance', 'Guidance included', NULL, 12),

    ('cardiac-package', 'Complete Blood Count', 'Laboratory tests', 'CBC', 1),
    ('cardiac-package', 'HbA1c', 'Laboratory tests', 'Average Blood Sugar Test', 2),
    ('cardiac-package', 'Lipid Profile', 'Laboratory tests', 'Cholesterol Test', 3),
    ('cardiac-package', 'Serum Creatinine', 'Laboratory tests', 'Kidney Function Test', 4),
    ('cardiac-package', 'ECG', 'Cardiac tests and imaging', NULL, 5),
    ('cardiac-package', '2D Echocardiography', 'Cardiac tests and imaging', NULL, 6),
    ('cardiac-package', 'TMT/Treadmill Test', 'Cardiac tests and imaging', 'If clinically required', 7),
    ('cardiac-package', 'TSH', 'Laboratory tests', 'Thyroid Test', 8),
    ('cardiac-package', 'Dietitian Guidance', 'Guidance included', NULL, 9),
    ('cardiac-package', 'Cardiologist Guidance', 'Guidance included', NULL, 10),

    ('advanced-cardiac-package', 'Body Composition Analysis', 'Health measurements', NULL, 1),
    ('advanced-cardiac-package', 'Complete Blood Count', 'Laboratory tests', 'CBC', 2),
    ('advanced-cardiac-package', 'HbA1c', 'Laboratory tests', 'Average Blood Sugar Test', 3),
    ('advanced-cardiac-package', 'Lipid Profile', 'Laboratory tests', 'Cholesterol Test', 4),
    ('advanced-cardiac-package', 'Serum Creatinine', 'Laboratory tests', 'Kidney Function Test', 5),
    ('advanced-cardiac-package', 'SGPT and SGOT', 'Laboratory tests', 'Liver Enzyme Tests', 6),
    ('advanced-cardiac-package', 'TSH', 'Laboratory tests', 'Thyroid Test', 7),
    ('advanced-cardiac-package', 'Total Calcium', 'Laboratory tests', NULL, 8),
    ('advanced-cardiac-package', 'ECG', 'Cardiac tests and imaging', NULL, 9),
    ('advanced-cardiac-package', '2D Echocardiography', 'Cardiac tests and imaging', NULL, 10),
    ('advanced-cardiac-package', 'TMT/Treadmill Test', 'Cardiac tests and imaging', 'If clinically required', 11),
    ('advanced-cardiac-package', 'Dietitian Guidance', 'Guidance included', NULL, 12),
    ('advanced-cardiac-package', 'Diabetes Specialist Guidance', 'Guidance included', NULL, 13),
    ('advanced-cardiac-package', 'Cardiologist Guidance', 'Guidance included', NULL, 14),

    ('diabetic-and-cardiac-package', 'Body Composition Analysis', 'Health measurements', NULL, 1),
    ('diabetic-and-cardiac-package', 'Complete Blood Count', 'Laboratory tests', 'CBC', 2),
    ('diabetic-and-cardiac-package', 'HbA1c', 'Laboratory tests', 'Average Blood Sugar Test', 3),
    ('diabetic-and-cardiac-package', 'Lipid Profile', 'Laboratory tests', 'Cholesterol Test', 4),
    ('diabetic-and-cardiac-package', 'Serum Creatinine', 'Laboratory tests', 'Kidney Function Test', 5),
    ('diabetic-and-cardiac-package', 'Urine Microalbumin', 'Laboratory tests', 'Urine Protein Test', 6),
    ('diabetic-and-cardiac-package', 'SGPT and SGOT', 'Laboratory tests', 'Liver Enzyme Tests', 7),
    ('diabetic-and-cardiac-package', 'TSH', 'Laboratory tests', 'Thyroid Test', 8),
    ('diabetic-and-cardiac-package', 'Total Calcium', 'Laboratory tests', NULL, 9),
    ('diabetic-and-cardiac-package', 'Retina/Fundus Examination', 'Eye examination', NULL, 10),
    ('diabetic-and-cardiac-package', 'ECG', 'Cardiac tests and imaging', NULL, 11),
    ('diabetic-and-cardiac-package', '2D Echocardiography', 'Cardiac tests and imaging', NULL, 12),
    ('diabetic-and-cardiac-package', 'TMT/Treadmill Test', 'Cardiac tests and imaging', 'If clinically required', 13),
    ('diabetic-and-cardiac-package', 'Dietitian Guidance', 'Guidance included', NULL, 14),
    ('diabetic-and-cardiac-package', 'Diabetes Specialist Guidance', 'Guidance included', NULL, 15),
    ('diabetic-and-cardiac-package', 'Cardiologist Guidance', 'Guidance included', NULL, 16),

    ('full-body-check-up-package', 'Body Composition Analysis', 'Health measurements', NULL, 1),
    ('full-body-check-up-package', 'Complete Blood Count', 'Laboratory tests', 'CBC', 2),
    ('full-body-check-up-package', 'HbA1c', 'Laboratory tests', 'Average Blood Sugar Test', 3),
    ('full-body-check-up-package', 'Lipid Profile', 'Laboratory tests', 'Cholesterol Test', 4),
    ('full-body-check-up-package', 'Serum Creatinine', 'Laboratory tests', 'Kidney Function Test', 5),
    ('full-body-check-up-package', 'TSH and Free T4', 'Laboratory tests', 'Thyroid Function Tests', 6),
    ('full-body-check-up-package', 'Liver Function Test', 'Laboratory tests', NULL, 7),
    ('full-body-check-up-package', 'Total Calcium', 'Laboratory tests', NULL, 8),
    ('full-body-check-up-package', '25-OH Vitamin D3', 'Laboratory tests', NULL, 9),
    ('full-body-check-up-package', 'Vitamin B12', 'Laboratory tests', NULL, 10),
    ('full-body-check-up-package', 'ECG', 'Cardiac tests and imaging', NULL, 11),
    ('full-body-check-up-package', '2D Echocardiography', 'Cardiac tests and imaging', NULL, 12),
    ('full-body-check-up-package', 'TMT/Treadmill Test', 'Cardiac tests and imaging', 'If clinically required', 13),
    ('full-body-check-up-package', 'Ultrasound of the Abdomen', 'Imaging', NULL, 14),
    ('full-body-check-up-package', 'Dietitian Guidance', 'Guidance included', NULL, 15),
    ('full-body-check-up-package', 'Diabetes Specialist Guidance', 'Guidance included', NULL, 16),
    ('full-body-check-up-package', 'Cardiologist Guidance', 'Guidance included', NULL, 17)
) AS item(slug, test_name, test_category, description, sort_order)
  ON p.slug = item.slug;
