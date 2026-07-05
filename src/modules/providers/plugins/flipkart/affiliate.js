import { config } from './config.js';

/**
 * Converts a raw Flipkart product URL to a deep-linked affiliate URL.
 * @param {string} url - The raw product URL.
 * @param {string} [affid] - The affiliate ID (uses default config affid if omitted).
 * @returns {string} The formatted Flipkart affiliate URL.
 */
export function convertToAffiliate(url, affid) {
  const activeAffid = affid || config.defaultAffid;
  
  if (!url) return '';

  const fsn = extractFsn(url);
  
  if (fsn) {
    // Build clean deep-linked affiliate link using dl.flipkart.com
    // itm or pid is passed. If it is an itm code, we open the item page
    const baseUrl = fsn.startsWith('ITM')
      ? `https://dl.flipkart.com/dl/product/p/${fsn}`
      : `https://dl.flipkart.com/dl/product/p/itm?pid=${fsn}`;
      
    return `${baseUrl}&affid=${activeAffid}`;
  }

  // Fallback: append/replace affid query parameter
  try {
    const urlObj = new URL(url);
    // Replace www.flipkart.com with dl.flipkart.com for deep linking
    if (urlObj.hostname === 'www.flipkart.com') {
      urlObj.hostname = 'dl.flipkart.com';
      if (!urlObj.pathname.startsWith('/dl/')) {
        urlObj.pathname = `/dl${urlObj.pathname}`;
      }
    }
    urlObj.searchParams.set('affid', activeAffid);
    return urlObj.toString();
  } catch (e) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}affid=${activeAffid}`;
  }
}

/**
 * Extracts FSN (Flipkart Product ID) or ITM code from Flipkart URL.
 * @param {string} url
 * @returns {string|null} FSN or null
 */
export function extractFsn(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const pid = urlObj.searchParams.get('pid');
    if (pid) return pid.toUpperCase();
  } catch (e) {
    // ignore and use regex
  }

  // Look for ?pid=XXXXXXXXXXXXXXXX (16 chars)
  const pidMatch = url.match(/[?&]pid=([A-Z0-9]{16})/i);
  if (pidMatch) return pidMatch[1].toUpperCase();

  // Look for /p/itmxxxxxxxxxxxx (12+ chars)
  const itmMatch = url.match(/\/p\/(itm[A-Z0-9]+)/i);
  if (itmMatch) return itmMatch[1].toUpperCase();

  return null;
}
