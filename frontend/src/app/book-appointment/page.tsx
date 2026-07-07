'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
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
} from '../../lib/api';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value: string) {
  return value ? value.slice(0, 5) : '';
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthStart(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(value: string, amount: number) {
  const date = monthStart(value);
  date.setMonth(date.getMonth() + amount);
  return dateKey(date);
}

function monthCells(value: string) {
  const start = monthStart(value);
  const end = monthEnd(value);
  const cursor = new Date(start);
  const cells: Array<{ date: string; inMonth: boolean }> = [];
  cursor.setDate(cursor.getDate() - cursor.getDay());

  while (cells.length < 42) {
    cells.push({ date: dateKey(cursor), inMonth: cursor.getMonth() === start.getMonth() });
    cursor.setDate(cursor.getDate() + 1);
  }

  return { cells, from: dateKey(start), to: dateKey(end) };
}

function availableCount(slots: any[] = []) {
  return slots.filter((slot) => slot.available).length;
}

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const now = new Date();
  if (Number.isNaN(birth.getTime()) || birth > now) return null;

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '').replace(/^0(?=[6-9]\d{9}$)/, '');
}

function formatBookingError(err: unknown) {
  if (err instanceof ApiError && err.fieldErrors) {
    const messages = Object.entries(err.fieldErrors).flatMap(([field, errors]) =>
      errors.map((message) => `${field}: ${message}`)
    );
    if (messages.length) return messages.join(' ');
  }
  return err instanceof Error ? err.message : 'Booking failed';
}

