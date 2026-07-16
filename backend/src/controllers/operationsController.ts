import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  createAppointment,
  createAppointmentPayment,
  createAvailabilityRule,
  createCalendarOverride,
  createCalendarOverridesBatch,
  deleteCalendarOverride,
  createOrderPayment,
  createPackageOrder,
  createPayment,
  createSlotHold,
  exportAppointmentsCsv,
  exportPaymentsCsv,
  getAdminDashboard,
  getAdminCalendarView,
  getScheduleConflictCase,
  getAdminPaymentDetail,
  getAppointmentConfig,
  getAppointmentHold,
  getPaymentStatusById,
  listDoctorAvailability,
  getPublicDoctorAvailabilityView,
  listPackageCommerceCatalog,
  listAvailabilityRules,
  listAppointments,
  listAppointmentsPage,
  listCalendarOverrides,
  listPackageOrders,
  getPackageOrderDetail,
  transitionPackageOrder,
  assignPackageOrder,
  confirmPackageOrderPrice,
  listPayments,
  listSlots,
  quotePackageOrder,
  recheckAdminPayment,
  transitionAppointment,
  rescheduleAppointment,
  updateAppointmentConfig,
  updatePaymentStatus,
  appointmentConfigWarnings,
  recoverAppointmentBooking,
  listPaymentExceptions,
  requestPaymentRefund,
  recordScheduleConflictResolutions,
  applyScheduleConflictCase,
} from '../services/operations';
import {
  bulkRetryNotifications,
  deadLetterNotification,
  getNotificationDetail,
  getReceiptDetailsByPaymentId,
  listNotificationOutbox,
  queueVerifiedReceiptEmailByPaymentId,
  retryNotification,
} from '../services/notifications';
import { buildReceiptPdf } from '../services/receiptPdf';
import {
  getPhonePeOrderStatus,
  normalizePhonePeState,
  validatePhonePeWebhook,
} from '../services/phonePe';
import { AppError, sendApiError } from '../utils/errors';
import { config } from '../config';
import {
  createBillableService,
  getPublicConsultationPrice,
  listBillableServices,
  updateBillableService,
} from '../services/servicePricing';
import { PostgresWorkerLeaseStore } from '../worker/leaseStore';
import {
  getNeedsActionQueue,
  getWorkItemDetail,
  searchAdminWorkflow,
} from '../services/adminWorkflow';
import { operationalSnapshot } from '../observability/operationalSnapshot';
import { observeBookingConfirmation, observeBookingHold } from '../observability/metrics';
import {
  auditPublicPaymentAccess,
  publicPaymentStartDto,
  publicPaymentStatusDto,
  resolvePublicPaymentCapability,
} from '../security/publicPaymentCapabilities';
import { query } from '../config/database';

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
    res.json(await getPublicDoctorAvailabilityView(doctorId, from, to));
  } catch (err) {
    handleError(res, err);
  }
}

