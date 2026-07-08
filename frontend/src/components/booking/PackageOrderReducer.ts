import { useMemo, useReducer } from 'react';
import { clinicToday } from '@/lib/timezone';

export interface CartItem {
  id: string;
  package_id: string;
  quantity: string;
  preferred_date: string;
  patient_name: string;
  age_years: string;
  gender: string;
  guardian_name: string;
  guardian_relation: string;
}

export interface BuyerInfo {
  purchaser_name: string;
  phone: string;
  email: string;
  preferred_date: string;
}

export type PackageStep = 1 | 2 | 3;

export interface PackageOrderState {
  step: PackageStep;
  buyer: BuyerInfo;
  items: CartItem[];
  loading: boolean;
  error: string;
  acknowledged: boolean;
  quote: any | null;
  recoveryReference: string;
}

function newItem(packageId = ''): CartItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    package_id: packageId,
    quantity: '1',
    preferred_date: clinicToday(),
    patient_name: '',
    age_years: '',
    gender: '',
    guardian_name: '',
    guardian_relation: '',
  };
}

function createInitialState(selectedPackage: string): PackageOrderState {
  return {
    step: 1,
    buyer: {
      purchaser_name: '',
      phone: '',
      email: '',
      preferred_date: clinicToday(),
    },
    items: [newItem(selectedPackage)],
    loading: false,
    error: '',
    acknowledged: false,
    quote: null,
    recoveryReference: '',
  };
}

type Action =
  | { type: 'SET_STEP'; step: PackageStep }
  | { type: 'SET_BUYER_FIELD'; name: string; value: string }
  | { type: 'SET_ITEM_FIELD'; id: string; name: keyof CartItem; value: string }
  | { type: 'ADD_ITEM' }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SET_ACKNOWLEDGED'; value: boolean }
  | { type: 'SET_QUOTE'; quote: any | null }
  | { type: 'SET_RECOVERY_REFERENCE'; reference: string };

function reducer(state: PackageOrderState, action: Action): PackageOrderState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step, error: '' };
    case 'SET_BUYER_FIELD':
      return { ...state, buyer: { ...state.buyer, [action.name]: action.value } };
    case 'SET_ITEM_FIELD':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, [action.name]: action.value } : item
        ),
      };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, newItem(state.items[0]?.package_id || '')] };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.length === 1 ? state.items : state.items.filter((i) => i.id !== action.id) };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_ACKNOWLEDGED':
      return { ...state, acknowledged: action.value };
    case 'SET_QUOTE':
      return { ...state, quote: action.quote };
    case 'SET_RECOVERY_REFERENCE':
      return { ...state, recoveryReference: action.reference };
    default:
      return state;
  }
}

export function usePackageOrderReducer(selectedPackage: string) {
  return useReducer(reducer, selectedPackage, createInitialState);
}

export function usePackageOrderCalculations(items: CartItem[], packages: any[]) {
  const packageById = useMemo(() => new Map(packages.map((p) => [p.id, p])), [packages]);

  const subtotal = items.reduce((sum, item) => {
    const pkg = packageById.get(item.package_id);
    return sum + (Number(pkg?.discounted_price || pkg?.base_price || 0) * Number(item.quantity || 1));
  }, 0);

  const tax = items.reduce((sum, item) => {
    const pkg = packageById.get(item.package_id);
    const price = Number(pkg?.discounted_price || pkg?.base_price || 0) * Number(item.quantity || 1);
    return sum + (pkg?.tax_applicable ? (price * Number(pkg?.tax_rate || 0)) / 100 : 0);
  }, 0);

  const fee = items.reduce((sum, item) =>
    sum + (Number(packageById.get(item.package_id)?.convenience_fee || 0) * Number(item.quantity || 1)), 0);

  const total = subtotal + tax + fee;

  const buyerComplete = (state: BuyerInfo) =>
    state.purchaser_name && state.phone && state.preferred_date;

  const itemsComplete = (stateItems: CartItem[]) =>
    stateItems.every((item) => {
      const pkg = packageById.get(item.package_id);
      const age = item.age_years === '' ? null : Number(item.age_years);
      const guardianComplete = age !== null && age < 18 ? Boolean(item.guardian_name && item.guardian_relation) : true;
      return item.package_id
        && item.patient_name
        && item.age_years !== ''
        && item.gender
        && guardianComplete
        && Number(item.quantity || 0) > 0
        && (!pkg?.preferred_date_required || item.preferred_date);
    });

  return { packageById, subtotal, tax, fee, total, buyerComplete, itemsComplete };
}
