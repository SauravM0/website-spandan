import { describe, expect, it } from 'vitest';
import { buildCareBookingHref } from '../ServiceCards';

const doctors = [
  {
    id: 'doctor-maam',
    slug: 'dr-pratibha-aute',
    name: 'Dr. Pratibha Pawal-Aute',
    speciality: 'Endocrinology',
    qualifications: 'MD',
  },
  {
    id: 'doctor-sir',
    slug: 'dr-tukaram-aute',
    name: 'Dr. Tukaram Sonaji Aute',
    speciality: 'Cardiology',
    qualifications: 'MD',
  },
];

describe('care-path booking links', () => {
  it('preselects the endocrinology consultant for diabetes care', () => {
    const href = buildCareBookingHref(doctors, {
      title: 'Diabetes care',
      shortTitle: 'Diabetes',
      text: '',
      icon: (() => null) as never,
      speciality: 'endocrinology',
    });

    expect(href).toBe('/book-appointment?reason=Diabetes&doctor=doctor-maam');
  });

  it('preselects the cardiology consultant for heart care', () => {
    const href = buildCareBookingHref(doctors, {
      title: 'Heart care',
      shortTitle: 'Heart',
      text: '',
      icon: (() => null) as never,
      speciality: 'cardiology',
    });

    expect(href).toBe('/book-appointment?reason=Heart&doctor=doctor-sir');
  });

  it('keeps consultant preselection when live homepage doctor data is unavailable', () => {
    const diabetesHref = buildCareBookingHref([], {
      title: 'Diabetes care',
      shortTitle: 'Diabetes',
      text: '',
      icon: (() => null) as never,
      speciality: 'endocrinology',
    });
    const heartHref = buildCareBookingHref([], {
      title: 'Heart care',
      shortTitle: 'Heart',
      text: '',
      icon: (() => null) as never,
      speciality: 'cardiology',
    });

    expect(diabetesHref).toContain('doctor=dr-pratibha-aute');
    expect(heartHref).toContain('doctor=dr-tukaram-aute');
  });
});
