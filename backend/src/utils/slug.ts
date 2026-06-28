const slugRegex = /^[a-z0-9-]+$/;

export function isValidSlug(slug: string): boolean {
  return slugRegex.test(slug) && slug.length >= 1 && slug.length <= 200;
}
