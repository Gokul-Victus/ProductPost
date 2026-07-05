import { publishToTelegram } from './channels/telegram.js';
import { publishToWhatsApp } from './channels/whatsapp.js';

class PublisherManager {
  constructor() {
    // Map of active channel publishers
    this.publishers = {
      telegram: publishToTelegram,
      whatsapp: publishToWhatsApp
    };
  }

  /**
   * Publishes a deal package to a specified platform channel.
   * @param {string} channel - Channel identifier ('telegram', etc.)
   * @param {Object} data - Payload data for publishing.
   * @param {string} data.title - Fallback title.
   * @param {string} [data.imageUrl] - Image URL.
   * @param {string} data.affiliateUrl - Destination URL.
   * @param {string} data.formattedContent - Platform-specific formatted markup.
   * @returns {Promise<Object>} Response object containing message ID.
   */
  async publish(channel, data) {
    const publishFunc = this.publishers[channel.toLowerCase()];
    if (!publishFunc) {
      throw new Error(`[PublisherManager] Channel "${channel}" is not registered or supported.`);
    }
    return publishFunc(data);
  }
}

export const publisherManager = new PublisherManager();
