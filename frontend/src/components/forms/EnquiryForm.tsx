'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitEnquiry } from '../../lib/api';
import FormFields from './FormFields';
import ConsentCheckbox from './ConsentCheckbox';
import '../../lib/i18n';

interface EnquiryFormProps {
  packageId?: string;
  packageName?: string;
  doctorId?: string;
  doctorName?: string;
  enquiryType?: 'general' | 'package' | 'doctor';
}

export default function EnquiryForm({
  packageId,
  packageName,
  doctorId,
  doctorName,
  enquiryType = 'general',
}: EnquiryFormProps) {
  const { t, i18n } = useTranslation('common');
  const formTitle = enquiryType === 'package'
    ? 'Package Enquiry'
    : enquiryType === 'doctor'
      ? 'Doctor Consultation'
      : 'General Enquiry';
  const formIntro = enquiryType === 'package'
    ? 'Share your details and our team will help you with this health package.'
    : enquiryType === 'doctor'
      ? 'Share your details and preferred time for a doctor consultation.'
      : 'Share your details and our clinic team will call you back.';
  const successMessage = enquiryType === 'package'
    ? 'Your package enquiry has been received. Our clinic team will call you within 24 hours.'
    : enquiryType === 'doctor'
      ? 'Your consultation request has been received. Our clinic team will call you within 24 hours.'
      : 'Your enquiry has been received. Our clinic team will call you within 24 hours.';
  const sourceLanguage = ['en', 'hi', 'mr'].includes(i18n.language)
    ? i18n.language
    : i18n.language.split('-')[0];
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [form, setForm] = useState({
    patient_name: '',
    phone: '',
    email: '',
    preferred_date: '',
    preferred_time_window: '',
    referring_doctor_name: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('Please consent to being contacted');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const language = ['en', 'hi', 'mr'].includes(sourceLanguage) ? sourceLanguage : 'en';
      const res = await submitEnquiry({
        patient_name: form.patient_name,
        phone: form.phone,
        email: form.email || undefined,
        package_id: packageId,
        doctor_id: doctorId,
        message: form.message || undefined,
        preferred_time_window: form.preferred_time_window || undefined,
        preferred_date: form.preferred_date || undefined,
        referring_doctor_name: form.referring_doctor_name || undefined,
        consent,
        language,
        source_language: language,
      });
      setReferenceId(res.enquiry?.reference_id || res.reference_id || '');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form_error'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-[600px] mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
        <div className="text-[#059669] mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-[#059669] mb-2">{t('form_success')}</h3>
        {referenceId && (
          <p className="text-text-light mb-2">Your Reference ID: <strong className="text-navy">{referenceId}</strong></p>
        )}
        <p className="text-sm text-text-light">
          {successMessage} Please keep your phone handy.
          {enquiryType === 'package' ? ' Please arrive on an empty stomach (8-10 hours fasting) if your selected tests require it.' : ''}
        </p>
        <a
          href="https://wa.me/917798095795"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center justify-center rounded-md bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1fb357] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
        >
          Save our WhatsApp number
        </a>
      </div>
    );
  }

  return (
    <form className="max-w-[600px] mx-auto bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-navy">{formTitle}</h3>
        <p className="mt-2 text-sm text-text-light">{formIntro}</p>
      </div>
      {(packageName || doctorName) && (
        <div className="mb-5 rounded-lg border border-border bg-bg-alt p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-light">
            {enquiryType === 'package' ? 'Selected package' : 'Selected doctor'}
          </p>
          <p className="mt-1 font-bold text-navy">{packageName || doctorName}</p>
        </div>
      )}
      <FormFields form={form} onChange={handleChange} />
      <ConsentCheckbox checked={consent} onChange={setConsent} />
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <button
        type="submit"
        className="btn bg-accent text-white w-full justify-center hover:bg-accent-light disabled:opacity-50"
        disabled={loading}
      >
        {loading ? '...' : t('form_submit')}
      </button>
    </form>
  );
}
