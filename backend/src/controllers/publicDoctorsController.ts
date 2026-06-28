import { Request, Response } from 'express';
import { getDoctors } from '../models';

export async function listDoctors(_req: Request, res: Response): Promise<void> {
  const doctors = await getDoctors(true);
  // Return only public-facing fields
  const result = doctors.map(d => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    speciality: d.speciality,
    qualifications: d.qualifications,
    bio: d.bio,
    photo_url: d.photo_url,
  }));
  res.json({ doctors: result });
}
