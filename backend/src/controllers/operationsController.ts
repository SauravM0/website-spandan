import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  createAppointment,
  createAppointmentPayment,
  createAvailabilityRule,
  createCalendarOverride,
  deleteCalendarOverride,
  createOrderPayment,
  createPackageOrder,
  createPayment,
  createSlotHold,
  exportAppointmentsCsv,
  exportPaymentsCsv,
  getAdminDashboard,
  getAppointmentConfig,
  getAppointmentHold,
  getPaymentStatus,
  listDoctorAvailability,
  listPackageCommerceCatalog,
  listAvailabilityRules,
  listAppointments,
  listCalendarOverrides,
  listPackageOrders,
  listPayments,
  listSlots,
  updateAppointmentStatus,
  updateAppointmentConfig,
  updatePaymentStatus,
  appointmentConfigWarnings,
} from '../services/operations';
import {
  getReceiptDetailsByTransaction,
  listNotificationOutbox,
  queueReceiptEmailByReceiptId,
  retryNotification,
} from '../services/notifications';
import { buildReceiptPdf } from '../services/receiptPdf';
import { normalizePhonePeState, verifyPhonePeWebhookAuthorization } from '../services/phonePe';
import { sendApiError } from '../utils/errors';

function handleError(res: Response, err: unknown) {
  const error = err as Error & { status?: number; code?: string };
  sendApiError(
    res,
    error.status || 400,
    error.code || (error.status === 409 ? 'CONFLICT' : 'REQUEST_FAILED'),
    error.message || 'Request failed'
  );
}

export async function getSlots(req: AuthenticatedRequest, res: Response) {
  try {
    const { doctor_id, date } = req.query;
    if (!doctor_id || !date) {
      res.status(400).json({ error: 'doctor_id and date are required' });
      return;
    }
    const slots = await listSlots(String(doctor_id), String(date));
    res.json({ slots });
  } catch (err) {
    handleError(res, err);
  }
}

export async function getPublicDoctorAvailability(req: AuthenticatedRequest, res: Response) {
  try {
    const doctorId = req.params.id;
    const from = String(req.query.from || req.query.date);
    const to = String(req.query.to || req.query.date || req.query.from);
    const availability = await listDoctorAvailability(doctorId, from, to);
    res.json({ availability });
  } catch (err) {
    handleError(res, err);
  }
}

export async function holdSlot(req: AuthenticatedRequest, res: Response) {
  try {
    const hold = await createSlotHold(req.body);
    res.status(201).json({ hold });
  } catch (err) {
    handleError(res, err);
  }
}

export async function getHold(req: AuthenticatedRequest, res: Response) {
  try {
    const hold = await getAppointmentHold(req.params.id);
    if (!hold) {
      sendApiError(res, 404, 'HOLD_NOT_FOUND', 'Appointment hold not found');
      return;
    }
    res.json({ hold });
  } catch (err) {
    handleError(res, err);
  }
}

export async function bookAppointment(req: AuthenticatedRequest, res: Response) {
  try {
    const appointment = await createAppointment({
      ...req.body,
      source: req.user ? 'admin' : 'public',
      created_by_staff_id: req.user?.id,
    });
    res.status(201).json({ appointment });
  } catch (err) {
    handleError(res, err);
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const order = await createPackageOrder(req.body);
    res.status(201).json({ order });
  } catch (err) {
    handleError(res, err);
  }
}

export async function packageCatalog(_req: AuthenticatedRequest, res: Response) {
  try {
    res.json({ packages: await listPackageCommerceCatalog() });
  } catch (err) {
    handleError(res, err);
  }
}

export async function startPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const payment = await createPayment(req.body);
    res.status(201).json({ payment });
  } catch (err) {
    handleError(res, err);
  }
}

export async function startOrderPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const payment = await createOrderPayment(req.params.id);
    res.status(201).json({ payment });
  } catch (err) {
    handleError(res, err);
  }
}

export async function startAppointmentPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const payment = await createAppointmentPayment(req.params.holdId);
    res.status(201).json({ payment });
  } catch (err) {
    handleError(res, err);
  }
}

export async function paymentWebhook(req: AuthenticatedRequest, res: Response) {
  try {
    if (!verifyPhonePeWebhookAuthorization(req.header('authorization'))) {
      res.status(401).json({ error: 'Invalid webhook authorization' });
      return;
    }

    const payload = req.body.payload || req.body;
    const transactionId =
      payload.merchantOrderId || req.body.merchant_transaction_id || req.body.transactionId;
    const status = normalizePhonePeState(payload.state || req.body.status);
    if (!transactionId) {
      res.status(400).json({ error: 'merchantOrderId is required' });
      return;
    }
    const payment = await updatePaymentStatus(
      transactionId,
      status,
      req.body,
      req.body.event || 'phonepe.webhook'
    );
    res.json({ payment });
  } catch (err) {
    handleError(res, err);
  }
}

export async function paymentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const payment = await getPaymentStatus(req.params.transactionId);
    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    res.json({ payment });
  } catch (err) {
    handleError(res, err);
  }
}

