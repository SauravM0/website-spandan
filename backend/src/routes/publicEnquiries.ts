import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as publicEnquiriesController from '../controllers/publicEnquiriesController';

const router = Router();

const enquiryLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Too many enquiries submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', enquiryLimiter, publicEnquiriesController.submitEnquiry);

export default router;
