import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateZod } from '../middleware/validate';
import * as controller from '../controllers/operationsController';
import { requirePermission } from '../middleware/authorize';
import { PERMISSIONS } from '../security/permissions';
import { auditAccess } from '../middleware/auditAccess';
import {
  adminAppointmentFiltersSchema,
  adminCalendarViewQuerySchema,
  adminNotificationBulkRetrySchema,
  adminNotificationDeadLetterSchema,
  adminNotificationFiltersSchema,
  adminNotificationParamsSchema,
  adminPaymentParamsSchema,
  adminPaymentFiltersSchema,
  adminPaymentRefundSchema,
  adminPaymentExceptionFiltersSchema,
  adminPackageOrderFiltersSchema,
  appointmentConfigSchema,
  calendarOverrideBatchSchema,
  calendarOverrideDeleteQuerySchema,
  scheduleConflictApplySchema,
  scheduleConflictParamsSchema,
  scheduleConflictResolutionSchema,
  availabilityRuleWriteSchema,
  billableServiceCreateSchema,
  billableServiceUpdateSchema,
  billableServiceParamsSchema,
} from '../utils/validation';

const router = Router();

router.use(authenticate);
router.get('/dashboard', requirePermission(PERMISSIONS.DASHBOARD_READ), asyncHandler(controller.adminDashboard));
router.get('/dashboard/today', requirePermission(PERMISSIONS.DASHBOARD_READ), asyncHandler(controller.adminDashboard));
router.get('/calendar-view', requirePermission(PERMISSIONS.CALENDAR_READ), validateZod({ query: adminCalendarViewQuerySchema }), asyncHandler(controller.adminCalendarView));
router.get('/appointment-settings', requirePermission(PERMISSIONS.CALENDAR_READ), asyncHandler(controller.adminAppointmentSettings));
router.patch(
  '/appointment-settings',
  requirePermission(PERMISSIONS.CALENDAR_WRITE),
  validateZod({ body: appointmentConfigSchema }),
  asyncHandler(controller.adminUpdateAppointmentSettings)
);
router.get(
  '/appointments',
  requirePermission(PERMISSIONS.APPOINTMENTS_READ),
  validateZod({ query: adminAppointmentFiltersSchema }),
  asyncHandler(controller.adminAppointments)
);
router.get(
  '/appointments/export',
  requirePermission(PERMISSIONS.EXPORT_SENSITIVE),
  auditAccess('appointments.export', 'appointment'),
  validateZod({ query: adminAppointmentFiltersSchema }),
  asyncHandler(controller.adminAppointmentsExport)
);
router.post('/appointments', requirePermission(PERMISSIONS.APPOINTMENTS_WRITE), asyncHandler(controller.bookAppointment));
router.patch('/appointments/:id/status', requirePermission(PERMISSIONS.APPOINTMENTS_WRITE), asyncHandler(controller.adminUpdateAppointmentStatus));
router.get('/availability-rules', requirePermission(PERMISSIONS.CALENDAR_READ), asyncHandler(controller.adminAvailabilityRules));
router.post(
  '/availability-rules',
  requirePermission(PERMISSIONS.CALENDAR_WRITE),
  validateZod({ body: availabilityRuleWriteSchema }),
  asyncHandler(controller.adminCreateAvailabilityRule)
);
router.get('/calendar-overrides', requirePermission(PERMISSIONS.CALENDAR_READ), asyncHandler(controller.adminCalendarOverrides));
router.post(
  '/calendar-overrides/batch',
  requirePermission(PERMISSIONS.CALENDAR_WRITE),
  validateZod({ body: calendarOverrideBatchSchema }),
  asyncHandler(controller.adminCreateCalendarOverridesBatch)
);
router.delete(
  '/calendar-overrides/:id',
  requirePermission(PERMISSIONS.CALENDAR_WRITE),
  validateZod({ query: calendarOverrideDeleteQuerySchema }),
  asyncHandler(controller.adminDeleteCalendarOverride)
);
router.get(
  '/schedule-conflicts/:id',
  requirePermission(PERMISSIONS.CALENDAR_READ),
  validateZod({ params: scheduleConflictParamsSchema }),
  asyncHandler(controller.adminScheduleConflictCase)
);
router.post(
  '/schedule-conflicts/:id/resolutions',
  requirePermission(PERMISSIONS.CALENDAR_WRITE),
  validateZod({ params: scheduleConflictParamsSchema, body: scheduleConflictResolutionSchema }),
  asyncHandler(controller.adminResolveScheduleConflict)
);
router.post(
  '/schedule-conflicts/:id/apply',
  requirePermission(PERMISSIONS.CALENDAR_WRITE),
  validateZod({ params: scheduleConflictParamsSchema, body: scheduleConflictApplySchema }),
  asyncHandler(controller.adminApplyScheduleConflict)
);
router.get(
  '/package-orders',
  requirePermission(PERMISSIONS.PACKAGE_ORDERS_READ),
  validateZod({ query: adminPackageOrderFiltersSchema }),
  asyncHandler(controller.adminOrders)
);
router.get('/payments', requirePermission(PERMISSIONS.PAYMENTS_READ), validateZod({ query: adminPaymentFiltersSchema }), asyncHandler(controller.adminPayments));
router.get('/service-pricing', requirePermission(PERMISSIONS.PRICING_READ), asyncHandler(controller.adminBillableServices));
router.post('/service-pricing', requirePermission(PERMISSIONS.PRICING_WRITE), validateZod({ body: billableServiceCreateSchema }), asyncHandler(controller.adminCreateBillableService));
router.patch('/service-pricing/:id', requirePermission(PERMISSIONS.PRICING_WRITE), validateZod({ params: billableServiceParamsSchema, body: billableServiceUpdateSchema }), asyncHandler(controller.adminUpdateBillableService));
router.get('/payment-exceptions', requirePermission(PERMISSIONS.PAYMENTS_READ), validateZod({ query: adminPaymentExceptionFiltersSchema }), asyncHandler(controller.adminPaymentExceptions));
router.get(
  '/payments/export',
  requirePermission(PERMISSIONS.EXPORT_SENSITIVE),
  auditAccess('payments.export', 'payment'),
  validateZod({ query: adminPaymentFiltersSchema }),
  asyncHandler(controller.adminPaymentsExport)
);
router.get(
  '/payments/:id',
  requirePermission(PERMISSIONS.PAYMENTS_READ),
  auditAccess('payment.sensitive_read', 'payment'),
  validateZod({ params: adminPaymentParamsSchema }),
  asyncHandler(controller.adminPaymentDetail)
);
router.post(
  '/payments/:id/recheck',
  requirePermission(PERMISSIONS.PAYMENTS_RECHECK),
  validateZod({ params: adminPaymentParamsSchema }),
  asyncHandler(controller.adminPaymentRecheck)
);
router.post(
  '/payments/:id/refunds',
  requirePermission(PERMISSIONS.PAYMENTS_REFUND),
  validateZod({ params: adminPaymentParamsSchema, body: adminPaymentRefundSchema }),
  asyncHandler(controller.adminPaymentRefundRequest)
);
router.get('/notifications', requirePermission(PERMISSIONS.NOTIFICATIONS_READ), validateZod({ query: adminNotificationFiltersSchema }), asyncHandler(controller.adminNotifications));
router.post(
  '/notifications/bulk-retry',
  requirePermission(PERMISSIONS.NOTIFICATIONS_WRITE),
  validateZod({ body: adminNotificationBulkRetrySchema }),
  asyncHandler(controller.adminBulkRetryNotifications)
);
router.get(
  '/notifications/:id',
  requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
  validateZod({ params: adminNotificationParamsSchema }),
  asyncHandler(controller.adminNotificationDetail)
);
router.post(
  '/notifications/:id/retry',
  requirePermission(PERMISSIONS.NOTIFICATIONS_WRITE),
  validateZod({ params: adminNotificationParamsSchema }),
  asyncHandler(controller.adminRetryNotification)
);
router.post(
  '/notifications/:id/dead-letter',
  requirePermission(PERMISSIONS.NOTIFICATIONS_WRITE),
  validateZod({ params: adminNotificationParamsSchema, body: adminNotificationDeadLetterSchema }),
  asyncHandler(controller.adminDeadLetterNotification)
);

export default router;
