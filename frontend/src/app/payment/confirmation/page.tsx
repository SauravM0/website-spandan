'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarPlus, Download, Mail, MapPin } from 'lucide-react';
import { emailReceipt, getBackendAssetUrl, getPaymentStatus } from '../../../lib/api';

export default function PaymentConfirmationPage() {
  return (
    <Suspense fallback={<section className="section"><div className="container">Checking payment status...</div></section>}>
      <PaymentConfirmationContent />
    </Suspense>
  );
}

function PaymentConfirmationContent() {
  const params = useSearchParams();
  const transaction = params.get('transaction') || '';
  const mock = params.get('mock');
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState('');

  useEffect(() => {
    if (!transaction) return;
    getPaymentStatus(transaction)
      .then((data) => setPayment(data.payment))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not verify payment'));
  }, [transaction]);

  const receiptUrl = getBackendAssetUrl(payment?.pdf_url);
  const successful = payment?.status === 'success' || payment?.status === 'successful';

  async function handleEmailReceipt() {
    if (!payment?.receipt_id) return;
    setEmailStatus('Queueing email...');
    try {
      const data = await emailReceipt(payment.receipt_id, email.trim() || undefined);
      const status = data.receipt?.status || 'queued';
      setEmailStatus(status === 'skipped_no_destination' ? 'Add an email address to send this receipt.' : 'Receipt email queued.');
      setPayment((current: any) => ({ ...current, notification_status: status }));
    } catch (err) {
      setEmailStatus(err instanceof Error ? err.message : 'Could not queue email');
    }
  }

  return (
    <section className="section">
      <div className="container max-w-[720px] text-center">
        <h1 className="text-3xl font-bold text-navy">{successful ? 'Payment verified' : 'Payment status'}</h1>
        {mock && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">PhonePe is not enabled in this environment. This is a safe local payment placeholder.</p>}
        {error && <p className="mt-4 text-danger">{error}</p>}
        {payment ? (
          <div className="mt-6 rounded-lg border border-border bg-white p-6 text-left shadow">
            <p><strong>Transaction:</strong> {payment.merchant_transaction_id}</p>
            <p><strong>Status:</strong> {payment.status}</p>
            <p><strong>Amount:</strong> Rs. {payment.amount}</p>
            {payment.receipt_number && <p><strong>Receipt:</strong> {payment.receipt_number}</p>}
            {receiptUrl && (
              <div className="mt-5 rounded-md border border-border p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <a className="btn btn-accent" href={receiptUrl}><Download size={18} /> Download PDF</a>
                  <button className="btn btn-outline" type="button" onClick={handleEmailReceipt}><Mail size={18} /> Email receipt</button>
                </div>
                <label className="form-group mt-4 mb-0">
                  <span>Email address for receipt</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Optional if already provided" type="email" />
                </label>
                <p className="mt-2 text-xs text-text-light">
                  Delivery: {String(payment.notification_status || 'queued').replace(/_/g, ' ')}
                  {emailStatus ? ` - ${emailStatus}` : ''}
                </p>
              </div>
            )}
            <div className="mt-5 grid gap-3 rounded-md bg-bg-alt p-4 text-sm text-text-light">
              <p className="flex gap-2"><MapPin className="shrink-0 text-accent" size={18} /> Spandan Super Speciality Clinic, Garkheda, Chhatrapati Sambhajinagar.</p>
              <p className="flex gap-2"><CalendarPlus className="shrink-0 text-accent" size={18} /> Please arrive 15 minutes early and carry any previous reports, current medicines, and ID if requested.</p>
            </div>
          </div>
        ) : !error ? (
          <p className="mt-5 text-text-light">Verifying payment with the clinic backend...</p>
        ) : null}
        <Link href="/" className="btn btn-outline mt-6">Back to home</Link>
      </div>
    </section>
  );
}
