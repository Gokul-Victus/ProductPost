import { AmazonProvider } from './plugins/amazon/provider.js';
import { FlipkartProvider } from './plugins/flipkart/provider.js';
import { GenericProvider } from './plugins/generic/provider.js';

class ProviderManager {
  constructor() {
    this.providers = {
      amazon: new AmazonProvider(),
      flipkart: new FlipkartProvider(),
      generic: new GenericProvider()
    };
  }

  /**
   * Retrieves a specific store provider.
   * @param {string} store - Name of the store (e.g. 'Amazon').
   * @returns {BaseProvider} The store provider plugin instance.
   */
  getProvider(store) {
    if (!store) return null;
    const provider = this.providers[store.toLowerCase()] || this.providers.generic;
    return provider;
  }

  /**
   * Retrieves all registered store providers.
   * @returns {Array<BaseProvider>}
   */
  getAllProviders() {
    return Object.values(this.providers);
  }
}

export const providerManager = new ProviderManager();
export { BaseProvider } from './base.js';
