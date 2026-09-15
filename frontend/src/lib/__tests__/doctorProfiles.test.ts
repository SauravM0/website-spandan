import { describe, expect, it } from 'vitest';
import {
  doctorProfileList,
  earliestYearAtClinic,
  fallbackDoctorSummaries,
  getDoctorProfile,
  membershipCount,
  trainingInstitutions,
} from '../doctorProfiles';
import { publicationAuthors } from '../publications';

describe('doctor profiles', () => {
  it('keys every profile by the slug it declares, matching the publication authors', () => {
    doctorProfileList.forEach((profile) => {
      expect(getDoctorProfile(profile.slug)).toBe(profile);
      expect(publicationAuthors).toHaveProperty(profile.slug);
    });
  });

  it('publishes a registration number and local portrait for every doctor', () => {
    doctorProfileList.forEach((profile) => {
      expect(profile.registration).toMatch(/^\d{4}\/\d{2}\/\d{4}$/);
      expect(profile.photo.startsWith('/doctors/')).toBe(true);
    });
  });

  it('keeps qualifications consistent with the education history', () => {
    doctorProfileList.forEach((profile) => {
      expect(profile.qualificationList).toEqual([...profile.education].reverse().map((entry) => entry.degree));
      expect(profile.practisingSince).toBe(Number(profile.education[0].year));
    });
  });

  it('never leaks internal editorial notes into public text', () => {
    const text = JSON.stringify(doctorProfileList);
    expect(text).not.toMatch(/NEEDS CONFIRMATION|not confirmed|ask doctor/i);
  });

  it('derives the home page credentials from the profile data', () => {
    expect(earliestYearAtClinic()).toBe(2015);
    expect(membershipCount()).toBe(6);
    const institutions = trainingInstitutions();
    expect(institutions).toHaveLength(4);
    expect(institutions.some((name) => name.includes('Government Medical College, Aurangabad'))).toBe(false);
  });

  it('provides fallback summaries so the specialists render during an API outage', () => {
    const summaries = fallbackDoctorSummaries();
    expect(summaries.map((doctor) => doctor.slug).sort()).toEqual(['dr-pratibha-aute', 'dr-tukaram-aute']);
    summaries.forEach((doctor) => {
      expect(doctor.name).toMatch(/^Dr\. /);
      expect(doctor.qualifications).toContain('DM');
    });
  });
});
