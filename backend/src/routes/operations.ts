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
  bookingRecoverySchema,
} from '../utils/validation';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { requirePublicCommerceAccess } from '../middleware/publicRelease';

const router = Router();

const idParams = z.object({ id: z.string().uuid() });
const holdPaymentParams = z.object({ holdId: z.string().uuid() });
const capabilityParams = z.object({ capability: z.string().min(1).max(200) });
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const paymentStatusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const receiptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const receiptEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get(
  '/appointments/slots',
  validateZod({ query: availabilityQuerySchema }),
  asyncHandler(controller.getSlots)
);
router.post(
  '/appointments/holds',
  requirePublicCommerceAccess,
  validateZod({ body: slotHoldSchema }),
  asyncHandler(controller.holdSlot)
);
router.post(
  '/appointments',
  requirePublicCommerceAccess,
  optionalAuth,
  validateZod({ body: appointmentSchema }),
  asyncHandler(controller.bookAppointment)
);
router.get('/package-orders/catalog', asyncHandler(controller.packageCatalog));
router.post(
  '/package-orders/quote',
  validateZod({ body: packageQuoteSchema }),
  asyncHandler(controller.quoteOrder)
);
router.post(
  '/package-orders',
  requirePublicCommerceAccess,
  validateZod({ body: packageOrderSchema }),
  asyncHandler(controller.createOrder)
);
router.post(
  '/payments/create',
  requirePublicCommerceAccess,
  validateZod({ body: paymentCreateSchema }),
  asyncHandler(controller.startPayment)
);

router.get(
  '/public/doctors/:id/availability',
  validateZod({ params: doctorAvailabilityParamsSchema, query: availabilityQuerySchema }),
  asyncHandler(controller.getPublicDoctorAvailability)
);
router.get('/public/appointments/config', asyncHandler(controller.publicAppointmentConfig));
router.post(
  '/public/appointment-holds',
  requirePublicCommerceAccess,
  validateZod({ body: slotHoldSchema }),
  asyncHandler(controller.holdSlot)
);
router.get(
  '/public/appointment-holds/:id',
  validateZod({ params: idParams }),
  asyncHandler(controller.getHold)
);
router.post(
  '/public/appointments/recover',
  recoveryLimiter,
  validateZod({ body: bookingRecoverySchema }),
  asyncHandler(controller.recoverAppointment)
);
router.post(
  '/public/appointments/:holdId/payment',
  requirePublicCommerceAccess,
  validateZod({ params: holdPaymentParams }),
  asyncHandler(controller.startAppointmentPayment)
);
router.post(
  '/public/orders',
  requirePublicCommerceAccess,
  validateZod({ body: packageOrderSchema }),
  asyncHandler(controller.createOrder)
);
router.post(
  '/public/orders/quote',
  validateZod({ body: packageQuoteSchema }),
  asyncHandler(controller.quoteOrder)
);
router.post(
  '/public/orders/:id/payment',
  requirePublicCommerceAccess,
  validateZod({ params: idParams }),
  asyncHandler(controller.startOrderPayment)
);
router.get(
  '/public/payments/status/:capability',
  paymentStatusLimiter,
  validateZod({ params: capabilityParams }),
  asyncHandler(controller.paymentStatus)
);
router.get(
  '/public/receipts/:capability',
  receiptLimiter,
  validateZod({ params: capabilityParams }),
  asyncHandler(controller.receipt)
);
router.post(
  '/public/receipts/:capability/email',
  receiptEmailLimiter,
  validateZod({ params: capabilityParams }),
  asyncHandler(controller.emailReceipt)
);
router.post('/webhooks/phonepe', asyncHandler(controller.paymentWebhook));

export default router;
