'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CreditCard,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import {
  ApiError,
  bookAppointment,
  createAppointmentHold,
  createPayment,
  getAppointmentSlots,
  getDoctorAvailability,
  getDoctors,
  getPublicAppointmentConfig,
  type PublicAppointmentConfig,
} from '@/lib/api';
import { useBookingReducer } from '@/components/booking/BookingReducer';
import type { BookingStep } from '@/components/booking/BookingReducer';
import SlotCalendar from '@/components/booking/SlotCalendar';
import PatientForm, { usePatientValidation } from '@/components/booking/PatientForm';
import { clinicToday } from '@/lib/timezone';

const FALLBACK_CONSULTATION_FEE = 700;

function formatTime(value: string) {
  return value ? value.slice(0, 5) : '';
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '').replace(/^0(?=[6-9]\d{9}$)/, '');
}

function formatError(err: unknown) {
  if (err instanceof ApiError && err.fieldErrors) {
    return Object.values(err.fieldErrors).flat().join(' ');
  }
  return err instanceof Error ? err.message : 'Booking failed';
}

const steps: { label: string; step: BookingStep }[] = [
  { label: 'Type', step: 1 },
  { label: 'Doctor', step: 2 },
  { label: 'Slot', step: 3 },
  { label: 'Patient', step: 4 },
  { label: 'Review', step: 5 },
];

function money(value: number | undefined) {
  return `Rs. ${Number(value || FALLBACK_CONSULTATION_FEE).toLocaleString('en-IN')}`;
}

function HoldTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = React.useState('');

  React.useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining('Expired');
        return;
      }
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      setRemaining(`${minutes}:${String(seconds).padStart(2, '0')}`);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return <span>{remaining}</span>;
}

