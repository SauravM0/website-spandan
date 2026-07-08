import { useReducer } from 'react';
import { clinicToday } from '@/lib/timezone';

export interface BookingForm {
  appointment_type: string;
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  full_name: string;
  phone: string;
  gender: string;
  dob_unknown: boolean;
  date_of_birth: string;
  age_years: string;
  city: string;
  state: string;
  pin_code: string;
  reason_for_visit: string;
  email: string;
  guardian_name: string;
  guardian_relation: string;
  referring_doctor: string;
  consent: boolean;
}

export type BookingStep = 1 | 2 | 3 | 4 | 5;
export type BookingPhase =
  | 'selecting'
  | 'validating'
  | 'holding'
  | 'hold_active'
  | 'creating_appointment'
  | 'creating_payment'
  | 'redirecting'
  | 'recoverable_error';

export interface BookingState {
  step: BookingStep;
  form: BookingForm;
  calendarMonth: string;
  loading: boolean;
  error: string;
  phase: BookingPhase;
  hold: { id: string; expires_at: string } | null;
  recoveryReference: string;
}

type Action =
  | { type: 'SET_STEP'; step: BookingStep }
  | { type: 'UPDATE_FIELD'; name: string; value: string | boolean }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SET_PHASE'; phase: BookingPhase }
  | { type: 'SET_HOLD'; hold: { id: string; expires_at: string } | null }
  | { type: 'SET_RECOVERY_REFERENCE'; reference: string }
  | { type: 'SET_DOCTOR_ID'; id: string }
  | { type: 'SET_CALENDAR_MONTH'; month: string };

function createInitialForm(): BookingForm {
  return {
    appointment_type: 'new',
    doctor_id: '',
    appointment_date: clinicToday(),
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
    referring_doctor: '',
    consent: false,
  };
}

export function createInitialState(): BookingState {
  return {
    step: 1,
    form: createInitialForm(),
    calendarMonth: clinicToday(),
    loading: false,
    error: '',
    phase: 'selecting',
    hold: null,
    recoveryReference: '',
  };
}

function bookingReducer(state: BookingState, action: Action): BookingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step, error: '' };
    case 'UPDATE_FIELD': {
      const form = { ...state.form, [action.name]: action.value };
      if (action.name === 'doctor_id' || action.name === 'appointment_date') {
        form.start_time = '';
      }
      return { ...state, form };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error, phase: action.error ? 'recoverable_error' : state.phase };
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_HOLD':
      return { ...state, hold: action.hold };
    case 'SET_RECOVERY_REFERENCE':
      return { ...state, recoveryReference: action.reference };
    case 'SET_DOCTOR_ID':
      return { ...state, form: { ...state.form, doctor_id: action.id, start_time: '' } };
    case 'SET_CALENDAR_MONTH':
      return { ...state, calendarMonth: action.month };
    default:
      return state;
  }
}

export function useBookingReducer() {
  return useReducer(bookingReducer, undefined, createInitialState);
}
