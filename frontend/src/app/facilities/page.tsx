import React from 'react';
import type { Metadata } from 'next';
import { Scale, Activity, Moon, Stethoscope, HeartPulse, Eye, Syringe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Our Facilities | Spandan Super Speciality Clinic',
  description: 'Explore Spandan Clinic\'s advanced diagnostic facilities — InBody, CGMS, ABPM, Holter, Sleep Study, and more in Chhatrapati Sambhajinagar.',
  openGraph: {
    title: 'Facilities at Spandan Super Speciality Clinic',
    description: 'Advanced diagnostic technology for accurate health assessment.',
  },
};

const facilityIcons: Record<string, React.ReactNode> = {
  'InBody Body Composition Analysis': <Scale size={28} />,
  'Continuous Glucose Monitoring System (CGMS)': <Activity size={28} />,
  'Sleep Study (Polysomnography)': <Moon size={28} />,
  'Ambulatory Blood Pressure Monitoring (ABPM)': <Stethoscope size={28} />,
  'Holter Monitoring': <HeartPulse size={28} />,
  'Retina / Fundus Examination': <Eye size={28} />,
  'Insulin Pump Therapy': <Syringe size={28} />,
};

const facilities = [
  { title: 'InBody Body Composition Analysis', desc: 'Advanced bioelectrical impedance analysis for precise measurement of body fat, muscle mass, hydration levels, and metabolic health indicators.' },
  { title: 'Continuous Glucose Monitoring System (CGMS)', desc: 'Real-time glucose monitoring over 72+ hours for comprehensive diabetes management and insulin adjustment guidance.' },
  { title: 'Sleep Study (Polysomnography)', desc: 'Overnight sleep diagnostic test that records brain waves, oxygen levels, heart rate, breathing patterns, and limb movements to diagnose sleep disorders.' },
  { title: 'Ambulatory Blood Pressure Monitoring (ABPM)', desc: '24-hour automated blood pressure monitoring device that records readings during daily activities and sleep for accurate hypertension diagnosis.' },
  { title: 'Holter Monitoring', desc: 'Continuous 24-48 hour ECG recording for detecting cardiac arrhythmias, palpitations, and silent ischemic episodes that a standard ECG may miss.' },
  { title: 'Retina / Fundus Examination', desc: 'High-resolution digital retinal imaging and fundus photography for early detection of diabetic retinopathy, glaucoma, and macular degeneration.' },
  { title: 'Insulin Pump Therapy', desc: 'Continuous subcutaneous insulin infusion system for precise insulin delivery, offering better glycemic control for type 1 and type 2 diabetes patients.' },
];

export default function FacilitiesPage() {
  return (
    <>
      <section className="bg-navy text-white py-16 text-center">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Our Facilities</h1>
          <p className="opacity-85 text-lg">World-class infrastructure for accurate diagnosis and patient comfort</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-3">
            {facilities.map((facility, i) => (
              <div key={facility.title} className="card p-6">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">{facilityIcons[facility.title]}</div>
                <h3 className="text-lg font-bold mb-2">{facility.title}</h3>
                <p className="text-sm text-text-light leading-relaxed">{facility.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
