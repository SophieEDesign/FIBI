/**
 * Slug helpers for public trip boards.
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'trip'
}

export function uniqueSlug(base: string, suffix?: string): string {
  const s = slugify(base)
  if (!suffix) return s
  return `${s}-${suffix}`.slice(0, 72)
}
