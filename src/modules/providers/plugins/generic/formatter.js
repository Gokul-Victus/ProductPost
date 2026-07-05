export function formatProduct(rawData) {
  const cleanPrice = (val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/[₹$,\s]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  };

  return {
    externalId: rawData.externalId || rawData.id || null,
    title: rawData.title ? String(rawData.title).trim() : 'Generic Product',
    imageUrl: rawData.imageUrl || rawData.image || null,
    originalPrice: cleanPrice(rawData.originalPrice || rawData.mrp),
    salePrice: cleanPrice(rawData.salePrice || rawData.price),
    rating: parseFloat(rawData.rating) || 4.2,
    store: rawData.store || 'Generic',
    rawUrl: rawData.rawUrl || rawData.url || null
  };
}