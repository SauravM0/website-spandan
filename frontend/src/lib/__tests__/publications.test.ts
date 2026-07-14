import { describe, expect, it } from 'vitest';
import { publicationAuthor, researchPublications } from '../publications';

describe('research publications catalog', () => {
  it('contains all supplied publication records with unique identifiers', () => {
    expect(researchPublications).toHaveLength(14);
    expect(new Set(researchPublications.map((publication) => publication.id)).size).toBe(14);
  });

  it('is associated with the published endocrinology doctor profile', () => {
    expect(publicationAuthor).toMatchObject({
      name: 'Dr. Pratibha Pawal-Aute',
      slug: 'dr-pratibha-aute',
      speciality: 'Endocrinology',
    });
  });

  it('uses direct publication destinations rather than LinkedIn redirect links', () => {
    const externalUrls = researchPublications
      .map((publication) => publication.externalUrl)
      .filter((url): url is string => Boolean(url));

    expect(externalUrls.length).toBeGreaterThan(0);
    externalUrls.forEach((url) => {
      expect(url).toMatch(/^https:\/\//);
      expect(url).not.toContain('linkedin.com/safety/go');
    });
  });

  it('keeps every record useful when an external link is unavailable', () => {
    researchPublications.forEach((publication) => {
      expect(publication.title.trim().length).toBeGreaterThan(0);
      expect(publication.description.trim().length).toBeGreaterThan(0);
      expect(publication.dateLabel.trim().length).toBeGreaterThan(0);
      expect(publication.topics.length).toBeGreaterThan(0);
    });
  });
});
