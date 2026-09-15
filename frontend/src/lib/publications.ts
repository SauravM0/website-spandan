export type PublicationTopic =
  | 'Bone and mineral health'
  | 'Genetics and rare disease'
  | 'Pediatric endocrinology'
  | 'Thyroid'
  | 'Metabolic research'
  | 'Reproductive endocrinology'
  | 'Endocrine imaging'
  | 'Interventional cardiology'
  | 'Congenital and structural heart disease'
  | 'Coronary artery disease';

export type ResearchPublication = {
  id: string;
  title: string;
  journal?: string;
  dateLabel: string;
  publishedOn?: string;
  year?: number;
  description: string;
  topics: PublicationTopic[];
  externalUrl?: string;
  /** Clinic doctor slugs credited on the paper. Papers can list both doctors. */
  authorSlugs: DoctorPublicationAuthorSlug[];
};

export type DoctorPublicationAuthorSlug = 'dr-pratibha-aute' | 'dr-tukaram-aute';

export type PublicationAuthor = {
  name: string;
  slug: DoctorPublicationAuthorSlug;
  speciality: string;
};

export const publicationAuthors: Record<DoctorPublicationAuthorSlug, PublicationAuthor> = {
  'dr-pratibha-aute': {
    name: 'Dr. Pratibha Pawal-Aute',
    slug: 'dr-pratibha-aute',
    speciality: 'Endocrinology',
  },
  'dr-tukaram-aute': {
    name: 'Dr. Tukaram Sonaji Aute',
    slug: 'dr-tukaram-aute',
    speciality: 'Cardiology',
  },
};

/**
 * Kept for the endocrinology-first surfaces that predate the cardiology
 * catalogue. Prefer `publicationAuthors` for anything doctor-agnostic.
 */
export const publicationAuthor = publicationAuthors['dr-pratibha-aute'];

