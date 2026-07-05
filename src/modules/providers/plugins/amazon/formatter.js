/**
 * Normalizes Amazon-specific raw data into the unified platform product format.
 * @param {Object} rawData - Scraped or API raw product data.
 * @returns {Object} Normalized product representation.
 */
export function formatProduct(rawData) {
  const cleanPrice = (val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return val;
    
    // Remove currency symbols, commas, and whitespace
    const cleanStr = String(val).replace(/[₹$,\s]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  };

  const cleanRating = (val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return val;

    // Match numbers like "4.5" from "4.5 out of 5 stars"
    const match = String(val).match(/([0-9.]+)/);
    if (match) {
      const num = parseFloat(match[1]);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  return {
    externalId: rawData.externalId || rawData.asin || null,
    title: rawData.title ? String(rawData.title).trim() : 'Amazon Product',
    imageUrl: rawData.imageUrl || rawData.image || null,
    originalPrice: cleanPrice(rawData.originalPrice || rawData.mrp),
    salePrice: cleanPrice(rawData.salePrice || rawData.price),
    rating: cleanRating(rawData.rating),
    store: 'Amazon',
    rawUrl: rawData.rawUrl || rawData.url || null
  };
}