export async function paymentReturn(req: AuthenticatedRequest, res: Response) {
  try {
    const transactionId = String(req.query.transaction || req.query.merchantOrderId || '');
    if (!transactionId) {
      sendApiError(res, 400, 'TRANSACTION_REQUIRED', 'transaction is required');
      return;
    }
    const payment = await getPaymentStatus(transactionId);
    if (!payment) {
      sendApiError(res, 404, 'PAYMENT_NOT_FOUND', 'Payment not found');
      return;
    }
    res.json({ payment });
  } catch (err) {
    handleError(res, err);
  }
}

export async function receipt(req: AuthenticatedRequest, res: Response) {
  try {
    const details = await getReceiptDetailsByTransaction(req.params.transactionId);
    if (!details || details.status !== 'success') {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${details.receipt_number || 'receipt'}.pdf"`
    );
    res.send(buildReceiptPdf(details));
  } catch (err) {
    handleError(res, err);
  }
}

export async function emailReceipt(req: AuthenticatedRequest, res: Response) {
  try {
    const receipt = await queueReceiptEmailByReceiptId(req.params.id, req.body?.email);
    if (!receipt) {
      sendApiError(res, 404, 'RECEIPT_NOT_FOUND', 'Receipt not found');
      return;
    }
    res.status(202).json({ receipt });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminDashboard(_req: AuthenticatedRequest, res: Response) {
  try {
    res.json({ dashboard: await getAdminDashboard() });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminAppointmentSettings(_req: AuthenticatedRequest, res: Response) {
  try {
    const settings = await getAppointmentConfig();
    res.json({ settings, warnings: appointmentConfigWarnings(settings) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminUpdateAppointmentSettings(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role === 'doctor') {
      res.status(403).json({ error: 'Doctor users cannot change appointment settings' });
      return;
    }
    const result = await updateAppointmentConfig(req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminAppointments(_req: AuthenticatedRequest, res: Response) {
  try {
    const req = _req;
    const doctorId =
      req.user?.role === 'doctor'
        ? req.user.doctor_id || undefined
        : req.query.doctor_id
          ? String(req.query.doctor_id)
          : undefined;
    res.json({
      appointments: await listAppointments({
        doctorId,
        status: req.query.status ? String(req.query.status) : undefined,
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      }),
    });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminAppointmentsExport(_req: AuthenticatedRequest, res: Response) {
  try {
    const req = _req;
    const doctorId =
      req.user?.role === 'doctor'
        ? req.user.doctor_id || undefined
        : req.query.doctor_id
          ? String(req.query.doctor_id)
          : undefined;
    const csv = await exportAppointmentsCsv({
      doctorId,
      status: req.query.status ? String(req.query.status) : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="appointments-export.csv"');
    res.send(csv);
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminAvailabilityRules(req: AuthenticatedRequest, res: Response) {
  try {
    const doctorId =
      req.user?.role === 'doctor'
        ? req.user.doctor_id || undefined
        : req.query.doctor_id
          ? String(req.query.doctor_id)
          : undefined;
    res.json({ rules: await listAvailabilityRules(doctorId) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminCreateAvailabilityRule(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role === 'doctor') {
      res.status(403).json({ error: 'Doctor users cannot change availability rules' });
      return;
    }
    res.status(201).json({ rule: await createAvailabilityRule(req.body) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminCalendarOverrides(req: AuthenticatedRequest, res: Response) {
  try {
    const doctorId =
      req.user?.role === 'doctor'
        ? req.user.doctor_id || undefined
        : req.query.doctor_id
          ? String(req.query.doctor_id)
          : undefined;
    res.json({
      overrides: await listCalendarOverrides({
        doctorId,
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
      }),
    });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminCreateCalendarOverride(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role === 'doctor') {
      res.status(403).json({ error: 'Doctor users cannot change calendar overrides' });
      return;
    }
    res.status(201).json({ override: await createCalendarOverride(req.body) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminDeleteCalendarOverride(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role === 'doctor') {
      res.status(403).json({ error: 'Doctor users cannot change calendar overrides' });
      return;
    }
    res.json({ override: await deleteCalendarOverride(req.params.id) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminUpdateAppointmentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const appointment = await updateAppointmentStatus({
      appointmentId: req.params.id,
      status: req.body.status,
      actorStaffId: req.user?.id,
    });
    res.json({ appointment });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminOrders(_req: AuthenticatedRequest, res: Response) {
  try {
    res.json({ orders: await listPackageOrders() });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminPayments(_req: AuthenticatedRequest, res: Response) {
  try {
    const req = _req;
    res.json({
      payments: await listPayments({
        status: req.query.status ? String(req.query.status) : undefined,
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
      }),
    });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminPaymentsExport(_req: AuthenticatedRequest, res: Response) {
  try {
    const req = _req;
    const csv = await exportPaymentsCsv({
      status: req.query.status ? String(req.query.status) : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="payments-export.csv"');
    res.send(csv);
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminNotifications(_req: AuthenticatedRequest, res: Response) {
  try {
    res.json({ notifications: await listNotificationOutbox() });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminRetryNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const notification = await retryNotification(req.params.id);
    if (!notification) {
      sendApiError(res, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
      return;
    }
    res.json({ notification });
  } catch (err) {
    handleError(res, err);
  }
}