export const researchPublications: ResearchPublication[] = [
  {
    id: 'face2gene-syndrome-recognition-dysmorphism',
    title: 'The Utility of Face2Gene App for Syndrome Recognition in Indian Children with Dysmorphism.',
    journal: 'Indian Journal of Pediatrics',
    dateLabel: '28 January 2026',
    publishedOn: '2026-01-28',
    year: 2026,
    description: 'Evaluates how well an AI-assisted facial-recognition tool supports syndrome identification in Indian children presenting with dysmorphic features.',
    topics: ['Genetics and rare disease', 'Pediatric endocrinology'],
    authorSlugs: ['dr-pratibha-aute'],
    externalUrl: 'https://pubmed.ncbi.nlm.nih.gov/41593402/',
  },
  {
    id: 'fgf23-hypophosphatemia-phosphaturic-tumours',
    title: 'Exploring the Depths: Unraveling FGF-23 Driven Hypophosphatemia in the Shadows of Phosphaturic Tumours.',
    journal: 'International Journal of Advanced Research',
    dateLabel: 'December 2025',
    publishedOn: '2025-12-01',
    year: 2025,
    description: 'Reviews FGF-23 mediated hypophosphatemia arising from phosphaturic mesenchymal tumours, and the diagnostic pathway to identifying them.',
    topics: ['Bone and mineral health', 'Endocrine imaging', 'Metabolic research'],
    authorSlugs: ['dr-pratibha-aute'],
  },
  {
    id: 'vdr-mutations-vitamin-d-resistant-rickets',
    title: 'Novel mutations in the vitamin D receptor gene causing hereditary vitamin D-resistant rickets type 2A in two Indian families.',
    journal: 'IJEM Case Reports',
    dateLabel: '1 October 2024',
    publishedOn: '2024-10-01',
    year: 2024,
    description: 'Discusses newly identified mutations in the VDR gene associated with hereditary vitamin D-resistant rickets in Indian patients.',
    topics: ['Bone and mineral health', 'Genetics and rare disease', 'Pediatric endocrinology'],
    authorSlugs: ['dr-pratibha-aute'],
    externalUrl: 'https://journals.lww.com/jmcr/fulltext/2024/02040/novel_mutations_in_the_vitamin_d_receptor_gene.5.aspx',
  },
  {
    id: 'osteitis-fibrosa-cystica-mandible-pregnancy-cdc73',
    title: 'A Case of Osteitis Fibrosa Cystica of the Mandible: A Rare Presentation during Pregnancy due to CDC73 Mutation.',
    journal: 'Journal of the ASEAN Federation of Endocrine Societies (JAFES)',
    dateLabel: '3 September 2024',
    publishedOn: '2024-09-03',
    year: 2024,
    description: 'Reports a rare presentation of primary hyperparathyroidism during pregnancy and discusses the associated CDC73 molecular finding.',
    topics: ['Bone and mineral health', 'Genetics and rare disease', 'Reproductive endocrinology'],
    authorSlugs: ['dr-pratibha-aute'],
    externalUrl: 'https://asean-endocrinejournal.org/index.php/JAFES/article/view/2909',
  },
  {
    id: 'serpinf1-osteogenesis-imperfecta-vi',
    title: 'A Rare Pathogenic Variant in the SERPINF1 Gene in Association with Early-Onset Severe Presentation of Autosomal Recessive Type of Osteogenesis Imperfecta VI: A Case Report.',
    journal: 'Case Reports in Orthopedic Research',
    dateLabel: '5 January 2024',
    publishedOn: '2024-01-05',
    year: 2024,
    description: 'Details an infant case of severe osteogenesis imperfecta type VI associated with a previously unreported SERPINF1 gene variant.',
    topics: ['Bone and mineral health', 'Genetics and rare disease', 'Pediatric endocrinology'],
    authorSlugs: ['dr-pratibha-aute'],
    externalUrl: 'https://karger.com/cio/article/5/3/108/832309/A-Rare-Pathogenic-Variant-in-the-SERPINF1-Gene-in',
  },
  {
    id: 'lpl-germline-mutation-infant',
    title: 'A nonsense germline mutation in the LPL gene in a 1-month-old infant: case report with review of literature.',
    journal: 'Bulletin of the National Research Centre',
    dateLabel: '1 February 2023',
    publishedOn: '2023-02-01',
    year: 2023,
    description: 'Describes a novel LPL gene mutation in a neonate and reviews its clinical implications.',
    topics: ['Genetics and rare disease', 'Pediatric endocrinology', 'Metabolic research'],
    authorSlugs: ['dr-pratibha-aute', 'dr-tukaram-aute'],
    externalUrl: 'https://bnrc.springeropen.com/articles/10.1186/s42269-023-00991-5',
  },
  {
    id: 'psma-pet-polyostotic-fibrous-dysplasia',
    title: '68Ga-PSMA-HBED-CC PET/CT Findings in a Patient of Polyostotic Fibrous Dysplasia.',
    journal: 'Clinical Nuclear Medicine',
    dateLabel: '1 July 2021',
    publishedOn: '2021-07-01',
    year: 2021,
    description: 'Explores 68Ga-PSMA PET/CT findings in polyostotic fibrous dysplasia and their diagnostic implications.',
    topics: ['Bone and mineral health', 'Endocrine imaging'],
    authorSlugs: ['dr-pratibha-aute'],
    externalUrl: 'https://pubmed.ncbi.nlm.nih.gov/33417342/',
  },
  {
    id: 'hyperhomocysteinemia-coronary-artery-disease',
    title: 'To Evaluate the Significance of Hyperhomocysteinemia in Patients with Coronary Artery Disease.',
    journal: 'International Journal of Science and Research',
    dateLabel: 'November 2020',
    publishedOn: '2020-11-01',
    year: 2020,
    description: 'Assesses raised homocysteine as a risk marker in patients presenting with coronary artery disease.',
    topics: ['Coronary artery disease', 'Metabolic research'],
    authorSlugs: ['dr-tukaram-aute'],
  },
  {
    id: 'pneumopericardium-case-report',
    title: 'Pneumopericardium: A Case Report.',
    journal: 'International Journal of Science and Research',
    dateLabel: 'November 2020',
    publishedOn: '2020-11-01',
    year: 2020,
    description: 'Describes the presentation, imaging findings, and management of air within the pericardial sac.',
    topics: ['Interventional cardiology', 'Endocrine imaging'],
    authorSlugs: ['dr-tukaram-aute'],
  },
  {
    id: 'precious-precocious-case-report',
    title: 'Precious Precocious: A Case Report.',
    journal: 'International Journal of Current Medical and Applied Sciences',
    dateLabel: '1 January 2018',
    publishedOn: '2018-01-01',
    year: 2018,
    description: 'Examines a pediatric case of early puberty, including etiological evaluation and management considerations.',
    topics: ['Pediatric endocrinology', 'Reproductive endocrinology'],
    authorSlugs: ['dr-pratibha-aute'],
  },
  {
    id: 'lutembacher-syndrome-transcatheter-treatment',
    title: 'Percutaneous Transcatheter Treatment of Lutembacher Syndrome: A Case Report.',
    journal: 'International Journal of Science and Research',
    dateLabel: 'July 2016',
    publishedOn: '2016-07-01',
    year: 2016,
    description: 'Reports catheter-based treatment of a combined atrial septal defect and mitral stenosis without open surgery.',
    topics: ['Interventional cardiology', 'Congenital and structural heart disease'],
    authorSlugs: ['dr-tukaram-aute'],
  },
  {
    id: 'asymmetrical-ovarian-enlargement',
    title: 'Asymmetrical Ovarian Enlargement: Caught Timely Before the Cut!',
    journal: 'Journal of Pediatric and Adolescent Gynecology',
    dateLabel: '1 June 2015',
    publishedOn: '2015-06-01',
    year: 2015,
    description: 'Explores differential diagnoses of ovarian enlargement and the importance of avoiding unnecessary surgical intervention.',
    topics: ['Pediatric endocrinology', 'Reproductive endocrinology'],
    authorSlugs: ['dr-pratibha-aute'],
    externalUrl: 'https://www.sciencedirect.com/science/article/abs/pii/S1083318814002587',
  },
  {
    id: 'solitary-thyroid-nodule-clinical-approach',
    title: 'Solitary Thyroid Nodule: A Clinical Approach.',
    dateLabel: '1 August 2014',
    publishedOn: '2014-08-01',
    year: 2014,
    description: 'Discusses a practical, step-by-step approach to evaluating and managing a solitary thyroid nodule.',
    topics: ['Thyroid'],
    authorSlugs: ['dr-pratibha-aute'],
    externalUrl: 'https://www.aijoc.com/abstractArticleContentBrowse/AIJOC/7/6/1/472/abstractArticle/Article',
  },
  {
    id: 'trilogy-of-fallot-transcatheter-valvuloplasty',
    title: 'Simultaneous Transcatheter Valvuloplasty and Atrial Septal Occlusion in Cases of Trilogy of Fallot.',
    journal: 'Journal of Clinical and Experimental Cardiology',
    dateLabel: '2014',
    publishedOn: '2014-03-01',
    year: 2014,
    description: 'Describes a single-sitting catheter approach combining pulmonary valvuloplasty with atrial septal device closure in trilogy of Fallot.',
    topics: ['Interventional cardiology', 'Congenital and structural heart disease'],
    authorSlugs: ['dr-tukaram-aute'],
  },
  {
    id: 'disorders-sex-development-ambiguous-genitalia',
    title: 'Etiology and clinical profile of children and adolescents with disorders of sex development (DSD) presenting with ambiguous external genitalia.',
    journal: 'International Journal of Pediatric Endocrinology',
    dateLabel: '3 August 2013',
    publishedOn: '2013-08-03',
    year: 2013,
    description: 'Investigates causes of disorders of sex development and provides insight into their clinical presentation and management.',
    topics: ['Pediatric endocrinology', 'Reproductive endocrinology', 'Genetics and rare disease'],
    authorSlugs: ['dr-pratibha-aute'],
    externalUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3850259/',
  },
  {
    id: 'laryngeal-oedema-radioiodine-thyroid-cancer',
    title: 'Laryngeal Oedema as an Uncommon Side Effect of Radioiodine Therapy for Thyroid Cancer.',
    journal: 'The Indian Practitioner',
    dateLabel: '1 June 2013',
    publishedOn: '2013-06-01',
    year: 2013,
    description: 'Presents a rare complication of radioiodine therapy and emphasizes careful clinical monitoring.',
    topics: ['Thyroid'],
    authorSlugs: ['dr-pratibha-aute'],
  },
  {
    id: 'not-all-low-tsh-graves-disease',
    title: 'Not All Low TSH is Graves’ Disease!',
    journal: 'International Journal of Otorhinolaryngology Clinics',
    dateLabel: '1 January 2012',
    publishedOn: '2012-01-01',
    year: 2012,
    description: 'Highlights differential diagnoses for a low TSH result and the importance of clinical and biochemical evaluation.',
    topics: ['Thyroid'],
    authorSlugs: ['dr-pratibha-aute'],
    externalUrl: 'https://www.aijoc.com/doi/pdf/10.5005/jp-journals-10003-1147',
  },
  {
    id: 'vitamin-d3-supplementation-protocols',
    title: 'Study of various vitamin D3 supplementation protocols in healthy adult volunteers with hypovitaminosis D.',
    journal: 'Indian Journal of Endocrinology and Metabolism',
    dateLabel: '1 January 2012',
    publishedOn: '2012-01-01',
    year: 2012,
    description: 'Examines different vitamin D3 dosing schedules and their efficacy in correcting vitamin D deficiency.',
    topics: ['Bone and mineral health', 'Metabolic research'],
    authorSlugs: ['dr-pratibha-aute'],
  },
  {
    id: 'vitamin-d-deficiency-pregnancy-gestational-diabetes',
    title: 'Prevalence of Vitamin D deficiency in pregnancy and its correlation with the development of gestational diabetes mellitus.',
    journal: 'Indian Journal of Endocrinology and Metabolism',
    dateLabel: 'Publication date not supplied',
    description: 'Explores the relationship between vitamin D deficiency during pregnancy and the development of gestational diabetes mellitus.',
    topics: ['Bone and mineral health', 'Metabolic research', 'Reproductive endocrinology'],
    authorSlugs: ['dr-pratibha-aute'],
  },
  {
    id: 'primary-hypothyroidism-urban-tertiary-care-audit',
    title: 'Primary hypothyroidism: An audit from an urban tertiary care center in Mumbai.',
    journal: 'Indian Journal of Endocrinology and Metabolism (Abstracts)',
    dateLabel: 'Publication date not supplied',
    description: 'Analyzes the clinical profile and outcomes of primary hypothyroidism cases in an urban tertiary-care setting.',
    topics: ['Thyroid'],
    authorSlugs: ['dr-pratibha-aute'],
  },
];

export const publicationTopics = Array.from(
  new Set(researchPublications.flatMap((publication) => publication.topics))
).sort() as PublicationTopic[];

export const publicationYears = Array.from(
  new Set(researchPublications.map((publication) => publication.year).filter((year): year is number => Boolean(year)))
).sort((a, b) => b - a);

export function publicationsForDoctor(slug: string): ResearchPublication[] {
  return researchPublications.filter((publication) =>
    (publication.authorSlugs as readonly string[]).includes(slug)
  );
}

export function publicationTopicsForDoctor(slug: string): PublicationTopic[] {
  return Array.from(
    new Set(publicationsForDoctor(slug).flatMap((publication) => publication.topics))
  ).sort() as PublicationTopic[];
}
