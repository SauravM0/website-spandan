import { Request, Response } from 'express';
import { enquirySchema } from '../utils/validation';
import {
  isPackageActive, getPrimaryDoctorByPackageId,
  createPublicEnquiryWithInitialHistory,
} from '../models';
import { sendEnquiryNotification } from '../services/email';
import { badRequest, serverError } from '../utils/errors';

export async function submitEnquiry(req: Request, res: Response): Promise<void> {
  // Step 1: Parse and validate with Zod
  const parsed = enquirySchema.safeParse(req.body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map(i => i.message);
    badRequest(res, messages.join('; '));
    return;
  }

  const data = parsed.data;

  // Step 2: Verify package exists and is active
  const packageActive = await isPackageActive(data.package_id);
  if (!packageActive) {
    badRequest(res, 'Invalid package selected');
    return;
  }

  // Step 3: Look up package's primary doctor
  const primaryDoctor = await getPrimaryDoctorByPackageId(data.package_id);
  const doctorId = primaryDoctor?.id || null;

  try {
    const enquiry = await createPublicEnquiryWithInitialHistory({
      package_id: data.package_id,
      doctor_id: doctorId,
      patient_name: data.patient_name,
      phone: data.phone,
      email: data.email || null,
      referring_doctor_name: data.referring_doctor_name || null,
      referring_doctor_phone: data.referring_doctor_phone || null,
      preferred_date: data.preferred_date || null,
      preferred_time_window: data.preferred_time_window || null,
      source_language: data.language,
    });

    // Step 5: Trigger notification asynchronously - response does NOT wait
    sendEnquiryNotification({
      patientName: data.patient_name,
      patientPhone: data.phone,
      patientEmail: data.email || '',
      packageName: '', // Will be resolved inside the service
      enquiryId: enquiry.id,
      preferredDate: data.preferred_date || undefined,
      preferredTimeWindow: data.preferred_time_window || undefined,
    }).catch((err: Error) => console.error('Async notification failed:', err));

    res.status(201).json({
      success: true,
      reference_id: enquiry.id,
    });
  } catch (err) {
    console.error('Failed to create enquiry:', err);
    serverError(res);
  }
}
