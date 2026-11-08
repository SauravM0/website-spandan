import { Request, Response } from 'express';
import { getDoctors, getDoctorBySlug, getDoctorById, createDoctor, updateDoctor, deleteDoctor } from '../models';
import type { AuthenticatedRequest } from '../middleware/auth';
import { PERMISSIONS, roleHasPermission } from '../security/permissions';
import { forbidden, unauthorized } from '../utils/errors';

/**
 * Lists doctors. The public site calls this with no credentials and only ever
 * receives published profiles.
 *
 * `?all=true` returns unpublished doctors too, which the staff calendar needs.
 * That previously ran on this same unauthenticated route, so anyone could ask
 * for the inactive list. It now requires a signed-in staff member who can read
 * appointments; an anonymous or unauthorised request is refused rather than
 * silently downgraded, so a caller cannot mistake a partial list for the full one.
 */
export async function list(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (req.query.all !== 'true') {
    res.json({ doctors: await getDoctors(true) });
    return;
  }

  if (!req.user) {
    unauthorized(res);
    return;
  }
  if (!roleHasPermission(req.user.role, PERMISSIONS.APPOINTMENTS_READ)) {
    forbidden(res);
    return;
  }

  res.json({ doctors: await getDoctors(false) });
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