export async function holdSlot(req: AuthenticatedRequest, res: Response) {
  try {
    const hold = await createSlotHold({
      ...req.body,
      idempotency_key: req.header('idempotency-key') || undefined,
      correlation_id: res.locals.requestId,
    });
    observeBookingHold();
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

export async function recoverAppointment(req: AuthenticatedRequest, res: Response) {
  try {
    const booking = await recoverAppointmentBooking(req.body.reference, req.body.phone);
    if (!booking) {
      // Deliberately indistinguishable: do not disclose whether a reference or patient exists.
      sendApiError(res, 404, 'BOOKING_NOT_FOUND', 'Booking details could not be verified');
      return;
    }
    res.json({ booking });
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
      idempotency_key: req.header('idempotency-key') || undefined,
      correlation_id: res.locals.requestId,
    });
    observeBookingConfirmation();
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

export async function quoteOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const quote = await quotePackageOrder(req.body);
    res.json({ quote });
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

export async function publicAppointmentConfig(_req: AuthenticatedRequest, res: Response) {
  try {
    const settings = await getAppointmentConfig();
    const price = await getPublicConsultationPrice(
      _req.query.doctor_id ? String(_req.query.doctor_id) : undefined,
      _req.query.appointment_type ? String(_req.query.appointment_type) : 'new'
    );
    res.json({
      config: {
        clinic_timezone: 'Asia/Kolkata',
        clinic_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
          new Date()
        ),
        fee: Number(price.price),
        currency: 'INR',
        service: { id: price.id, code: price.code, name: price.name, version: price.version },
        policy_version: 'appointment-policy-2026-07-07',
        consent_version: 'appointment-consent-2026-07-07',
        minimum_booking_notice_minutes: settings.minimum_booking_notice_minutes,
        maximum_booking_horizon_days: settings.maximum_booking_horizon_days,
        hold_duration_minutes: settings.hold_duration_minutes,
        arrival_buffer_instructions: settings.arrival_buffer_instructions,
      },
    });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminBillableServices(_req: AuthenticatedRequest, res: Response) {
  try {
    res.json({ services: await listBillableServices() });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminCreateBillableService(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      sendApiError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      return;
    }
    res.status(201).json({ service: await createBillableService(req.body, req.user.id) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminUpdateBillableService(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      sendApiError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      return;
    }
    res.json({ service: await updateBillableService(req.params.id, req.body, req.user.id) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function startPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const payment = await createPayment({
      ...req.body,
      idempotency_key: req.header('idempotency-key') || undefined,
    });
    res.status(201).json({ payment: publicPaymentStartDto(payment) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function startOrderPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const payment = await createPayment({
      order_id: req.params.id,
      idempotency_key: req.header('idempotency-key') || undefined,
    });
    res.status(201).json({ payment: publicPaymentStartDto(payment) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function startAppointmentPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const payment = await createAppointmentPayment(
      req.params.holdId,
      req.header('idempotency-key') || undefined
    );
    res.status(201).json({ payment: publicPaymentStartDto(payment) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function paymentWebhook(req: AuthenticatedRequest, res: Response) {
  try {
    const callback = validatePhonePeWebhook(req.header('authorization'), req.body);
    // A callback is only a wake-up signal. PhonePe's authenticated status API is the authority.
    const providerStatus = await getPhonePeOrderStatus(callback.merchantOrderId);
    const status = normalizePhonePeState(providerStatus.state);
    const payment = await updatePaymentStatus(callback.merchantOrderId, status, providerStatus, {
      source: 'phonepe.webhook',
      providerVerified: true,
      observedAt: new Date(),
      eventName: callback.type,
      identityPayload: req.body,
      rejectReplay: true,
    });
    res.json({ accepted: true, replayed: Boolean(payment.event_replayed) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function paymentStatus(req: AuthenticatedRequest, res: Response) {
  let paymentId: string | null = null;
  try {
    const resolved = await resolvePublicPaymentCapability(req.params.capability, 'status');
    paymentId = resolved.paymentId;
    const payment = await getPaymentStatusById(paymentId);
    if (!payment) {
      await auditPublicPaymentAccess(paymentId, 'status', 'denied', res.locals.requestId);
      sendApiError(
        res,
        404,
        'PUBLIC_CAPABILITY_INVALID',
        'Payment access link is invalid or expired.'
      );
      return;
    }
    await auditPublicPaymentAccess(paymentId, 'status', 'success', res.locals.requestId);
    res.json({ payment: publicPaymentStatusDto(payment) });
  } catch (err) {
    await auditPublicPaymentAccess(paymentId, 'status', 'denied', res.locals.requestId);
    handleError(res, err);
  }
}

export async function receipt(req: AuthenticatedRequest, res: Response) {
  let paymentId: string | null = null;
  try {
    const resolved = await resolvePublicPaymentCapability(req.params.capability, 'receipt');
    paymentId = resolved.paymentId;
    const details = await getReceiptDetailsByPaymentId({ query }, paymentId);
    if (!details || details.status !== 'success') {
      await auditPublicPaymentAccess(paymentId, 'receipt', 'denied', res.locals.requestId);
      sendApiError(res, 404, 'RECEIPT_NOT_AVAILABLE', 'Receipt is not available.');
      return;
    }
    await auditPublicPaymentAccess(paymentId, 'receipt', 'success', res.locals.requestId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${details.receipt_number || 'receipt'}.pdf"`
    );
    res.send(buildReceiptPdf(details));
  } catch (err) {
    await auditPublicPaymentAccess(paymentId, 'receipt', 'denied', res.locals.requestId);
    handleError(res, err);
  }
}

export async function emailReceipt(req: AuthenticatedRequest, res: Response) {
  let paymentId: string | null = null;
  try {
    const resolved = await resolvePublicPaymentCapability(req.params.capability, 'receipt');
    paymentId = resolved.paymentId;
    const receipt = await queueVerifiedReceiptEmailByPaymentId(paymentId);
    if (!receipt) {
      await auditPublicPaymentAccess(paymentId, 'receipt_email', 'denied', res.locals.requestId);
      sendApiError(res, 404, 'RECEIPT_NOT_AVAILABLE', 'Receipt is not available.');
      return;
    }
    await auditPublicPaymentAccess(paymentId, 'receipt_email', 'success', res.locals.requestId);
    res.status(202).json({ receipt: { status: receipt.status, queued_at: receipt.created_at } });
  } catch (err) {
    await auditPublicPaymentAccess(paymentId, 'receipt_email', 'denied', res.locals.requestId);
    handleError(res, err);
  }
}

export async function adminDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    const workflowActor = {
      role: req.user?.role || '',
      doctorId: req.user?.role === 'doctor' ? req.user.doctor_id || undefined : undefined,
    };
    const [dashboard, needsAction] = await Promise.all([
      getAdminDashboard({ doctorId: workflowActor.doctorId }),
      getNeedsActionQueue(workflowActor),
    ]);
    const identityCount = Number(needsAction.counts.identity_reviews || 0);
    res.json({
      dashboard: {
        ...dashboard,
        role: req.user?.role === 'doctor' ? 'doctor' : 'administrator',
        needsAction: needsAction.data,
        metrics: { ...dashboard.metrics, identityReviews: identityCount },
        actionItems: [
          ...dashboard.actionItems,
          ...(identityCount
            ? [
                {
                  id: 'identity-reviews',
                  label: 'Duplicate patient reviews',
                  count: identityCount,
                  href: '/admin/patients/identity-reviews',
                  priority: 'high',
                },
              ]
            : []),
        ],
      },
    });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminWorkflowSearch(req: AuthenticatedRequest, res: Response) {
  try {
    res.json(
      await searchAdminWorkflow(String(req.query.q), {
        role: req.user?.role || '',
        doctorId: req.user?.role === 'doctor' ? req.user.doctor_id || undefined : undefined,
      })
    );
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminNeedsAction(req: AuthenticatedRequest, res: Response) {
  try {
    res.json(
      await getNeedsActionQueue({
        role: req.user?.role || '',
        doctorId: req.user?.role === 'doctor' ? req.user.doctor_id || undefined : undefined,
      })
    );
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminWorkItemDetail(req: AuthenticatedRequest, res: Response) {
  try {
    res.json({
      workItem: await getWorkItemDetail(req.params.type, req.params.id, {
        role: req.user?.role || '',
        doctorId: req.user?.role === 'doctor' ? req.user.doctor_id || undefined : undefined,
      }),
    });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminWorkerHealth(_req: AuthenticatedRequest, res: Response) {
  try {
    res.json({ worker: await new PostgresWorkerLeaseStore().health() });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminObservability(_req: AuthenticatedRequest, res: Response) {
  try {
    res.setHeader('cache-control', 'no-store');
    res.json({ observability: await operationalSnapshot() });
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
    res.json(
      await listAppointmentsPage({
        doctorId,
        status: req.query.status ? String(req.query.status) : undefined,
        source: req.query.source ? String(req.query.source) : undefined,
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        sort: req.query.sort ? String(req.query.sort) : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      })
    );
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
      source: req.query.source ? String(req.query.source) : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      sort: req.query.sort ? String(req.query.sort) : undefined,
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
    if (req.user?.role === 'doctor' && req.body.doctor_id !== req.user.doctor_id) {
      sendApiError(
        res,
        403,
        'DOCTOR_CALENDAR_SCOPE_DENIED',
        'Doctors may only change their own weekly schedule'
      );
      return;
    }
    res
      .status(201)
      .json({ rule: await createAvailabilityRule({ ...req.body, actor_staff_id: req.user?.id }) });
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

export async function adminCalendarView(req: AuthenticatedRequest, res: Response) {
  try {
    const doctorId =
      req.user?.role === 'doctor'
        ? req.user.doctor_id || undefined
        : req.query.doctor_id
          ? String(req.query.doctor_id)
          : undefined;

    if (!doctorId || !req.query.from || !req.query.to) {
      sendApiError(
        res,
        400,
        'CALENDAR_VIEW_PARAMS_REQUIRED',
        'doctor_id, from, and to are required'
      );
      return;
    }

    res.json({
      calendar: await getAdminCalendarView({
        doctorId,
        from: String(req.query.from),
        to: String(req.query.to),
      }),
    });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminCreateCalendarOverride(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role === 'doctor' && req.body.doctor_id !== req.user.doctor_id) {
      sendApiError(
        res,
        403,
        'DOCTOR_CALENDAR_SCOPE_DENIED',
        'Doctors may only change their own calendar'
      );
      return;
    }
    res.status(201).json({ override: await createCalendarOverride(req.body) });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminCreateCalendarOverridesBatch(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role === 'doctor' && req.body.doctor_id !== req.user.doctor_id) {
      sendApiError(
        res,
        403,
        'DOCTOR_CALENDAR_SCOPE_DENIED',
        'Doctors may only change their own calendar'
      );
      return;
    }
    const result = await createCalendarOverridesBatch({
      ...req.body,
      actor_staff_id: req.user?.id,
    });
    res.status(result.requiresResolution ? 202 : 201).json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminDeleteCalendarOverride(req: AuthenticatedRequest, res: Response) {
  try {
    res.json({
      override: await deleteCalendarOverride(
        req.params.id,
        Number(req.query.expected_version),
        req.user?.id,
        req.user?.role === 'doctor' ? req.user.doctor_id || undefined : undefined
      ),
    });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminScheduleConflictCase(req: AuthenticatedRequest, res: Response) {
  try {
    const conflictCase = await getScheduleConflictCase(
      req.params.id,
      req.user?.role === 'doctor' ? req.user.doctor_id || undefined : undefined
    );
    if (!conflictCase) {
      sendApiError(res, 404, 'SCHEDULE_CONFLICT_NOT_FOUND', 'Schedule conflict case not found');
      return;
    }
    res.json({ conflictCase });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminResolveScheduleConflict(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role === 'doctor') {
      res.status(403).json({ error: 'Doctor users cannot resolve schedule conflicts' });
      return;
    }
    const conflictCase = await recordScheduleConflictResolutions({
      caseId: req.params.id,
      resolutions: req.body.resolutions,
      actorStaffId: req.user?.id,
    });
    res.json({ conflictCase });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminApplyScheduleConflict(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role === 'doctor') {
      res.status(403).json({ error: 'Doctor users cannot apply schedule conflicts' });
      return;
    }
    const result = await applyScheduleConflictCase({
      caseId: req.params.id,
      expectedVersion: req.body.expected_version,
      actorStaffId: req.user?.id,
    });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminTransitionAppointment(req: AuthenticatedRequest, res: Response) {
  try {
    const actorStaffId = req.user?.id;
    const idempotencyKey = req.header('idempotency-key');
    if (!actorStaffId) {
      sendApiError(res, 401, 'UNAUTHORIZED', 'Administrator authentication is required.');
      return;
    }
    if (!idempotencyKey) {
      sendApiError(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
      return;
    }
    const appointment = await transitionAppointment({
      appointmentId: req.params.id,
      action: req.body.action,
      expectedVersion: req.body.expected_version,
      reason: req.body.reason,
      evidence: req.body.evidence,
      actorStaffId,
      idempotencyKey,
    });
    res.json({ appointment });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminRescheduleAppointment(req: AuthenticatedRequest, res: Response) {
  try {
    const actorStaffId = req.user?.id;
    const idempotencyKey = req.header('idempotency-key');
    if (!actorStaffId) {
      sendApiError(res, 401, 'UNAUTHORIZED', 'Administrator authentication is required.');
      return;
    }
    if (!idempotencyKey) {
      sendApiError(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
      return;
    }
    const appointment = await rescheduleAppointment({
      appointmentId: req.params.id,
      doctorId: req.body.doctor_id,
      appointmentDate: req.body.appointment_date,
      startTime: req.body.start_time,
      expectedVersion: req.body.expected_version,
      reason: req.body.reason,
      cancelIfUnavailable: req.body.cancel_if_unavailable,
      actorStaffId,
      idempotencyKey,
    });
    res.json({ appointment });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminOrders(_req: AuthenticatedRequest, res: Response) {
  try {
    const req = _req;
    res.json(
      await listPackageOrders({
        status: req.query.status ? String(req.query.status) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        cursor: req.query.cursor ? String(req.query.cursor) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      })
    );
  } catch (err) {
    handleError(res, err);
  }
}

function packageOrderCommandContext(req: AuthenticatedRequest) {
  const actorStaffId = req.user?.id;
  const idempotencyKey = req.header('idempotency-key');
  if (!actorStaffId)
    throw new AppError(401, 'UNAUTHORIZED', 'Administrator authentication is required.');
  if (!idempotencyKey)
    throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required.');
  return { actorStaffId, idempotencyKey };
}

export async function adminOrderDetail(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await getPackageOrderDetail(req.params.id);
    if (!result) {
      sendApiError(res, 404, 'PACKAGE_ORDER_NOT_FOUND', 'Order not found.');
      return;
    }
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminTransitionOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const context = packageOrderCommandContext(req);
    const order = await transitionPackageOrder({
      orderId: req.params.id,
      action: req.body.action,
      expectedVersion: req.body.expected_version,
      reason: req.body.reason,
      scheduledFor: req.body.scheduled_for,
      fulfilmentNotes: req.body.fulfilment_notes,
      ...context,
    });
    res.json({ order });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminAssignOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const context = packageOrderCommandContext(req);
    const order = await assignPackageOrder({
      orderId: req.params.id,
      expectedVersion: req.body.expected_version,
      dueAt: req.body.due_at,
      reason: req.body.reason,
      ...context,
    });
    res.json({ order });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminConfirmOrderPrice(req: AuthenticatedRequest, res: Response) {
  try {
    const context = packageOrderCommandContext(req);
    const order = await confirmPackageOrderPrice({
      orderId: req.params.id,
      expectedVersion: req.body.expected_version,
      reason: req.body.reason,
      items: req.body.items,
      ...context,
    });
    res.json({ order });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminPayments(_req: AuthenticatedRequest, res: Response) {
  try {
    const req = _req;
    const result = await listPayments({
      status: req.query.status ? String(req.query.status) : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      provider: req.query.provider ? String(req.query.provider) : undefined,
      entity: req.query.entity
        ? (String(req.query.entity) as 'appointment' | 'package_order')
        : undefined,
      sort: req.query.sort ? (String(req.query.sort) as any) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminPaymentDetail(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await getAdminPaymentDetail(req.params.id);
    if (!result) {
      sendApiError(res, 404, 'PAYMENT_NOT_FOUND', 'Payment not found');
      return;
    }
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminPaymentReceipt(req: AuthenticatedRequest, res: Response) {
  try {
    const details = await getReceiptDetailsByPaymentId({ query }, req.params.id);
    if (!details || details.status !== 'success') {
      sendApiError(res, 404, 'RECEIPT_NOT_AVAILABLE', 'Receipt is not available.');
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

export async function adminPaymentRecheck(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await recheckAdminPayment(req.params.id, req.user?.id);
    if (!result) {
      sendApiError(res, 404, 'PAYMENT_NOT_FOUND', 'Payment not found');
      return;
    }
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminPaymentExceptions(req: AuthenticatedRequest, res: Response) {
  try {
    res.json({
      exceptions: await listPaymentExceptions(
        String(req.query.status || 'open'),
        Number(req.query.limit || 50)
      ),
    });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminPaymentRefundRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const idempotencyKey = req.header('idempotency-key');
    if (!idempotencyKey) {
      sendApiError(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key is required');
      return;
    }
    if (!req.user?.id) {
      sendApiError(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      return;
    }
    const refund = await requestPaymentRefund({
      paymentId: req.params.id,
      amount: req.body.amount,
      reason: req.body.reason,
      idempotencyKey,
      actorStaffId: req.user.id,
    });
    res.status(202).json({
      refund,
      message: 'Refund request recorded for independent approval and provider processing.',
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
      provider: req.query.provider ? String(req.query.provider) : undefined,
      entity: req.query.entity
        ? (String(req.query.entity) as 'appointment' | 'package_order')
        : undefined,
      sort: req.query.sort ? (String(req.query.sort) as any) : undefined,
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
    const req = _req;
    res.json(
      await listNotificationOutbox({
        status: req.query.status ? String(req.query.status) : undefined,
        channel: req.query.channel ? String(req.query.channel) : undefined,
        entity: req.query.entity
          ? (String(req.query.entity) as 'appointment' | 'package_order' | 'payment')
          : undefined,
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        sort: req.query.sort ? (String(req.query.sort) as any) : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      })
    );
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminNotificationDetail(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await getNotificationDetail(req.params.id);
    if (!result) {
      sendApiError(res, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
      return;
    }
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminRetryNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const notification = await retryNotification(req.params.id, req.user?.id);
    if (!notification) {
      sendApiError(res, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
      return;
    }
    res.json({ notification });
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminBulkRetryNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    res.json(await bulkRetryNotifications(req.body.ids || [], req.user?.id));
  } catch (err) {
    handleError(res, err);
  }
}

export async function adminDeadLetterNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const notification = await deadLetterNotification(req.params.id, req.body.reason, req.user?.id);
    if (!notification) {
      sendApiError(res, 404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
      return;
    }
    res.json({ notification });
  } catch (err) {
    handleError(res, err);
  }
}
