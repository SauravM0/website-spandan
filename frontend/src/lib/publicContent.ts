export type PublicService = {
  id: string;
  name: string;
  summary: string;
  href: string;
  contactPath: string;
};

export type PublicTrustStatement = {
  id: string;
  text: string;
  evidence: 'clinic-fact' | 'published-doctor-profile' | 'approved-policy';
};

export type PublicContent = {
  services: readonly PublicService[];
  trustStatements: readonly PublicTrustStatement[];
};

export function validatePublicContent(content: PublicContent): PublicContent {
  const ids = [...content.services, ...content.trustStatements].map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('Public content IDs must be unique');

  content.services.forEach((service) => {
    if (!service.name.trim() || !service.summary.trim()) throw new Error(`Service ${service.id} is incomplete`);
    if (!service.href.startsWith('/') || !service.contactPath.startsWith('/')) {
      throw new Error(`Service ${service.id} must use an internal recovery path`);
    }
  });

  return content;
}

// Only repository-supported, non-outcome claims belong here. Clinical owners must
// approve new care claims before they are added to this source.
export const publicContent = validatePublicContent({
  services: [
    { id: 'cardiology', name: 'Cardiology', summary: 'Consultation and cardiac review.', href: '/doctors', contactPath: '/contact' },
    { id: 'endocrinology', name: 'Endocrinology', summary: 'Diabetes and thyroid consultation.', href: '/doctors', contactPath: '/contact' },
    { id: 'diagnostics', name: 'Diagnostics', summary: 'Clinic laboratory equipment, diagnostic facilities, and preparation information.', href: '/explore#equipment', contactPath: '/contact' },
  ],
  trustStatements: [
    { id: 'published-profiles', text: 'Doctor qualifications are shown on published profiles.', evidence: 'published-doctor-profile' },
    { id: 'clear-visit-details', text: 'Location, timings, and contact details are available before a visit.', evidence: 'clinic-fact' },
  ],
});
