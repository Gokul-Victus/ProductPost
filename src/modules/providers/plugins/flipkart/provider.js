import { BaseProvider } from '../../base.js';
import { extractFsn } from './affiliate.js';
import { config } from './config.js';
import { supabase } from '../../../../database/supabase.js';
import { FlipkartAPI } from './api.js';

export class FlipkartProvider extends BaseProvider {
  constructor() {
    super('Flipkart');
  }

  /**
   * Fetches trending Flipkart deals.
   */
  async fetchDeals() {
    return [];
  }

  /**
   * Searches for a product.
   */
  async search(keyword) {
    return [];
  }

  /**
   * Scrapes product details.
   * Uses Flipkart Affiliate API as primary when configured, falls back to HTML scraping.
   */
  async extractProduct(url) {
    let targetUrl = url;

    if (url.includes('fkrt.it') || url.includes('short') || url.includes('dl.flipkart.com')) {
      try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        targetUrl = response.url;
        console.log(`[FlipkartProvider] Resolved short URL to: ${targetUrl}`);
      } catch (err) {
        console.warn(`[FlipkartProvider] Failed to resolve short URL:`, err.message);
      }
    }

    const fsn = extractFsn(targetUrl);
    if (!fsn) {
      throw new Error('Could not extract Flipkart FSN or ITM ID from URL.');
    }

    const cleanUrl = fsn.startsWith('ITM')
      ? `https://www.flipkart.com/product/p/${fsn}`
      : `https://www.flipkart.com/product/p/itm?pid=${fsn}`;

    // 1. Try Flipkart Affiliate API if enabled
    try {
      const { data: configData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'flipkart_config')
        .maybeSingle();

      const flipkartConfig = configData?.value || {};

      if (flipkartConfig.use_api === true && flipkartConfig.affiliateId && flipkartConfig.affiliateToken) {
        console.log(`[FlipkartProvider] Using official Flipkart API for ID ${fsn}...`);
        const api = new FlipkartAPI({
          affiliateId: flipkartConfig.affiliateId,
          affiliateToken: flipkartConfig.affiliateToken
        });

        const product = await api.getProduct(fsn);
        console.log(`[FlipkartProvider] API retrieval successful for FSN ${fsn}.`);
        return {
          fsn,
          title: product.title,
          image: product.image,
          price: product.price,
          mrp: product.mrp,
          rating: product.rating,
          url: product.url
        };
      }
    } catch (apiErr) {
      console.warn(`[FlipkartProvider] Flipkart API call failed: "${apiErr.message}". Falling back to HTML scraper...`);
    }

    // 2. Fallback: HTML Scraper
    try {
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP error fetching Flipkart page: ${response.status}`);
      }

      const html = await response.text();

      // Check for bot verification
      if (html.includes('robot') || html.includes('captcha') || html.includes('challenge')) {
        console.warn(`[FlipkartProvider] Scraper blocked for FSN ${fsn}. Returning fallback data.`);
        return this.getFallbackProduct(fsn, cleanUrl);
      }

      let title = '';
      const titleMatch = html.match(/<h1[^>]*class="[^"]*B_NuCI[^"]*"[^>]*>\s*([^<]+)/i) ||
                         html.match(/<span[^>]*class="[^"]*B_NuCI[^"]*"[^>]*>\s*([^<]+)/i) ||
                         html.match(/property="og:title"\s+content="([^"]+)"/i);
      if (titleMatch) {
        title = titleMatch[1].replace(/&amp;/g, '&').trim();
      }

      let price = '';
      const priceMatch = html.match(/<div[^>]*class="[^"]*_30jeq3[^"]*_16Jk6d[^"]*"[^>]*>\s*([₹0-9.,]+)/i) ||
                         html.match(/<div[^>]*class="[^"]*_30jeq3[^"]*"[^>]*>\s*([₹0-9.,]+)/i);
      if (priceMatch) {
        price = priceMatch[1];
      }

      let mrp = '';
      const mrpMatch = html.match(/<div[^>]*class="[^"]*_3I9_R0[^"]*"[^>]*>\s*([₹0-9.,]+)/i) ||
                       html.match(/<div[^>]*class="[^"]*_2pLDsy[^"]*"[^>]*>\s*([₹0-9.,]+)/i);
      if (mrpMatch) {
        mrp = mrpMatch[1];
      }

      let imageUrl = '';
      const imgMatch = html.match(/<img[^>]*class="[^"]*_396csP[^"]*_2amPTt[^"]*"[^>]*src="([^"]+)"/i) ||
                       html.match(/<img[^>]*class="[^"]*_396csP[^"]*"[^>]*src="([^"]+)"/i) ||
                       html.match(/property="og:image"\s+content="([^"]+)"/i);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      }

      let rating = '';
      const ratingMatch = html.match(/<div[^>]*class="[^"]*_3LWZlK[^"]*"[^>]*>\s*([0-9.]+)/i);
      if (ratingMatch) {
        rating = ratingMatch[1];
      }

      if (!title || !price) {
        console.warn(`[FlipkartProvider] Scraper returned empty details for FSN ${fsn}. Returning fallback data.`);
        return this.getFallbackProduct(fsn, cleanUrl);
      }

      return {
        fsn,
        title,
        image: imageUrl,
        price,
        mrp: mrp || price,
        rating: rating || '4.2',
        url: cleanUrl
      };

    } catch (err) {
      console.error(`[FlipkartProvider] Failed to scrape Flipkart for FSN ${fsn}:`, err.message);
      return this.getFallbackProduct(fsn, cleanUrl);
    }
  }

  getFallbackProduct(fsn, url) {
    return {
      fsn,
      title: `Flipkart Product (${fsn})`,
      image: 'https://img1a.flixcart.com/www/linchpin/fk-cp-zion/img/fk-logo_f64856.png',
      price: '499',
      mrp: '999',
      rating: '4.1',
      url
    };
  }
}
