import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateZod } from '../middleware/validate';
import * as controller from '../controllers/operationsController';
import {
  adminAppointmentFiltersSchema,
  adminCalendarViewQuerySchema,
  adminNotificationBulkRetrySchema,
  adminNotificationDeadLetterSchema,
  adminNotificationFiltersSchema,
  adminNotificationParamsSchema,
  adminPaymentParamsSchema,
  adminPaymentFiltersSchema,
  appointmentConfigSchema,
  calendarOverrideBatchSchema,
} from '../utils/validation';

const router = Router();

router.use(authenticate);
router.get('/dashboard', asyncHandler(controller.adminDashboard));
router.get('/dashboard/today', asyncHandler(controller.adminDashboard));
router.get('/calendar-view', validateZod({ query: adminCalendarViewQuerySchema }), asyncHandler(controller.adminCalendarView));
router.get('/appointment-settings', asyncHandler(controller.adminAppointmentSettings));
router.patch(
  '/appointment-settings',
  validateZod({ body: appointmentConfigSchema }),
  asyncHandler(controller.adminUpdateAppointmentSettings)
);
router.get(
  '/appointments',
  validateZod({ query: adminAppointmentFiltersSchema }),
  asyncHandler(controller.adminAppointments)
);
router.get(
  '/appointments/export',
  validateZod({ query: adminAppointmentFiltersSchema }),
  asyncHandler(controller.adminAppointmentsExport)
);
router.post('/appointments', asyncHandler(controller.bookAppointment));
router.patch('/appointments/:id/status', asyncHandler(controller.adminUpdateAppointmentStatus));
router.get('/availability-rules', asyncHandler(controller.adminAvailabilityRules));
router.post('/availability-rules', asyncHandler(controller.adminCreateAvailabilityRule));
router.get('/calendar-overrides', asyncHandler(controller.adminCalendarOverrides));
router.post('/calendar-overrides', asyncHandler(controller.adminCreateCalendarOverride));
router.post(
  '/calendar-overrides/batch',
  validateZod({ body: calendarOverrideBatchSchema }),
  asyncHandler(controller.adminCreateCalendarOverridesBatch)
);
router.delete('/calendar-overrides/:id', asyncHandler(controller.adminDeleteCalendarOverride));
router.get('/package-orders', asyncHandler(controller.adminOrders));
router.get('/payments', validateZod({ query: adminPaymentFiltersSchema }), asyncHandler(controller.adminPayments));
router.get(
  '/payments/export',
  validateZod({ query: adminPaymentFiltersSchema }),
  asyncHandler(controller.adminPaymentsExport)
);
router.get(
  '/payments/:id',
  validateZod({ params: adminPaymentParamsSchema }),
  asyncHandler(controller.adminPaymentDetail)
);
router.post(
  '/payments/:id/recheck',
  validateZod({ params: adminPaymentParamsSchema }),
  asyncHandler(controller.adminPaymentRecheck)
);
router.get('/notifications', validateZod({ query: adminNotificationFiltersSchema }), asyncHandler(controller.adminNotifications));
router.post(
  '/notifications/bulk-retry',
  validateZod({ body: adminNotificationBulkRetrySchema }),
  asyncHandler(controller.adminBulkRetryNotifications)
);
router.get(
  '/notifications/:id',
  validateZod({ params: adminNotificationParamsSchema }),
  asyncHandler(controller.adminNotificationDetail)
);
router.post(
  '/notifications/:id/retry',
  validateZod({ params: adminNotificationParamsSchema }),
  asyncHandler(controller.adminRetryNotification)
);
router.post(
  '/notifications/:id/dead-letter',
  validateZod({ params: adminNotificationParamsSchema, body: adminNotificationDeadLetterSchema }),
  asyncHandler(controller.adminDeadLetterNotification)
);

export default router;
