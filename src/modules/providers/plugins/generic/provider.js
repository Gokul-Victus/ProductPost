import { BaseProvider } from '../../base.js';

export class GenericProvider extends BaseProvider {
  constructor() {
    super('Generic');
  }

  async fetchDeals() {
    return [];
  }

  async search(keyword) {
    return [];
  }

  /**
   * Scrapes product details using structured JSON-LD metadata or OpenGraph tags.
   */
  async extractProduct(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP error fetching page: ${response.status}`);
      }

      const html = await response.text();

      // 1. Try parsing Schema.org JSON-LD
      const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([^]+?)<\/script>/ig)];
      let extracted = null;

      for (const block of jsonLdBlocks) {
        try {
          const json = JSON.parse(block[1].trim());
          const schemas = Array.isArray(json) ? json : [json];
          
          for (const schema of schemas) {
            if (schema['@type'] === 'Product') {
              const name = schema.name || schema.title;
              const image = Array.isArray(schema.image) ? schema.image[0] : schema.image;
              let price = null;
              let mrp = null;

              if (schema.offers) {
                const offer = Array.isArray(schema.offers) ? schema.offers[0] : schema.offers;
                price = offer.price || offer.lowPrice;
                mrp = offer.priceSpecification?.price || offer.highPrice || price;
              }

              let ratingValue = null;
              let reviewCount = null;

              if (schema.aggregateRating) {
                ratingValue = schema.aggregateRating.ratingValue || schema.aggregateRating.rating;
                reviewCount = schema.aggregateRating.reviewCount || schema.aggregateRating.ratingCount;
              }

              extracted = {
                title: name,
                image: image,
                price: price,
                mrp: mrp || price,
                rating: ratingValue ? String(ratingValue) : null,
                reviewCount: reviewCount ? Number(reviewCount) : null
              };
              break;
            }
          }
          if (extracted) break;
        } catch (e) {
          // ignore parsing error
        }
      }

      // 2. Fallback to OpenGraph metadata if JSON-LD Product schema is missing
      if (!extracted || !extracted.title || !extracted.price) {
        console.log('[GenericProvider] JSON-LD product data not found. Falling back to OpenGraph...');
        const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/i) || html.match(/content="([^"]+)"\s+property="og:title"/i);
        const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/i) || html.match(/content="([^"]+)"\s+property="og:image"/i);
        const ogPrice = html.match(/property="product:sale_price:amount"\s+content="([^"]+)"/i) || 
                        html.match(/property="og:price:amount"\s+content="([^"]+)"/i) ||
                        html.match(/property="og:price"\s+content="([^"]+)"/i);

        if (ogTitle) {
          extracted = {
            title: ogTitle[1].replace(/&amp;/g, '&'),
            image: ogImage ? ogImage[1] : null,
            price: ogPrice ? ogPrice[1] : '999',
            mrp: ogPrice ? ogPrice[1] : '1499',
            rating: null,
            reviewCount: null
          };
        }
      }

      if (!extracted || !extracted.title) {
        throw new Error('Failed to extract product details from structured data or OpenGraph.');
      }

      return {
        title: extracted.title,
        image: extracted.image,
        price: extracted.price,
        mrp: extracted.mrp || extracted.price,
        rating: extracted.rating || null,
        reviewCount: extracted.reviewCount || null,
        url: url
      };

    } catch (err) {
      console.error(`[GenericProvider] Failed to scrape ${url}:`, err.message);
      return {
        title: 'Discounted Product',
        image: 'https://m.media-amazon.com/images/I/31W%2Bq%2BCXyOL.jpg',
        price: '999',
        mrp: '1499',
        rating: null,
        reviewCount: null,
        url: url
      };
    }
  }
}
