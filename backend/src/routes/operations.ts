import { Router } from 'express';
import { optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateZod } from '../middleware/validate';
import * as controller from '../controllers/operationsController';
import {
  appointmentSchema,
  availabilityQuerySchema,
  doctorAvailabilityParamsSchema,
  packageOrderSchema,
  packageQuoteSchema,
  paymentCreateSchema,
  slotHoldSchema,
} from '../utils/validation';
import { z } from 'zod';

const router = Router();

const idParams = z.object({ id: z.string().uuid() });
const holdPaymentParams = z.object({ holdId: z.string().uuid() });
const transactionParams = z.object({ transactionId: z.string().min(1).max(120) });

router.get('/appointments/slots', validateZod({ query: availabilityQuerySchema }), asyncHandler(controller.getSlots));
router.post('/appointments/holds', validateZod({ body: slotHoldSchema }), asyncHandler(controller.holdSlot));
router.post('/appointments', optionalAuth, validateZod({ body: appointmentSchema }), asyncHandler(controller.bookAppointment));
router.get('/package-orders/catalog', asyncHandler(controller.packageCatalog));
router.post('/package-orders/quote', validateZod({ body: packageQuoteSchema }), asyncHandler(controller.quoteOrder));
router.post('/package-orders', validateZod({ body: packageOrderSchema }), asyncHandler(controller.createOrder));
router.post('/payments/create', validateZod({ body: paymentCreateSchema }), asyncHandler(controller.startPayment));
router.post('/payments/webhook', asyncHandler(controller.paymentWebhook));
router.get('/payments/:transactionId/status', validateZod({ params: transactionParams }), asyncHandler(controller.paymentStatus));
router.get('/payments/:transactionId/receipt', validateZod({ params: transactionParams }), asyncHandler(controller.receipt));

router.get('/public/doctors/:id/availability', validateZod({ params: doctorAvailabilityParamsSchema, query: availabilityQuerySchema }), asyncHandler(controller.getPublicDoctorAvailability));
router.get('/public/appointments/config', asyncHandler(controller.publicAppointmentConfig));
router.post('/public/appointment-holds', validateZod({ body: slotHoldSchema }), asyncHandler(controller.holdSlot));
router.get('/public/appointment-holds/:id', validateZod({ params: idParams }), asyncHandler(controller.getHold));
router.post('/public/appointments/:holdId/payment', validateZod({ params: holdPaymentParams }), asyncHandler(controller.startAppointmentPayment));
router.post('/public/orders', validateZod({ body: packageOrderSchema }), asyncHandler(controller.createOrder));
router.post('/public/orders/quote', validateZod({ body: packageQuoteSchema }), asyncHandler(controller.quoteOrder));
router.post('/public/orders/:id/payment', validateZod({ params: idParams }), asyncHandler(controller.startOrderPayment));
router.get('/public/checkout/:transactionId/status', validateZod({ params: transactionParams }), asyncHandler(controller.paymentStatus));
router.get('/public/receipts/:transactionId', validateZod({ params: transactionParams }), asyncHandler(controller.receipt));
router.post('/public/receipts/:id/email', validateZod({ params: idParams }), asyncHandler(controller.emailReceipt));
router.post('/webhooks/phonepe', asyncHandler(controller.paymentWebhook));
router.get('/payments/return', asyncHandler(controller.paymentReturn));

export default router;
