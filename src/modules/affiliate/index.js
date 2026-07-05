import { supabase } from '../../database/supabase.js';
import { convertToAffiliate as convertAmazon } from '../providers/plugins/amazon/affiliate.js';
import { convertToAffiliate as convertFlipkart } from '../providers/plugins/flipkart/affiliate.js';

/**
 * Builds an affiliate URL for a product, pulling tracking configuration from database.
 * Supports direct store configs, Cuelinks, and EarnKaro redirects.
 * @param {string} url - The raw product URL.
 * @param {string} store - The store name ('Amazon', 'Flipkart', etc.).
 * @param {string} [customTag] - Override tag to use instead of database settings.
 * @returns {Promise<string>} The converted affiliate URL.
 */
export async function getAffiliateLink(url, store, customTag = null) {
  if (!store) {
    throw new Error('[AffiliateEngine] Store must be specified to build link.');
  }

  const storeKey = store.toLowerCase();

  try {
    // Retrieve configs in a single query
    const { data: settingsData } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['cuelinks_config', 'earnkaro_config', `${storeKey}_config`]);

    const settings = {};
    if (settingsData) {
      settingsData.forEach(row => {
        settings[row.key] = row.value;
      });
    }

    const fkConfig = settings['flipkart_config'] || {};
    const useDirectFlipkart = storeKey === 'flipkart' && fkConfig.use_api === true;

    // 1. If Cuelinks is configured and the store is not Amazon or direct Flipkart, wrap in Cuelinks redirect
    if (settings.cuelinks_config && settings.cuelinks_config.pub_id) {
      if (storeKey !== 'amazon' && !useDirectFlipkart) {
        console.log(`[AffiliateEngine] Using Cuelinks sub-affiliate for ${store}`);
        return `https://cuelinks.com/link?url=${encodeURIComponent(url)}&pub_id=${settings.cuelinks_config.pub_id}`;
      }
    }

    // 2. If EarnKaro is configured and the store is not Amazon or direct Flipkart, wrap in EarnKaro redirect
    if (settings.earnkaro_config && settings.earnkaro_config.ref_id) {
      if (storeKey !== 'amazon' && !useDirectFlipkart) {
        console.log(`[AffiliateEngine] Using EarnKaro sub-affiliate for ${store}`);
        return `https://earnkaro.com/sharedeal?dl=${encodeURIComponent(url)}&r=${settings.earnkaro_config.ref_id}`;
      }
    }

    // 3. Fallback to direct store affiliate credentials
    const storeConfig = settings[`${storeKey}_config`] || {};
    const finalTag = customTag || storeConfig.tag || storeConfig.affid || null;

    switch (storeKey) {
      case 'amazon':
        return convertAmazon(url, finalTag);
      case 'flipkart':
        return convertFlipkart(url, finalTag);
      default:
        console.warn(`[AffiliateEngine] Store "${store}" has no Cuelinks/EarnKaro/direct config. Returning raw URL.`);
        return url;
    }
  } catch (err) {
    console.error('[AffiliateEngine] Error building affiliate link:', err.message);
    return url;
  }
}
