-- Migration 003: Seed articles content

INSERT INTO articles (slug, title, body_md, excerpt, language, category, published_at) VALUES
  ('early-warning-signs-heart-disease', '10 Early Warning Signs of Heart Disease You Shouldn''t Ignore',
   'Heart disease remains one of the leading causes of mortality worldwide. Recognizing early warning signs can make a crucial difference in outcomes. Here are 10 signs that warrant medical attention:

1. Chest Discomfort: Not always the dramatic clutching of the chest — it may feel like pressure, squeezing, or indigestion.

2. Shortness of Breath: If you find yourself winded after minimal exertion, it could indicate your heart is struggling to pump efficiently.

3. Fatigue: Unusual, persistent tiredness — especially in women — can be an early warning sign.

4. Swelling in Legs, Ankles, or Feet: This edema can indicate your heart isn''t pumping blood as effectively as it should.

5. Irregular Heartbeat: Occasional palpitations are common, but persistent arrhythmias need evaluation.

6. Dizziness or Lightheadedness: Reduced blood flow to the brain can cause these symptoms.

7. Nausea or Lack of Appetite: Sometimes mistaken for flu, these can accompany heart issues.

8. Pain Radiating to Arm, Jaw, or Back: Classic heart attack symptoms often include referred pain.

9. Cold Sweats: Breaking out in a cold sweat without reason can be a sign of heart distress.

10. Persistent Cough: A cough that produces white or pink mucus could indicate heart failure.

When to See a Doctor: If you experience any combination of these symptoms, especially if you have risk factors like diabetes, hypertension, smoking, or a family history of heart disease, consult a cardiologist promptly.',
   'Recognizing early warning signs of heart disease can save lives. Learn the 10 critical symptoms you should never ignore.',
   'en', 'Cardiology', NOW()),

  ('managing-diabetes-guide', 'Managing Diabetes: A Complete Guide to Blood Sugar Control',
   'Diabetes management is a lifelong journey that requires a comprehensive approach. Here''s your complete guide to keeping blood sugar under control.

1. Understand Your Numbers
Know your HbA1c target (typically below 7% for most adults), fasting blood sugar (80-130 mg/dL), and post-meal levels (below 180 mg/dL).

2. Nutrition Matters
Focus on complex carbohydrates with low glycemic index. Include lean protein and healthy fats with every meal. Limit processed foods and sugary beverages.

3. Stay Active
Aim for 150 minutes of moderate-intensity exercise per week. Walking, swimming, and cycling are excellent choices.

4. Medication Adherence
Take medications exactly as prescribed. Never skip doses. Understand how each medication works and its potential side effects.

5. Regular Monitoring
Check blood sugar as recommended by your doctor. Keep a log of your readings to identify patterns.

6. Foot Care
Diabetes can reduce circulation and sensation in your feet. Inspect feet daily, keep them clean and moisturized, and wear properly fitting shoes.

7. Annual Checkups
At minimum, get annual eye exams, kidney function tests, foot exams, and dental checkups.',
   'A comprehensive guide to managing diabetes through diet, exercise, medication, and regular monitoring.',
   'en', 'Endocrinology', NOW()),

  ('importance-regular-health-checkups', 'The Importance of Regular Health Checkups: Prevention is Better Than Cure',
   'In today''s fast-paced world, it''s easy to postpone health checkups until something feels wrong. However, waiting for symptoms to appear before seeing a doctor can be a costly mistake.

Why Regular Checkups Matter

Early Detection: Many serious conditions — hypertension, diabetes, certain cancers — develop silently without noticeable symptoms. Regular screening catches them early when treatment is most effective.

Baseline Measurements: Annual checkups establish your personal health baseline. When values change over time, your doctor can spot trends before they become problems.

Risk Assessment: Based on your age, family history, lifestyle, and lab results, your doctor can assess your risk for various conditions and recommend preventive measures.

Cost-Effective: Treating a condition in its early stages is almost always less expensive and less invasive than treating advanced disease.

What a Comprehensive Checkup Includes:
- Complete Blood Count (CBC)
- Lipid Profile (cholesterol, triglycerides)
- Blood Sugar (fasting and post-meal)
- Liver and Kidney Function Tests
- Thyroid Profile
- Blood Pressure Measurement

How Often Should You Get Checked?
- Ages 20-39: Every 2-3 years if healthy
- Ages 40-60: Annually
- 60+: Annually with additional age-appropriate screenings',
   'Annual health screenings are essential for early detection and prevention. Learn why regular checkups matter and what they include.',
   'en', 'General Medicine', NOW()),

  ('understanding-thyroid-disorders', 'Understanding Your Thyroid: Common Disorders and Treatments',
   'The thyroid gland, a small butterfly-shaped organ at the base of your neck, plays an outsized role in your overall health. It produces hormones that regulate metabolism, heart rate, body temperature, and more.

Common Thyroid Disorders

Hypothyroidism (Underactive Thyroid)
- Symptoms: Fatigue, weight gain, cold sensitivity, dry skin, hair loss, depression
- Most common cause: Hashimoto''s thyroiditis (autoimmune)
- Treatment: Daily synthetic thyroid hormone (levothyroxine)

Hyperthyroidism (Overactive Thyroid)
- Symptoms: Weight loss, rapid heartbeat, heat intolerance, tremors, anxiety
- Most common cause: Graves'' disease (autoimmune)
- Treatment: Anti-thyroid medications, radioactive iodine, or surgery

Thyroid Nodules
- Most are benign, but 5-10% can be malignant
- Evaluation: Ultrasound, fine-needle aspiration biopsy

When to Get Tested
- You have family history of thyroid disease
- You experience unexplained weight changes
- You have persistent fatigue or energy fluctuations
- Women planning pregnancy or postpartum',
   'Learn about common thyroid disorders including hypothyroidism, hyperthyroidism, and thyroid nodules, their symptoms, and treatments.',
   'en', 'Endocrinology', NOW()),

  ('liver-health-guide', 'Liver Health 101: How to Keep Your Liver Functioning Optimally',
   'Your liver is one of the hardest-working organs in your body, performing over 500 vital functions including detoxification, protein synthesis, and bile production.

Top Tips for Liver Health

1. Maintain a Healthy Weight
Fatty liver disease affects up to 25% of people worldwide. Losing just 5-10% of body weight can significantly reduce liver fat.

2. Eat a Liver-Friendly Diet
- Plenty of fruits and vegetables (especially leafy greens)
- Whole grains and fiber
- Lean proteins
- Healthy fats (olive oil, nuts, avocados)

3. Limit Alcohol Consumption
The liver can process about one standard drink per hour. Regular heavy drinking leads to alcoholic liver disease.

4. Stay Hydrated
Water helps the liver flush toxins more efficiently. Aim for 8-10 glasses daily.

5. Exercise Regularly
Physical activity helps reduce liver fat, even without significant weight loss.

6. Be Careful with Medications
Acetaminophen (paracetamol) and certain other drugs can damage the liver when taken in excess.

7. Get Vaccinated
Hepatitis A and B vaccines are safe and effective.

Warning Signs of Liver Problems
- Jaundice (yellowing of skin/eyes)
- Dark urine, pale stools
- Chronic fatigue
- Abdominal swelling',
   'Essential tips for maintaining optimal liver health through diet, exercise, and lifestyle choices.',
   'en', 'Gastroenterology', NOW())
ON CONFLICT (slug) DO NOTHING;
