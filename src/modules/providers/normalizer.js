import { formatProduct as formatAmazon } from './plugins/amazon/formatter.js';
import { formatProduct as formatFlipkart } from './plugins/flipkart/formatter.js';

/**
 * Normalizes raw product data from any store using its corresponding formatter plugin.
 * @param {Object} rawData - The raw product object to format.
 * @param {string} store - The store name ('Amazon', etc.)
 * @returns {Object} Unified product format.
 */
export function normalizeProduct(rawData, store) {
  if (!store) {
    throw new Error('[Normalizer] Cannot normalize product without a store specifier.');
  }

  const s = store.toLowerCase();
  switch (s) {
    case 'amazon': {
      const formatted = formatAmazon(rawData);
      formatted.reviewCount = rawData.reviewCount || null;
      return formatted;
    }
    case 'flipkart': {
      const formatted = formatFlipkart(rawData);
      formatted.reviewCount = rawData.reviewCount || null;
      return formatted;
    }
    case 'myntra':
    case 'ajio':
    case 'meesho': {
      const cleanVal = (val) => {
        if (val === undefined || val === null) return null;
        if (typeof val === 'number') return val;
        const cleanStr = String(val).replace(/[₹$,\s]/g, '');
        const num = parseFloat(cleanStr);
        return isNaN(num) ? null : num;
      };
      return {
        externalId: rawData.externalId || rawData.id || null,
        title: rawData.title ? String(rawData.title).trim() : `${store} Product`,
        imageUrl: rawData.imageUrl || rawData.image || null,
        originalPrice: cleanVal(rawData.originalPrice || rawData.mrp),
        salePrice: cleanVal(rawData.salePrice || rawData.price),
        rating: parseFloat(rawData.rating) || 4.2,
        reviewCount: rawData.reviewCount ? parseInt(rawData.reviewCount, 10) : null,
        store: store,
        rawUrl: rawData.rawUrl || rawData.url || null
      };
    }
    default:
      throw new Error(`[Normalizer] Normalization not supported for store: "${store}"`);
  }
}
