import { Request, Response } from 'express';
import { getDoctorBySlug, getDoctors } from '../models';
import { isValidSlug } from '../utils/slug';
import { notFound } from '../utils/errors';

function qualificationList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function expertiseForSpeciality(speciality: string): string[] {
  const source = speciality.toLowerCase();
  if (source.includes('cardio')) {
    return [
      'Chest pain or breathlessness evaluation',
      'Blood pressure and ECG review',
      'Holter or ABPM discussion',
      'Preventive heart-risk consultation',
    ];
  }
  if (source.includes('endo') || source.includes('diabetes') || source.includes('thyroid')) {
    return [
      'Diabetes and glucose-pattern review',
      'Thyroid and hormone concerns',
      'Weight and metabolic health discussion',
      'Growth, puberty, or endocrine follow-up',
    ];
  }
  return ['Specialist consultation', 'Report review', 'Follow-up planning'];
}

function publicDoctorSummary(d: Awaited<ReturnType<typeof getDoctors>>[number]) {
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    speciality: d.speciality,
    qualifications: d.qualifications,
    qualification_list: qualificationList(d.qualifications),
    photo_url: d.photo_url,
    expertise: expertiseForSpeciality(d.speciality),
    languages: ['English', 'Hindi', 'Marathi'],
    published: d.is_active,
    booking_enabled: d.is_active,
    reviewed_at: d.updated_at,
  };
}

export async function listDoctors(_req: Request, res: Response): Promise<void> {
  const doctors = await getDoctors(true);
  const result = doctors.map(publicDoctorSummary);
  res.json({ doctors: result });
}

export async function getDoctorDetail(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  if (!isValidSlug(slug)) {
    notFound(res, 'Doctor not found');
    return;
  }

  const doctor = await getDoctorBySlug(slug);
  if (!doctor || !doctor.is_active) {
    notFound(res, 'Doctor not found');
    return;
  }

  const summary = publicDoctorSummary(doctor);
  res.json({
    doctor: {
      ...summary,
      role: `${doctor.speciality} specialist`,
      registration: null,
      education: summary.qualification_list,
      biography_sections: [
        {
          heading: 'Care focus',
          body: `${doctor.name} provides ${doctor.speciality.toLowerCase()} consultations at Spandan Super Speciality Clinic. Public profile content is limited to verified professional fields approved for publication.`,
        },
      ],
      related: {
        diagnostics: [],
        packages: [],
        resources: [],
      },
    },
  });
}
