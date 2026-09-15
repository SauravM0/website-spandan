import { describe, expect, it } from 'vitest';
import {
  publicationAuthor,
  publicationAuthors,
  publicationsForDoctor,
  researchPublications,
} from '../publications';

describe('research publications catalog', () => {
  it('contains all supplied publication records with unique identifiers', () => {
    expect(researchPublications).toHaveLength(20);
    expect(new Set(researchPublications.map((publication) => publication.id)).size).toBe(20);
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

  it('credits every record to at least one published clinic doctor', () => {
    researchPublications.forEach((publication) => {
      expect(publication.authorSlugs.length).toBeGreaterThan(0);
      publication.authorSlugs.forEach((slug) => {
        expect(publicationAuthors[slug]).toBeDefined();
      });
    });
  });

  it('splits the catalog across both doctors and keeps the co-authored paper on both', () => {
    const endocrine = publicationsForDoctor('dr-pratibha-aute');
    const cardiology = publicationsForDoctor('dr-tukaram-aute');

    expect(endocrine.length).toBeGreaterThan(0);
    expect(cardiology.length).toBeGreaterThan(0);
    // The LPL case report is authored by both doctors, so it appears in each list.
    expect(endocrine.length + cardiology.length).toBe(researchPublications.length + 1);
    expect(publicationsForDoctor('not-a-doctor')).toHaveLength(0);
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
