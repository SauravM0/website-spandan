import type { Request, Response } from 'express';
import { createCustomTestOrder, listDiagnosticTests } from '../services/diagnosticTests';
import { sendApiError } from '../utils/errors';

function handleError(res: Response, err: unknown) {
  const error = err as Error & { status?: number; code?: string };
  sendApiError(
    res,
    error.status || 500,
    error.code || 'DIAGNOSTIC_TEST_REQUEST_FAILED',
    error.status ? error.message : 'The diagnostic test request could not be completed'
  );
}

export async function catalog(req: Request, res: Response) {
  try {
    const result = await listDiagnosticTests({
      search: req.query.search ? String(req.query.search) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
    });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function createOrder(req: Request, res: Response) {
  try {
    const order = await createCustomTestOrder({
      ...req.body,
      idempotency_key: req.header('idempotency-key') || undefined,
    });
    res.status(order.replayed ? 200 : 201).json({
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        price_status: order.price_status,
        total_amount: Number(order.total_amount || 0),
        test_count: Number(order.test_count || 0),
        payment_required: Boolean(order.payment_required),
      },
      message: order.payment_required
        ? 'Your test order is ready for payment.'
        : 'Your test request was submitted. The clinic will confirm pricing and preparation.',
    });
  } catch (err) {
    handleError(res, err);
  }
}
