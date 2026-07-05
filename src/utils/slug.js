/**
 * Generates a short, unique alphanumeric slug for click tracking redirects.
 * @param {number} [length] - Length of the slug (default: 6).
 * @returns {string} The random slug.
 */
export function generateRandomSlug(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

/**
 * Creates a URL-friendly slug from a text title.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word characters
    .replace(/[\s_]+/g, '-')  // replace spaces with hyphens
    .replace(/^-+|-+$/g, ''); // trim hyphens
}
