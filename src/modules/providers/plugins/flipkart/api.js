/**
 * Client for Flipkart Affiliate API.
 */
export class FlipkartAPI {
  constructor(config = {}) {
    this.affiliateId = config.affiliateId;
    this.affiliateToken = config.affiliateToken;
  }

  /**
   * Retrieves product details from Flipkart Affiliate API.
   * @param {string} productId - The Flipkart Product ID (PID/FSN).
   * @returns {Promise<Object>} The parsed product details.
   */
  async getProduct(productId) {
    if (!this.affiliateId || !this.affiliateToken) {
      throw new Error('[FlipkartAPI] Credentials missing. Add Flipkart API credentials to settings.');
    }

    const url = `https://affiliate-api.flipkart.net/affiliate/1.0/product.json?id=${productId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Fk-Affiliate-Id': this.affiliateId,
        'Fk-Affiliate-Token': this.affiliateToken,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || `Flipkart API HTTP ${response.status}`);
    }

    const info = data?.productBaseInfoV1;
    if (!info) {
      throw new Error('[FlipkartAPI] Product attributes not found in API response.');
    }

    const attr = info.productAttributes;
    const title = attr?.title || 'Flipkart Product';
    
    // Choose the largest available image
    const imgs = attr?.imageUrls || {};
    const image = imgs['800x800'] || imgs['400x400'] || imgs['unknown'] || 'https://m.media-amazon.com/images/I/31W%2Bq%2BCXyOL.jpg';

    const price = attr?.sellingPrice?.amount || '999';
    const mrp = attr?.maximumRetailPrice?.amount || price;

    return {
      externalId: productId,
      title,
      image,
      price: String(price),
      mrp: String(mrp),
      rating: '4.2',
      url: attr?.productUrl || `https://www.flipkart.com/product/p/itm?pid=${productId}`
    };
  }
}
