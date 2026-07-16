'use client';

import React, { Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Download,
  HelpCircle,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { clinicSettings } from '@/lib/settings';
import { emailReceipt, getBackendAssetUrl, getPaymentStatus } from '@/lib/api';

type PaymentViewState =
  'verifying' | 'pending' | 'success' | 'failed' | 'cancelled' | 'expired' | 'unknown' | 'error';

type PaymentModel = {
  status: string;
  amount: number;
  currency: string;
  updated_at: string;
  expires_at: string | null;
  receipt_available: boolean;
  receipt_number?: string | null;
  notification_status?: string | null;
};

type State = {
  status: PaymentViewState;
  payment: PaymentModel | null;
  error: string;
  pollCount: number;
};

type Action =
  | { type: 'START_VERIFY' }
  | { type: 'STATUS'; payment: PaymentModel; status: PaymentViewState }
  | { type: 'PENDING' }
  | { type: 'ERROR'; error: string }
  | { type: 'POLL_TICK' };

const MAX_POLLS = 8;
const BASE_POLL_MS = 2500;
const EMAIL_COOLDOWN_MS = 30_000;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_VERIFY':
      return { ...state, status: 'verifying', error: '', pollCount: 0 };
    case 'STATUS':
      return { ...state, status: action.status, payment: action.payment, error: '' };
    case 'PENDING':
      return { ...state, status: 'pending' };
    case 'ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'POLL_TICK':
      return { ...state, pollCount: state.pollCount + 1 };
    default:
      return state;
  }
}

function classifyStatus(rawStatus: unknown): PaymentViewState {
  const status = String(rawStatus || '').toLowerCase();
  if (['success', 'successful', 'completed', 'paid'].includes(status)) return 'success';
  if (['failed', 'failure', 'declined'].includes(status)) return 'failed';
  if (['cancelled', 'canceled'].includes(status)) return 'cancelled';
  if (['expired'].includes(status)) return 'expired';
  if (
    ['created', 'pending', 'payment_pending', 'verification_required', 'initiated'].includes(status)
  )
    return 'pending';
  return 'unknown';
}

function isTerminal(status: PaymentViewState) {
  return ['success', 'failed', 'cancelled', 'expired', 'unknown', 'error'].includes(status);
}

function supportReference(payment: PaymentModel | null) {
  return payment?.receipt_number || 'payment-confirmation';
}

