import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateZod } from '../middleware/validate';
import * as controller from '../controllers/operationsController';
import {
  adminAppointmentFiltersSchema,
  adminPaymentFiltersSchema,
  appointmentConfigSchema,
} from '../utils/validation';

const router = Router();

router.use(authenticate);
router.get('/dashboard', controller.adminDashboard);
router.get('/dashboard/today', controller.adminDashboard);
router.get('/appointment-settings', controller.adminAppointmentSettings);
router.patch(
  '/appointment-settings',
  validateZod({ body: appointmentConfigSchema }),
  controller.adminUpdateAppointmentSettings
);
router.get(
  '/appointments',
  validateZod({ query: adminAppointmentFiltersSchema }),
  controller.adminAppointments
);
router.get(
  '/appointments/export',
  validateZod({ query: adminAppointmentFiltersSchema }),
  controller.adminAppointmentsExport
);
router.post('/appointments', controller.bookAppointment);
router.patch('/appointments/:id/status', controller.adminUpdateAppointmentStatus);
router.get('/availability-rules', controller.adminAvailabilityRules);
router.post('/availability-rules', controller.adminCreateAvailabilityRule);
router.get('/calendar-overrides', controller.adminCalendarOverrides);
router.post('/calendar-overrides', controller.adminCreateCalendarOverride);
router.delete('/calendar-overrides/:id', controller.adminDeleteCalendarOverride);
router.get('/package-orders', controller.adminOrders);
router.get('/payments', validateZod({ query: adminPaymentFiltersSchema }), controller.adminPayments);
router.get(
  '/payments/export',
  validateZod({ query: adminPaymentFiltersSchema }),
  controller.adminPaymentsExport
);
router.get('/notifications', controller.adminNotifications);
router.post('/notifications/:id/retry', controller.adminRetryNotification);

export default router;
