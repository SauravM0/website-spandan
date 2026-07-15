const packageSlugAliases: Record<string, string> = {
  'advance-cardiac-package': 'advanced-cardiac-package',
  'basic-cardiac-package': 'cardiac-package',
  'diabetes-management-package': 'diabetic-package',
  'full-body-checkup': 'full-body-check-up-package',
};

export function canonicalPackageSlug(slug: string) {
  return packageSlugAliases[slug] || slug;
}
