import { Request, Response } from 'express';
import { getDoctors, getDoctorBySlug, getDoctorById, createDoctor, updateDoctor, deleteDoctor } from '../models';

export async function list(req: Request, res: Response): Promise<void> {
  const activeOnly = req.query.all !== 'true';
  const doctors = await getDoctors(activeOnly);
  res.json({ doctors });
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const doctor = await getDoctorBySlug(req.params.slug);
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found' });
    return;
  }
  res.json({ doctor });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const doctor = await getDoctorById(req.params.id);
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found' });
    return;
  }
  res.json({ doctor });
}

export async function create(req: Request, res: Response): Promise<void> {
  const doctor = await createDoctor(req.body);
  res.status(201).json({ doctor });
}

export async function update(req: Request, res: Response): Promise<void> {
  const doctor = await updateDoctor(req.params.id, req.body);
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found' });
    return;
  }
  res.json({ doctor });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const deleted = await deleteDoctor(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Doctor not found' });
    return;
  }
  res.json({ message: 'Doctor deleted' });
}