function maskedReference(value: string | undefined | null) {
  if (!value) return '-';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function statusCopy(status: PaymentViewState) {
  if (status === 'success')
    return ['Payment verified', 'Your payment has been verified by the clinic system.'];
  if (status === 'pending' || status === 'verifying')
    return [
      'Payment verification in progress',
      'We are checking the latest provider and clinic status.',
    ];
  if (status === 'failed')
    return ['Payment failed', 'The payment provider did not complete this transaction.'];
  if (status === 'cancelled')
    return [
      'Payment cancelled',
      'The checkout appears to have been cancelled before successful payment.',
    ];
  if (status === 'expired')
    return ['Payment expired', 'The payment window expired before successful confirmation.'];
  if (status === 'unknown')
    return ['Payment status unclear', 'The clinic could not classify this payment status yet.'];
  return [
    'Could not verify payment',
    'Please use the support reference below when contacting the clinic.',
  ];
}

function PaymentStatusPanel({
  status,
  payment,
  onRefresh,
  polling,
}: {
  status: PaymentViewState;
  payment: PaymentModel | null;
  onRefresh: () => void;
  polling: boolean;
}) {
  const [title, description] = statusCopy(status);
  const Icon =
    status === 'success'
      ? CheckCircle2
      : status === 'pending' || status === 'verifying'
        ? Loader2
        : AlertTriangle;

  return (
    <div className="soft-card p-6 text-left" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon
          className={`${status === 'success' ? 'text-success' : status === 'pending' || status === 'verifying' ? 'animate-spin text-accent' : 'text-danger'} mt-1 shrink-0`}
          size={26}
          aria-hidden="true"
        />
        <div>
          <h1 className="text-2xl font-bold text-navy">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-light">{description}</p>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-blue-50/70 p-3">
          <dt className="font-semibold text-text-light">Receipt reference</dt>
          <dd className="mt-1 font-bold text-navy">{maskedReference(payment?.receipt_number)}</dd>
        </div>
        <div className="rounded-2xl bg-blue-50/70 p-3">
          <dt className="font-semibold text-text-light">Status</dt>
          <dd className="mt-1 font-bold capitalize text-navy">
            {String(payment?.status || status).replace(/_/g, ' ')}
          </dd>
        </div>
        <div className="rounded-2xl bg-blue-50/70 p-3">
          <dt className="font-semibold text-text-light">Amount</dt>
          <dd className="mt-1 font-bold text-navy">
            {payment ? `${payment.currency} ${payment.amount}` : '-'}
          </dd>
        </div>
        <div className="rounded-2xl bg-blue-50/70 p-3">
          <dt className="font-semibold text-text-light">Support reference</dt>
          <dd className="mt-1 font-bold text-navy">{maskedReference(supportReference(payment))}</dd>
        </div>
      </dl>

      {(status === 'pending' || status === 'unknown' || status === 'error') && (
        <button
          type="button"
          onClick={onRefresh}
          className="btn btn-outline mt-5"
          disabled={polling}
        >
          <RefreshCw size={16} className={polling ? 'animate-spin' : ''} aria-hidden="true" />
          Check again
        </button>
      )}
    </div>
  );
}

function ReceiptActions({
  payment,
  receiptCapability,
}: {
  payment: PaymentModel;
  receiptCapability: string;
}) {
  const [emailStatus, setEmailStatus] = useState('');
  const [lastSentAt, setLastSentAt] = useState(0);
  const receiptUrl = receiptCapability
    ? getBackendAssetUrl(`/api/public/receipts/${encodeURIComponent(receiptCapability)}`)
    : '';

  async function handleEmailReceipt() {
    if (!receiptCapability) return;
    if (Date.now() - lastSentAt < EMAIL_COOLDOWN_MS) {
      setEmailStatus('Please wait before requesting another receipt email.');
      return;
    }

    setEmailStatus('Queueing receipt email...');
    try {
      const data = await emailReceipt(receiptCapability);
      const status = data.receipt?.status || 'queued';
      setLastSentAt(Date.now());
      setEmailStatus(
        status === 'skipped_no_destination'
          ? 'No booking email is available.'
          : 'Receipt email queued to the booking email address.'
      );
    } catch (err) {
      setEmailStatus(err instanceof Error ? err.message : 'Could not queue email');
    }
  }

  if (!payment.receipt_available || !receiptUrl) {
    return (
      <div className="rounded-3xl bg-amber-50 p-5 text-sm text-amber-900 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.20)]">
        Receipt generation is still in progress. Please refresh after a short wait or contact the
        clinic with your support reference.
      </div>
    );
  }

  return (
    <div className="soft-card p-5 text-left">
      <h2 className="text-xl font-bold text-navy">Receipt</h2>
      {payment.receipt_number && (
        <p className="mt-2 text-sm text-text-light">
          Receipt number: <strong className="text-navy">{payment.receipt_number}</strong>
        </p>
      )}
      <div className="mt-5 flex flex-col gap-3 min-[420px]:flex-row">
        {receiptUrl && (
          <a className="btn btn-accent" href={receiptUrl}>
            <Download size={18} aria-hidden="true" />
            Download PDF
          </a>
        )}
        {payment.receipt_available && (
          <button className="btn btn-outline" type="button" onClick={handleEmailReceipt}>
            <Mail size={18} aria-hidden="true" />
            Email receipt
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-text-light">
        For privacy, email delivery uses only the address stored with the booking.
      </p>
      <p className="mt-2 text-xs text-text-light">
        Delivery: {String(payment.notification_status || 'queued').replace(/_/g, ' ')}
        {emailStatus ? ` - ${emailStatus}` : ''}
      </p>
    </div>
  );
}

function NextSteps({ status }: { status: PaymentViewState }) {
  const terminalProblem = ['failed', 'cancelled', 'expired', 'unknown', 'error'].includes(status);

  return (
    <div className="soft-card p-5 text-left">
      <h2 className="text-xl font-bold text-navy">Next steps</h2>
      {status === 'success' ? (
        <div className="mt-4 grid gap-3 text-sm text-text-light">
          <p className="flex gap-2">
            <MapPin className="shrink-0 text-accent" size={18} aria-hidden="true" />{' '}
            {clinicSettings.name}, {clinicSettings.city}.
          </p>
          <p className="flex gap-2">
            <CalendarPlus className="shrink-0 text-accent" size={18} aria-hidden="true" /> The
            clinic will coordinate any appointment, package timing, or preparation instructions.
          </p>
        </div>
      ) : status === 'pending' || status === 'verifying' ? (
        <p className="mt-3 flex gap-2 text-sm text-text-light">
          <Clock className="shrink-0 text-accent" size={18} aria-hidden="true" /> Keep this page
          open. You can refresh manually if the status does not update.
        </p>
      ) : terminalProblem ? (
        <div className="mt-4 grid gap-3 text-sm text-text-light">
          <p className="flex gap-2">
            <RotateCcw className="shrink-0 text-accent" size={18} aria-hidden="true" /> Retry from
            the relevant booking flow. A successful existing payment will not be duplicated by this
            page.
          </p>
          <Link href="/contact" className="btn btn-accent self-start">
            Contact Clinic
          </Link>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/contact" className="btn btn-outline btn-sm">
          <HelpCircle size={16} aria-hidden="true" />
          Contact Clinic
        </Link>
        <Link href="/" className="btn btn-outline btn-sm">
          Home
        </Link>
      </div>
    </div>
  );
}

export default function PaymentConfirmationPage() {
  return (
    <Suspense
      fallback={
        <section className="section">
          <div className="container">Checking payment status...</div>
        </section>
      }
    >
      <PaymentConfirmationContent />
    </Suspense>
  );
}

function PaymentConfirmationContent() {
  const params = useSearchParams();
  const statusCapability = params.get('status') || '';
  const receiptCapability = params.get('receipt') || '';
  const [state, dispatch] = useReducer(reducer, {
    status: statusCapability ? 'verifying' : 'error',
    payment: null,
    error: statusCapability ? '' : 'This payment access link is missing or invalid.',
    pollCount: 0,
  });
  const timeoutRef = useRef<number | null>(null);
  const [polling, setPolling] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!statusCapability) {
      dispatch({ type: 'ERROR', error: 'This payment access link is missing or invalid.' });
      return true;
    }

    setPolling(true);
    try {
      const data = await getPaymentStatus(statusCapability);
      const nextStatus = classifyStatus(data.payment?.status);
      dispatch({ type: 'STATUS', payment: data.payment, status: nextStatus });
      return isTerminal(nextStatus);
    } catch (err) {
      dispatch({
        type: 'ERROR',
        error: err instanceof Error ? err.message : 'Could not verify payment.',
      });
      return true;
    } finally {
      setPolling(false);
    }
  }, [statusCapability]);

  useEffect(() => {
    if (!statusCapability) return;
    let active = true;
    dispatch({ type: 'START_VERIFY' });

    const poll = async () => {
      if (!active || document.visibilityState === 'hidden') return;
      const done = await checkStatus();
      if (done || !active) return;
      dispatch({ type: 'POLL_TICK' });
    };

    poll();
    return () => {
      active = false;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [statusCapability, checkStatus]);

  useEffect(() => {
    if (
      isTerminal(state.status) ||
      state.pollCount >= MAX_POLLS ||
      document.visibilityState === 'hidden'
    ) {
      if (state.pollCount >= MAX_POLLS && state.status === 'pending') dispatch({ type: 'PENDING' });
      return;
    }
    const delay = Math.min(BASE_POLL_MS * 2 ** state.pollCount, 30_000);
    timeoutRef.current = window.setTimeout(() => {
      checkStatus();
      dispatch({ type: 'POLL_TICK' });
    }, delay);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [state.status, state.pollCount, checkStatus]);

  return (
    <section className="section">
      <div className="container max-w-[920px]">
        <div className="grid gap-6">
          <PaymentStatusPanel
            status={state.status}
            payment={state.payment}
            onRefresh={checkStatus}
            polling={polling}
          />

          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-danger">
              {state.error}
              <p className="mt-2 text-text-light">
                Support reference: {supportReference(state.payment)}
              </p>
            </div>
          )}

          {state.status === 'success' && state.payment && (
            <ReceiptActions payment={state.payment} receiptCapability={receiptCapability} />
          )}
          <NextSteps status={state.status} />
        </div>
      </div>
    </section>
  );
}
