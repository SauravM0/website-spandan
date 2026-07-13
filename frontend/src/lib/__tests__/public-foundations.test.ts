import { describe, expect, it } from 'vitest';
import en from '../../../public/locales/en/common.json';
import hi from '../../../public/locales/hi/common.json';
import mr from '../../../public/locales/mr/common.json';
import { clinicLinks, clinicSettings, supportedLanguages } from '../settings';
import { publicContent, validatePublicContent } from '../publicContent';

describe('public website foundations', () => {
  it('keeps translation key parity across every supported language', () => {
    const keys = Object.keys(en).sort();
    expect(supportedLanguages).toEqual(['en', 'hi', 'mr']);
    expect(Object.keys(hi).sort()).toEqual(keys);
    expect(Object.keys(mr).sort()).toEqual(keys);
  });

  it('contains valid Unicode without common mojibake markers', () => {
    const serialized = JSON.stringify({ en, hi, mr });
    expect(serialized).not.toMatch(/(?:Ã.|Â.|à¤|à¥|â€)/);
    expect(hi.site_name).toContain('स्पंदन');
    expect(mr.site_name).toContain('स्पंदन');
  });

  it('derives contact actions from canonical clinic settings', () => {
    expect(clinicLinks.phone).toBe(`tel:${clinicSettings.phone}`);
    expect(clinicLinks.whatsapp).toBe(clinicSettings.social.whatsapp);
    expect(clinicLinks.directions).toBe(clinicSettings.googleMapsUrl);
  });

  it('rejects incomplete or external service recovery paths', () => {
    expect(validatePublicContent(publicContent)).toBe(publicContent);
    expect(() => validatePublicContent({ services: [{ id: 'unsafe', name: '', summary: '', href: 'https://example.com', appointmentPath: '' }], trustStatements: [] })).toThrow();
  });
});
