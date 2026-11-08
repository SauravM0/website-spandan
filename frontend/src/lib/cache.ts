/**
 * Caching policy for the public pages.
 *
 * The package and facility pages previously fetched with `cache: 'no-store'`,
 * so every visitor triggered a fresh render and a fresh database round trip.
 * With a connection pool of ten per replica that makes concurrency the limiting
 * factor long before anything else does: a few hundred simultaneous readers
 * queue on the pool and start timing out.
 *
 * Package content changes when a staff member edits it, which is rare and never
 * urgent to the second, so it is served from a regenerating cache instead. The
 * `packages` tag lets an admin write revalidate it immediately rather than
 * waiting for the window to lapse.
 */

/** Catalogue content: rebuilt at most once every five minutes per route. */
export const PACKAGE_REVALIDATE_SECONDS = 300;

/** Equipment and facility records: curated in-repo, so they move even less. */
export const FACILITY_REVALIDATE_SECONDS = 600;

/** `next` carries Next.js' fetch extensions; RequestInit alone does not type them. */
type CachePolicy = RequestInit & { next: { revalidate: number; tags: string[] } };

export const PACKAGE_CACHE: CachePolicy = {
  next: { revalidate: PACKAGE_REVALIDATE_SECONDS, tags: ['packages'] },
};

export const FACILITY_CACHE: CachePolicy = {
  next: { revalidate: FACILITY_REVALIDATE_SECONDS, tags: ['packages'] },
};
