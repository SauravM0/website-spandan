import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { validateZod } from '../middleware/validate';
import * as controller from '../controllers/operationsController';
import {
  appointmentSchema,
  availabilityQuerySchema,
  doctorAvailabilityParamsSchema,
  packageOrderSchema,
  paymentCreateSchema,
  slotHoldSchema,
} from '../utils/validation';
import { z } from 'zod';

const router = Router();

const idParams = z.object({ id: z.string().uuid() });
const holdPaymentParams = z.object({ holdId: z.string().uuid() });
const transactionParams = z.object({ transactionId: z.string().min(1).max(120) });

router.get('/appointments/slots', validateZod({ query: availabilityQuerySchema }), controller.getSlots);
router.post('/appointments/holds', validateZod({ body: slotHoldSchema }), controller.holdSlot);
router.post('/appointments', optionalAuth, validateZod({ body: appointmentSchema }), controller.bookAppointment);
router.get('/package-orders/catalog', controller.packageCatalog);
router.post('/package-orders', validateZod({ body: packageOrderSchema }), controller.createOrder);
router.post('/payments/create', validateZod({ body: paymentCreateSchema }), controller.startPayment);
router.post('/payments/webhook', controller.paymentWebhook);
router.get('/payments/:transactionId/status', validateZod({ params: transactionParams }), controller.paymentStatus);
router.get('/payments/:transactionId/receipt', validateZod({ params: transactionParams }), controller.receipt);

router.get('/public/doctors/:id/availability', validateZod({ params: doctorAvailabilityParamsSchema, query: availabilityQuerySchema }), controller.getPublicDoctorAvailability);
router.post('/public/appointment-holds', validateZod({ body: slotHoldSchema }), controller.holdSlot);
router.get('/public/appointment-holds/:id', validateZod({ params: idParams }), controller.getHold);
router.post('/public/appointments/:holdId/payment', validateZod({ params: holdPaymentParams }), controller.startAppointmentPayment);
router.post('/public/orders', validateZod({ body: packageOrderSchema }), controller.createOrder);
router.post('/public/orders/:id/payment', validateZod({ params: idParams }), controller.startOrderPayment);
router.get('/public/checkout/:transactionId/status', validateZod({ params: transactionParams }), controller.paymentStatus);
router.get('/public/receipts/:transactionId', validateZod({ params: transactionParams }), controller.receipt);
router.post('/public/receipts/:id/email', validateZod({ params: idParams }), controller.emailReceipt);
router.post('/webhooks/phonepe', controller.paymentWebhook);
router.get('/payments/return', controller.paymentReturn);

export default router;
