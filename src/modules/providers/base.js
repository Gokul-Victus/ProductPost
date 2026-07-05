/**
 * Base class for all product providers.
 * All marketplace plugins (Amazon, Flipkart, etc.) must extend this class
 * and implement its interface methods.
 */
export class BaseProvider {
  constructor(name) {
    this.name = name; // e.g., 'Amazon', 'Flipkart'
  }

  /**
   * Fetches raw deals or featured products from the store.
   * @returns {Promise<Array<Object>>} List of raw, unnormalized products.
   */
  async fetchDeals() {
    throw new Error(`fetchDeals() is not implemented for provider "${this.name}"`);
  }

  /**
   * Searches for a product on the store by keyword.
   * @param {string} keyword - Search term.
   * @returns {Promise<Array<Object>>} List of search results (raw).
   */
  async search(keyword) {
    throw new Error(`search() is not implemented for provider "${this.name}"`);
  }

  /**
   * Extracts raw product information from a specific product URL.
   * Useful for manual posting.
   * @param {string} url - Product page URL.
   * @returns {Promise<Object>} Raw product details.
   */
  async extractProduct(url) {
    throw new Error(`extractProduct() is not implemented for provider "${this.name}"`);
  }
}
