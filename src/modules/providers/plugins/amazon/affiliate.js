import { config } from './config.js';

/**
 * Converts a raw Amazon product URL to an affiliate URL.
 * @param {string} url - The raw product URL.
 * @param {string} [tag] - The affiliate tag (uses default config tag if omitted).
 * @returns {string} The formatted Amazon affiliate URL.
 */
export function convertToAffiliate(url, tag) {
  const activeTag = tag || config.defaultTag;
  
  if (!url) return '';

  // Match ASIN: 10 alphanumeric characters after /dp/, /gp/product/, /d/, etc.
  const asinMatch = url.match(/(?:\/dp\/|\/gp\/product\/|\/d\/)([A-Z0-9]{10})(?:\/|\?|$)/i);
  
  if (asinMatch && asinMatch[1]) {
    const asin = asinMatch[1].toUpperCase();
    // Build clean affiliate link
    return `https://www.amazon.in/dp/${asin}/?tag=${activeTag}`;
  }
  
  // Fallback: If ASIN is not parsed, append or replace the tag parameter
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('tag', activeTag);
    return urlObj.toString();
  } catch (e) {
    // If not a valid URL, append string-wise
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tag=${activeTag}`;
  }
}

/**
 * Extracts ASIN from Amazon URL.
 * @param {string} url
 * @returns {string|null} ASIN or null
 */
export function extractAsin(url) {
  const asinMatch = url.match(/(?:\/dp\/|\/gp\/product\/|\/d\/)([A-Z0-9]{10})(?:\/|\?|$)/i);
  return asinMatch ? asinMatch[1].toUpperCase() : null;
}

/**
 * Normalizes Amazon image URLs to retrieve the master high-resolution original file.
 * Strips resolution parameters like ._AC_SX385_ or ._SL1500_ before the extension.
 * @param {string} url - Amazon image URL.
 * @returns {string} Clean high-resolution image URL.
 */
export function getAmazonHighResImage(url) {
  if (!url) return url;
  return url.replace(/\._[A-Z0-9_-]+_\.(jpg|png|jpeg|gif)$/i, '.$1');
}