export default function BookAppointmentPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [monthAvailability, setMonthAvailability] = useState<Record<string, any[]>>({});
  const [calendarMonth, setCalendarMonth] = useState(today());
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    appointment_type: 'new',
    doctor_id: '',
    appointment_date: today(),
    start_time: '',
    full_name: '',
    phone: '',
    gender: '',
    dob_unknown: false,
    date_of_birth: '',
    age_years: '',
    city: '',
    state: 'Maharashtra',
    pin_code: '',
    reason_for_visit: '',
    email: '',
    guardian_name: '',
    guardian_relation: '',
    abha: '',
    aadhaar: '',
    referring_doctor: '',
    consent: false,
  });

  useEffect(() => {
    getDoctors()
      .then((data) => {
        setDoctors(data.doctors || []);
        if (data.doctors?.[0]) setForm((prev) => ({ ...prev, doctor_id: data.doctors[0].id }));
      })
      .catch(() => setError('Could not load doctors.'));
  }, []);

  useEffect(() => {
    if (!form.doctor_id || !form.appointment_date) return;
    setError('');
    getAppointmentSlots(form.doctor_id, form.appointment_date)
      .then((data) => setSlots(data.slots || []))
      .catch(() => setSlots([]));
  }, [form.doctor_id, form.appointment_date]);

  useEffect(() => {
    if (!form.doctor_id) return;
    const { from, to } = monthCells(calendarMonth);
    getDoctorAvailability(form.doctor_id, from, to)
      .then((data) => setMonthAvailability(data.availability || {}))
      .catch(() => setMonthAvailability({}));
  }, [form.doctor_id, calendarMonth]);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === form.doctor_id),
    [doctors, form.doctor_id]
  );
  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.start_time === form.start_time),
    [slots, form.start_time]
  );
  const calculatedAge = useMemo(() => calculateAge(form.date_of_birth), [form.date_of_birth]);
  const ageYears = form.dob_unknown ? Number(form.age_years || 0) : calculatedAge?.years || 0;
  const isMinor = ageYears > 0 && ageYears < 18;
  const availableSlots = slots.filter((slot) => slot.available).length;
  const consultationFee = 700;
  const patientMonth = useMemo(() => monthCells(calendarMonth), [calendarMonth]);

  const update = (name: string, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'doctor_id' || name === 'appointment_date' ? { start_time: '' } : {}),
    }));
    if (name === 'appointment_date' && typeof value === 'string') setCalendarMonth(value);
  };

  const patientDetailsComplete =
    form.full_name &&
    form.phone &&
    form.gender &&
    form.city &&
    form.state &&
    form.pin_code &&
    form.reason_for_visit &&
    ((form.dob_unknown && form.age_years) || (!form.dob_unknown && form.date_of_birth)) &&
    (!isMinor || (form.guardian_name && form.guardian_relation));

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const phone = normalizePhone(form.phone);
      const hold = await createAppointmentHold({
        doctor_id: form.doctor_id,
        appointment_date: form.appointment_date,
        start_time: form.start_time,
        patient_phone: phone,
      });
      const result = await bookAppointment({
        hold_id: hold.hold.id,
        doctor_id: form.doctor_id,
        appointment_date: form.appointment_date,
        start_time: form.start_time,
        appointment_type: form.appointment_type,
        status: 'awaiting_payment',
        reception_notes: [
          `Type: ${form.appointment_type === 'new' ? 'New consultation' : 'Follow-up consultation'}`,
          `Reason: ${form.reason_for_visit}`,
          form.abha ? `ABHA: ${form.abha}` : '',
          form.aadhaar ? `Aadhaar: ${form.aadhaar}` : '',
          form.referring_doctor ? `Referring doctor: ${form.referring_doctor}` : '',
        ].filter(Boolean).join('\n'),
        patient: {
          full_name: form.full_name,
          phone,
          email: form.email || undefined,
          gender: form.gender,
          date_of_birth: form.dob_unknown ? undefined : form.date_of_birth,
          age_years: form.dob_unknown ? Number(form.age_years) : calculatedAge?.years,
          address: `${form.city}, ${form.state} - ${form.pin_code}`,
          guardian: form.guardian_name ? {
            full_name: form.guardian_name,
            phone,
            relationship: form.guardian_relation || 'guardian',
          } : undefined,
        },
      });
      const payment = await createPayment({ appointment_id: result.appointment.id });
      window.location.href = payment.payment.redirect_url;
    } catch (err) {
      setError(formatBookingError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="bg-navy py-12 text-white">
        <div className="container">
          <h1 className="text-3xl font-bold">Book Appointment</h1>
          <p className="mt-2 max-w-2xl text-white/80">Choose consultation type, doctor, slot, patient details, then pay to confirm.</p>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-[980px]">
          <div className="mb-6 grid grid-cols-2 gap-2 text-center text-xs font-semibold md:grid-cols-5">
            {['Type', 'Doctor', 'Slot', 'Patient', 'Review'].map((label, index) => (
              <div key={label} className={`rounded-md p-3 ${step === index + 1 ? 'bg-accent text-white' : 'bg-bg-alt text-text-light'}`}>
                {label}
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-white p-5 shadow md:p-6">
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
                      className={`rounded-lg border p-4 text-left ${form.appointment_type === value ? 'border-accent bg-accent/5' : 'border-border bg-white'}`}
                    >
                      <Stethoscope className="mb-3 text-accent" size={24} />
                      <span className="block font-semibold text-navy">{label}</span>
                      <span className="mt-1 block text-sm text-text-light">{hint}</span>
                    </button>
                  ))}
                </div>
                <button className="btn btn-accent justify-center" onClick={() => setStep(2)}>
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4">
                <h2 className="text-xl font-bold text-navy">Select doctor</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {doctors.map((doctor) => (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => update('doctor_id', doctor.id)}
                      className={`rounded-lg border p-4 text-left ${form.doctor_id === doctor.id ? 'border-accent bg-accent/5' : 'border-border bg-white'}`}
                    >
                      <UserRound className="mb-3 text-primary" size={26} />
                      <span className="block font-semibold text-navy">{doctor.name}</span>
                      <span className="text-sm text-text-light">{doctor.speciality}</span>
                      <span className="mt-2 block text-xs font-semibold text-success">In-person consultation</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => setStep(1)}><ArrowLeft size={18} /> Back</button>
                  <button disabled={!form.doctor_id} className="btn btn-accent flex-1 disabled:opacity-50" onClick={() => setStep(3)}>
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

                <div className="rounded-lg border border-border bg-bg-alt p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <div className="text-center">
                      <p className="font-bold text-navy">
                        {new Intl.DateTimeFormat('en-IN', {
                          month: 'long',
                          year: 'numeric',
                        }).format(monthStart(calendarMonth))}
                      </p>
                      <p className="text-xs font-semibold text-text-light">
                        Green dates can be booked
                      </p>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-text-light">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {patientMonth.cells.map((cell) => {
                      const count = availableCount(monthAvailability[cell.date] || []);
                      const isPast = cell.date < today();
                      const isSunday = new Date(`${cell.date}T00:00:00`).getDay() === 0;
                      const disabled = isPast || count === 0;
                      const selected = form.appointment_date === cell.date;
                      return (
                        <button
                          key={cell.date}
                          type="button"
                          disabled={disabled}
                          onClick={() => update('appointment_date', cell.date)}
                          className={`min-h-[68px] rounded-md border p-1 text-center transition ${
                            selected
                              ? 'border-accent bg-accent text-white'
                              : disabled
                                ? 'border-slate-200 bg-white text-slate-400'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400'
                          } ${cell.inMonth ? '' : 'opacity-40'}`}
                        >
                          <span className="block text-sm font-black">
                            {new Date(`${cell.date}T00:00:00`).getDate()}
                          </span>
                          <span className="mt-1 block text-[10px] font-bold leading-tight">
                            {isSunday ? 'Holiday' : count > 0 ? `${count} slots` : 'No slots'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="form-group mb-0 mt-3">
                    <label>Date</label>
                    <input
                      type="date"
                      min={today()}
                      value={form.appointment_date}
                      onChange={(event) => update('appointment_date', event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot.start_time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => update('start_time', slot.start_time)}
                      className={`rounded-md border p-3 text-sm font-semibold ${form.start_time === slot.start_time ? 'border-accent bg-accent text-white' : 'border-border bg-white'} disabled:bg-bg-alt disabled:text-text-light`}
                    >
                      {formatTime(slot.start_time)}
                    </button>
                  ))}
                  {slots.length === 0 && <p className="col-span-full rounded-md bg-bg-alt p-4 text-sm text-text-light">No slots are available for this date.</p>}
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => setStep(2)}><ArrowLeft size={18} /> Back</button>
                  <button disabled={!form.start_time || !selectedSlot?.available} className="btn btn-accent flex-1 disabled:opacity-50" onClick={() => setStep(4)}>
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-4">
                <h2 className="text-xl font-bold text-navy">Patient details</h2>
                <div className="form-row">
                  <div className="form-group"><label>Patient full name</label><input value={form.full_name} onChange={(event) => update('full_name', event.target.value)} /></div>
                  <div className="form-group"><label>Phone</label><input value={form.phone} onChange={(event) => update('phone', event.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Gender</label><select value={form.gender} onChange={(event) => update('gender', event.target.value)}><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option></select></div>
                  <div className="form-group"><label>Email (optional)</label><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></div>
                </div>
                <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.dob_unknown} onChange={(event) => update('dob_unknown', event.target.checked)} /> Exact DOB not known</label>
                <div className="form-row">
                  <div className="form-group"><label>Date of birth</label><input type="date" disabled={form.dob_unknown} value={form.date_of_birth} onChange={(event) => update('date_of_birth', event.target.value)} /></div>
                  <div className="form-group"><label>Age when DOB unknown</label><input type="number" min="0" disabled={!form.dob_unknown} value={form.age_years} onChange={(event) => update('age_years', event.target.value)} /></div>
                </div>
                {calculatedAge && !form.dob_unknown && <p className="rounded-md bg-bg-alt p-3 text-sm">Calculated age: {calculatedAge.years} years, {calculatedAge.months} months, {calculatedAge.days} days</p>}
                <div className="form-row">
                  <div className="form-group"><label>City</label><input value={form.city} onChange={(event) => update('city', event.target.value)} /></div>
                  <div className="form-group"><label>State</label><input value={form.state} onChange={(event) => update('state', event.target.value)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>PIN code</label><input value={form.pin_code} onChange={(event) => update('pin_code', event.target.value)} /></div>
                  <div className="form-group"><label>Reason for visit</label><input value={form.reason_for_visit} onChange={(event) => update('reason_for_visit', event.target.value)} /></div>
                </div>
                {(isMinor || form.guardian_name) && (
                  <div className="form-row">
                    <div className="form-group"><label>Guardian name</label><input value={form.guardian_name} onChange={(event) => update('guardian_name', event.target.value)} /></div>
                    <div className="form-group"><label>Guardian relation</label><input value={form.guardian_relation} onChange={(event) => update('guardian_relation', event.target.value)} /></div>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group"><label>ABHA (optional)</label><input value={form.abha} onChange={(event) => update('abha', event.target.value)} /></div>
                  <div className="form-group"><label>Aadhaar (optional)</label><input value={form.aadhaar} onChange={(event) => update('aadhaar', event.target.value)} /></div>
                </div>
                <div className="form-group"><label>Referring doctor (optional)</label><input value={form.referring_doctor} onChange={(event) => update('referring_doctor', event.target.value)} /></div>
                <p className="text-sm text-text-light">Please enter details for the patient, even when a family member is booking.</p>
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => setStep(3)}><ArrowLeft size={18} /> Back</button>
                  <button disabled={!patientDetailsComplete} className="btn btn-accent flex-1 disabled:opacity-50" onClick={() => setStep(5)}>
                    Review <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="grid gap-5">
                <h2 className="text-xl font-bold text-navy">Review and pay</h2>
                <div className="rounded-md bg-bg-alt p-4 text-sm">
                  <p><strong>Patient:</strong> {form.full_name}</p>
                  <p><strong>Doctor:</strong> {selectedDoctor?.name}</p>
                  <p><strong>Date and time:</strong> {form.appointment_date} at {formatTime(form.start_time)}</p>
                  <p><strong>Consultation fee:</strong> Rs. {consultationFee}</p>
                  <p><strong>Gateway fee:</strong> Shown by payment gateway if applicable</p>
                  <p><strong>Total:</strong> Rs. {consultationFee}</p>
                </div>
                <div className="rounded-md border border-border p-4 text-sm text-text-light">
                  Appointment is confirmed only after payment verification by the clinic system. Cancellation and refund requests are handled as per clinic policy.
                </div>
                <label className="flex items-start gap-3 text-sm">
                  <input className="mt-1" type="checkbox" checked={form.consent} onChange={(event) => update('consent', event.target.checked)} />
                  <span>I confirm the details are correct and consent to appointment booking and payment processing.</span>
                </label>
                {error && <p className="text-sm text-danger">{error}</p>}
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => setStep(4)}><ArrowLeft size={18} /> Back</button>
                  <button disabled={loading || !form.consent} className="btn btn-accent flex-1 disabled:opacity-50" onClick={submit}>
                    {loading ? 'Creating payment...' : <><CreditCard size={18} /> Pay and confirm</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-bg-alt p-4 text-sm text-text-light">
            <CalendarCheck className="shrink-0 text-success" size={22} />
            <span>After payment, the confirmation page will show payment status, receipt details when available, clinic address, and next steps.</span>
          </div>
        </div>
      </section>
    </>
  );
}