export default function BookAppointmentPage() {
  const [state, dispatch] = useBookingReducer();
  const { form, step, calendarMonth, loading, error, phase, hold, recoveryReference } = state;
  const [bookingConfig, setBookingConfig] = React.useState<PublicAppointmentConfig | null>(null);

  useEffect(() => {
    getDoctors()
      .then((data) => {
        const doctors = data.doctors || [];
        const requestedDoctor = new URLSearchParams(window.location.search).get('doctor');
        const matchedDoctor = requestedDoctor
          ? doctors.find((doctor: any) => doctor.id === requestedDoctor || doctor.slug === requestedDoctor)
          : null;
        if (matchedDoctor) {
          dispatch({ type: 'SET_DOCTOR_ID', id: matchedDoctor.id });
        } else if (doctors.length > 0 && !form.doctor_id) {
          dispatch({ type: 'SET_DOCTOR_ID', id: doctors[0].id });
        }
      })
      .catch(() => dispatch({ type: 'SET_ERROR', error: 'Could not load doctors.' }));
  }, []);

  const [slots, setSlots] = React.useState<any[]>([]);
  const [monthAvailability, setMonthAvailability] = React.useState<Record<string, any[]>>({});
  const [doctorList, setDoctorList] = React.useState<any[]>([]);

  useEffect(() => {
    getDoctors().then((d) => setDoctorList(d.doctors || [])).catch(() => {});
    getPublicAppointmentConfig()
      .then((data) => setBookingConfig(data.config))
      .catch(() => dispatch({ type: 'SET_ERROR', error: 'Could not load appointment policy and fee.' }));
  }, []);

  useEffect(() => {
    if (!form.doctor_id || !form.appointment_date) return;
    getAppointmentSlots(form.doctor_id, form.appointment_date)
      .then((data) => setSlots(data.slots || []))
      .catch(() => setSlots([]));
  }, [form.doctor_id, form.appointment_date]);

  useEffect(() => {
    if (!form.doctor_id) return;
    const [y, m] = calendarMonth.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    getDoctorAvailability(form.doctor_id, from, to)
      .then((data) => setMonthAvailability(data.availability || {}))
      .catch(() => setMonthAvailability({}));
  }, [form.doctor_id, calendarMonth]);

  const selectedDoctor = useMemo(
    () => doctorList.find((d) => d.id === form.doctor_id),
    [doctorList, form.doctor_id]
  );

  const selectedSlot = useMemo(
    () => slots.find((s) => s.start_time === form.start_time),
    [slots, form.start_time]
  );

  const patientValidation = usePatientValidation(form);
  const availableSlots = slots.filter((s) => s.available).length;

  const update = useCallback((name: string, value: string | boolean) => {
    dispatch({ type: 'UPDATE_FIELD', name, value });
    if (name === 'appointment_date' && typeof value === 'string') {
      dispatch({ type: 'SET_CALENDAR_MONTH', month: value });
    }
  }, [dispatch]);

  const submit = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: '' });
    dispatch({ type: 'SET_RECOVERY_REFERENCE', reference: '' });
    try {
      const phone = normalizePhone(form.phone);
      dispatch({ type: 'SET_PHASE', phase: 'holding' });
      const hold = await createAppointmentHold({
        doctor_id: form.doctor_id,
        appointment_date: form.appointment_date,
        start_time: form.start_time,
        patient_phone: phone,
      });
      dispatch({ type: 'SET_HOLD', hold: { id: hold.hold.id, expires_at: hold.hold.expires_at } });
      dispatch({ type: 'SET_PHASE', phase: 'hold_active' });
      dispatch({ type: 'SET_PHASE', phase: 'creating_appointment' });
      const result = await bookAppointment({
        hold_id: hold.hold.id,
        doctor_id: form.doctor_id,
        appointment_date: form.appointment_date,
        start_time: form.start_time,
        appointment_type: form.appointment_type,
        status: 'awaiting_payment',
        reception_notes: [
          `Reason: ${form.reason_for_visit}`,
          `Policy: ${bookingConfig?.policy_version || 'appointment-policy-2026-07-07'}`,
          `Consent: ${bookingConfig?.consent_version || 'appointment-consent-2026-07-07'}`,
        ].filter(Boolean).join('\n'),
        patient: {
          full_name: form.full_name,
          phone,
          email: form.email || undefined,
          gender: form.gender,
          date_of_birth: form.dob_unknown ? undefined : form.date_of_birth,
          age_years: form.dob_unknown ? Number(form.age_years) : patientValidation.calculatedAge?.years,
          guardian: form.guardian_name ? {
            full_name: form.guardian_name,
            phone,
            relationship: form.guardian_relation || 'guardian',
          } : undefined,
        },
      });
      dispatch({ type: 'SET_RECOVERY_REFERENCE', reference: result.appointment.appointment_number || result.appointment.id });
      dispatch({ type: 'SET_PHASE', phase: 'creating_payment' });
      const payment = await createPayment({ appointment_id: result.appointment.id });
      dispatch({ type: 'SET_PHASE', phase: 'redirecting' });
      window.location.href = payment.payment.redirect_url;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: formatError(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [form, patientValidation.calculatedAge, bookingConfig]);

  return (
    <>
      <section className="soft-page-hero py-12">
        <div className="container">
          <h1 className="text-3xl font-bold">Book Appointment</h1>
          <p className="mt-2 max-w-2xl text-text-light">Choose consultation type, doctor, server slot, patient details, then pay to confirm.</p>
          {bookingConfig && (
            <p className="mt-4 max-w-2xl text-sm text-text-light">
              Clinic date: {bookingConfig.clinic_date}. Timezone: {bookingConfig.clinic_timezone}. Slot hold: {bookingConfig.hold_duration_minutes} minutes.
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container max-w-[980px]">
          <div className="mb-6 grid grid-cols-2 gap-2 text-center text-xs font-semibold md:grid-cols-5">
            {steps.map((s) => (
              <div key={s.step} className={`rounded-2xl p-3 transition-all duration-300 ${step === s.step ? 'bg-gradient-to-r from-accent to-primary text-white shadow-[0_10px_24px_rgba(43,138,198,0.16)]' : 'border border-primary/20 bg-white text-text-light shadow-[0_8px_20px_rgba(23,58,94,0.06)]'}`}>
                {s.label}
              </div>
            ))}
          </div>

          <div className="soft-card p-5 md:p-6">
            {step === 1 && (
              <div className="grid gap-4">
                <h2 className="text-xl font-bold text-navy">Appointment type</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['new', 'New consultation', 'First visit or a new health concern'],
                    ['follow_up', 'Follow-up consultation', 'Review after a previous clinic visit'],
                  ].map(([value, label, hint]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update('appointment_type', value)}
                      className={`rounded-3xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(43,138,198,0.12)] ${form.appointment_type === value ? 'border-accent bg-blue-50 text-navy shadow-[0_10px_24px_rgba(43,138,198,0.12)]' : 'border-primary/20 bg-white text-navy shadow-[0_8px_20px_rgba(23,58,94,0.06)]'}`}
                    >
                      <Stethoscope className="mb-3 text-accent" size={24} />
                      <span className="block font-semibold text-navy">{label}</span>
                      <span className="mt-1 block text-sm text-text-light">{hint}</span>
                    </button>
                  ))}
                </div>
                <button className="btn btn-accent justify-center" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}>
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4">
                <h2 className="text-xl font-bold text-navy">Select doctor</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {doctorList.map((doctor) => (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => update('doctor_id', doctor.id)}
                      className={`rounded-3xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(43,138,198,0.12)] ${form.doctor_id === doctor.id ? 'border-accent bg-blue-50 text-navy shadow-[0_10px_24px_rgba(43,138,198,0.12)]' : 'border-primary/20 bg-white text-navy shadow-[0_8px_20px_rgba(23,58,94,0.06)]'}`}
                    >
                      <UserRound className="mb-3 text-primary" size={26} />
                      <span className="block font-semibold text-navy">{doctor.name}</span>
                      <span className="text-sm text-text-light">{doctor.speciality}</span>
                      <span className="mt-2 block text-xs font-semibold text-success">In-person consultation</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}><ArrowLeft size={18} /> Back</button>
                  <button disabled={!form.doctor_id} className="btn btn-accent flex-1 disabled:opacity-50" onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}>
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-5">
                <div>
                  <h2 className="text-xl font-bold text-navy">Select date and time</h2>
                  <p className="mt-1 text-sm text-text-light">{availableSlots} slots available for the selected date.</p>
                </div>
                <SlotCalendar
                  calendarMonth={calendarMonth}
                  onMonthChange={(m) => dispatch({ type: 'SET_CALENDAR_MONTH', month: m })}
                  monthAvailability={monthAvailability}
                  selectedDate={form.appointment_date}
                  onDateSelect={(d) => update('appointment_date', d)}
                />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot.start_time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => update('start_time', slot.start_time)}
                      className={`rounded-2xl border p-3 text-sm font-semibold transition-all duration-300 ${form.start_time === slot.start_time ? 'border-accent bg-gradient-to-r from-accent to-primary text-white shadow-[0_10px_24px_rgba(43,138,198,0.18)]' : 'border-primary/20 bg-white text-navy shadow-[0_8px_20px_rgba(23,58,94,0.06)] hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(43,138,198,0.12)]'} disabled:bg-bg-alt disabled:text-text-light disabled:shadow-none`}
                    >
                      {formatTime(slot.start_time)}
                    </button>
                  ))}
                  {slots.length === 0 && <p className="col-span-full rounded-md bg-bg-alt p-4 text-sm text-text-light">No slots are available for this date.</p>}
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}><ArrowLeft size={18} /> Back</button>
                  <button disabled={!form.start_time || !selectedSlot?.available} className="btn btn-accent flex-1 disabled:opacity-50" onClick={() => dispatch({ type: 'SET_STEP', step: 4 })}>
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-4">
                <PatientForm form={form} onChange={update} />
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}><ArrowLeft size={18} /> Back</button>
                  <button disabled={!patientValidation.complete} className="btn btn-accent flex-1 disabled:opacity-50" onClick={() => dispatch({ type: 'SET_STEP', step: 5 })}>
                    Review <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="grid gap-5">
                <h2 className="text-xl font-bold text-navy">Review and pay</h2>
                <div className="rounded-3xl bg-blue-50/70 p-4 text-sm">
                  <p><strong>Patient:</strong> {form.full_name}</p>
                  <p><strong>Doctor:</strong> {selectedDoctor?.name}</p>
                  <p><strong>Date and time:</strong> {form.appointment_date} at {formatTime(form.start_time)}</p>
                  <p><strong>Consultation fee:</strong> {money(bookingConfig?.fee)}</p>
                  <p><strong>Gateway fee:</strong> Shown by payment gateway if applicable</p>
                  <p><strong>Total before gateway:</strong> {money(bookingConfig?.fee)}</p>
                  {hold && <p><strong>Active hold:</strong> <HoldTimer expiresAt={hold.expires_at} /></p>}
                </div>
                <div className="soft-card p-4 text-sm text-text-light">
                  <p>Appointment is confirmed only after payment verification by the clinic system. Cancellation and refund requests are handled as per clinic policy.</p>
                  <p className="mt-2">Policy version: {bookingConfig?.policy_version || 'appointment-policy-2026-07-07'}. Consent version: {bookingConfig?.consent_version || 'appointment-consent-2026-07-07'}.</p>
                  {bookingConfig?.arrival_buffer_instructions && <p className="mt-2">{bookingConfig.arrival_buffer_instructions}</p>}
                </div>
                <label className="flex items-start gap-3 text-sm">
                  <input className="mt-1" type="checkbox" checked={form.consent} onChange={(e) => update('consent', e.target.checked)} />
                  <span>I confirm the details are correct and consent to appointment booking and payment processing under the policy shown above.</span>
                </label>
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
                    <p>{error}</p>
                    {recoveryReference && <p className="mt-1 text-text-light">Recovery reference: {recoveryReference}</p>}
                  </div>
                )}
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => dispatch({ type: 'SET_STEP', step: 4 })}><ArrowLeft size={18} /> Back</button>
                  <button disabled={loading || !form.consent} className="btn btn-accent flex-1 disabled:opacity-50" onClick={submit}>
                    {loading ? `${phase.replace(/_/g, ' ')}...` : <><CreditCard size={18} /> Pay and confirm</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="soft-card mt-6 flex items-center gap-3 p-4 text-sm text-text-light">
            <CalendarCheck className="shrink-0 text-success" size={22} />
            <span>After payment, the confirmation page will show payment status, receipt details when available, clinic address, and next steps.</span>
          </div>
        </div>
      </section>
    </>
  );
}
