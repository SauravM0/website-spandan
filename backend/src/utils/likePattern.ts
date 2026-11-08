/**
 * Escapes LIKE/ILIKE metacharacters so user input is matched literally.
 *
 * The search term is already bound as a parameter, so this is not about SQL
 * injection. Without it, `%` and `_` act as wildcards: a visitor searching for
 * `%` would match every article, and `_` matches any single character. The
 * backslash is escaped first so the escapes added below are not themselves
 * re-escaped.
 */
const LIKE_METACHARACTERS = /[\\%_]/g;

export function escapeLikePattern(input: string): string {
  return input.replace(LIKE_METACHARACTERS, (match) => '\\' + match);
}

/** A contains-match pattern for ILIKE, with the user's text taken literally. */
export function containsPattern(input: string): string {
  return '%' + escapeLikePattern(input) + '%';
}
