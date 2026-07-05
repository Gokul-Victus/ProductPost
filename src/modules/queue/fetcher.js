import { supabase } from '../../database/supabase.js';
import { eventBus } from '../events/bus.js';
import { providerManager } from '../providers/index.js';
import { normalizeProduct } from '../providers/normalizer.js';
import { enqueueProduct } from './manager.js';
import { extractAsin } from '../providers/plugins/amazon/affiliate.js';
import { extractFsn } from '../providers/plugins/flipkart/affiliate.js';
import { sendAdminAlert } from '../publisher/channels/telegram.js';
import https from 'https';

/**
 * Helper to identify store and parse external product ID from raw URL.
 */
export function identifyStoreAndId(url) {
  const l = url.toLowerCase();
  
  if (l.includes('amazon') || l.includes('amzn')) {
    const asin = extractAsin(url);
    return asin ? { store: 'Amazon', externalId: asin, cleanUrl: `https://www.amazon.in/dp/${asin}` } : null;
  }
  
  if (l.includes('flipkart') || l.includes('fkrt')) {
    const fsn = extractFsn(url);
    return fsn ? { store: 'Flipkart', externalId: fsn, cleanUrl: fsn.startsWith('ITM') ? `https://www.flipkart.com/product/p/${fsn}` : `https://www.flipkart.com/product/p/itm?pid=${fsn}` } : null;
  }
  
  if (l.includes('myntra.com')) {
    const match = url.match(/\/([0-9]+)\/buy/i) || url.match(/\/([0-9]+)(?:\?|$)/i);
    const id = match ? match[1] : null;
    return id ? { store: 'Myntra', externalId: id, cleanUrl: `https://www.myntra.com/${id}` } : null;
  }
  
  if (l.includes('ajio.com')) {
    const match = url.match(/\/p\/([a-zA-Z0-9_]+)/i);
    const id = match ? match[1] : null;
    return id ? { store: 'Ajio', externalId: id, cleanUrl: `https://www.ajio.com/p/${id}` } : null;
  }
  
  if (l.includes('meesho.com')) {
    const match = url.match(/\/p\/([a-zA-Z0-9]+)/i);
    const id = match ? match[1] : null;
    return id ? { store: 'Meesho', externalId: id, cleanUrl: `https://www.meesho.com/p/${id}` } : null;
  }
  
  return null;
}

/**
 * Resolves short links (amzn.to, fkrt.it) to full destination URLs with timeout protection.
 */
export async function resolveUrl(url) {
  const l = url.toLowerCase();
  if (l.includes('amzn.to') || l.includes('amzn.in') || l.includes('fkrt.it') || l.includes('short') || l.includes('dl.flipkart.com')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout
      
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
      clearTimeout(timeoutId);
      return res.url;
    } catch (e) {
      console.warn(`[Fetcher] Failed to resolve short redirect for ${url}:`, e.message);
    }
  }
  return url;
}

/**
 * Parses image URL from Telegram web preview message block.
 */
export function extractImageFromBlock(block) {
  const bgMatch = block.match(/class="tgme_widget_message_photo_wrap[^"]*"[^]*?background-image:url\('([^']+)'\)/i);
  if (bgMatch) return bgMatch[1];
  
  const imgMatches = [...block.matchAll(/<img[^>]*src="([^"]+)"/ig)];
  for (const match of imgMatches) {
    const url = match[1];
    if (!url.includes('emoji') && !url.includes('avatar') && !url.includes('tgme_page_photo')) {
      return url;
    }
  }
  return null;
}

/**
 * Parses product title, price, and MRP from clean Telegram text.
 */
export function parseDealFromTelegramPost(text, image, rawUrl) {
  if (!text) return null;
  
  const cleanText = text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
    
  let price = null;
  const priceMatch = cleanText.match(/(?:@|\bat\b|Rs\.?|₹)\s*(?:Rs\.?|₹)?\s*([0-9,]+)/i);
  if (priceMatch) {
    price = parseFloat(priceMatch[1].replace(/,/g, ''));
  }
  
  let mrp = null;
  const mrpMatch = cleanText.match(/MRP\s*(?::|₹|\s)?\s*([0-9,]+)/i);
  if (mrpMatch) {
    mrp = parseFloat(mrpMatch[1].replace(/,/g, ''));
  }

  let title = '';
  const separatorMatch = cleanText.match(/(.*?)(?:@|\bat\b|Rs\.?|₹)/i);
  if (separatorMatch && separatorMatch[1].trim()) {
    title = separatorMatch[1].trim();
  } else {
    title = cleanText.split('\n')[0].trim();
  }
  
  title = title
    .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!price || isNaN(price)) {
    price = 999;
  }
  if (!mrp || isNaN(mrp)) {
    mrp = Math.round(price * 1.4);
  }

  return {
    title: title || 'Discounted Product',
    price: price,
    mrp: mrp,
    image: image || 'https://m.media-amazon.com/images/I/31W%2Bq%2BCXyOL.jpg',
    url: rawUrl
  };
}

/**
 * Main fetch execution process.
 * @param {Object} [options] - Override batch size or channel configurations.
 * @returns {Promise<Object>} Execution summary data.
 */
export async function executeFetcher(options = {}) {
  const startedAt = new Date();
  let itemsProcessed = 0;
  let itemsEnqueued = 0;
  let errors = [];
  let scrapeFails = { Amazon: 0, Flipkart: 0 };

  try {
    // 1. Load configurations from Supabase settings
    const { data: flagData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'feature_flags')
      .single();
    const flags = flagData?.value || { enable_telegram: true, enable_whatsapp: false };

    const { data: sizeData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'batch_sizes')
      .maybeSingle();
    const batchLimit = options.limit || sizeData?.value?.fetch_limit || 3;

    const activeChannels = [];
    if (flags.enable_telegram !== false) activeChannels.push('telegram');
    if (flags.enable_whatsapp === true) activeChannels.push('whatsapp');
    if (activeChannels.length === 0) activeChannels.push('telegram');

    const { data: sourcingData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'sourcing_channels')
      .single();
    const sourcingChannels = sourcingData?.value || ['lootalerts'];

    console.log(`[Fetcher] Sourcing channels: ${sourcingChannels.join(', ')}. Batch Limit: ${batchLimit}`);

    for (const channelName of sourcingChannels) {
      try {
        console.log(`[Fetcher] Ingesting Telegram web preview for: ${channelName}`);
        
        const htmlText = await new Promise((resolve, reject) => {
          const reqOptions = {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            }
          };
          const req = https.get(`https://t.me/s/${channelName}`, reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => { resolve(data); });
          });
          req.on('error', (err) => { reject(err); });
          req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout fetching Telegram preview'));
          });
        });

        const messageBlocks = htmlText.split('class="tgme_widget_message_wrap');
        let channelSourcedCount = 0;

        for (let i = 1; i < messageBlocks.length; i++) {
          const block = messageBlocks[i];
          
          const urlPattern = /href="(https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:amazon\.in|amzn\.to|amzn\.in|flipkart\.com|fkrt\.it|myntra\.com|ajio\.com|meesho\.com)[^\s"'>]*)/gi;
          const urlMatches = [...block.matchAll(urlPattern)];
          if (urlMatches.length === 0) continue;

          const rawUrl = urlMatches[0][1].split(/[?"'<>\s)]/)[0];
          const resolvedUrl = await resolveUrl(rawUrl);
          const mapping = identifyStoreAndId(resolvedUrl);
          if (!mapping) continue;

          itemsProcessed++;

          // Deduplication check
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('store', mapping.store)
            .eq('external_id', mapping.externalId)
            .maybeSingle();

          if (existingProduct) {
            console.log(`[Fetcher] Duplicate skipped: ${mapping.store} (${mapping.externalId})`);
            continue;
          }

          // 1. Scrape live product data
          let liveData = null;
          try {
            const provider = providerManager.getProvider(mapping.store);
            if (provider) {
              console.log(`[Fetcher] Scraping: ${mapping.store} (${mapping.externalId})`);
              liveData = await provider.extractProduct(mapping.cleanUrl);
              
              // Count consecutive scraper fails
              if (liveData && (liveData.title.includes('Fallback') || liveData.title.includes('Generic Product') || liveData.title.includes('Amazon Product'))) {
                if (scrapeFails[mapping.store] !== undefined) {
                  scrapeFails[mapping.store]++;
                }
              } else {
                if (scrapeFails[mapping.store] !== undefined) {
                  scrapeFails[mapping.store] = 0;
                }
              }
            }
          } catch (scrapeErr) {
            console.warn(`[Fetcher] Scrape failed for ${mapping.store} (${mapping.externalId}):`, scrapeErr.message);
            if (scrapeFails[mapping.store] !== undefined) {
              scrapeFails[mapping.store]++;
            }
          }

          // Trigger admin alert for consecutive failures
          if (scrapeFails.Amazon >= 3) {
            await sendAdminAlert('Amazon scraper has failed 3 times consecutively. CAPTCHA is blocking crawls!', 'scraper_amazon');
            scrapeFails.Amazon = 0; // reset alert trigger
          }
          if (scrapeFails.Flipkart >= 3) {
            await sendAdminAlert('Flipkart scraper has failed 3 times consecutively. Verify page structure!', 'scraper_flipkart');
            scrapeFails.Flipkart = 0;
          }

          // 2. Parse fallback text
          const textMatch = block.match(/class="tgme_widget_message_text[^>]*>([^]+?)<\/div>/i);
          const postText = textMatch ? textMatch[1].replace(/<[^>]*>/g, '').trim() : '';
          const postImage = extractImageFromBlock(block);

          const parsedDeal = parseDealFromTelegramPost(postText, postImage, mapping.cleanUrl);
          if (!parsedDeal) continue;

          // 3. Merge data
          const finalTitle = (liveData && liveData.title && !liveData.title.includes('Amazon Product') && !liveData.title.includes('Generic Product')) 
            ? liveData.title 
            : parsedDeal.title;

          const finalPrice = (liveData && liveData.price && liveData.price != '999')
            ? liveData.price
            : parsedDeal.price;

          const scrapedMrpVal = liveData ? parseFloat(String(liveData.mrp).replace(/[₹$,\s]/g, '')) : 0;
          const scrapedPriceVal = parseFloat(String(finalPrice).replace(/[₹$,\s]/g, ''));

          const finalMrp = (liveData && liveData.mrp && liveData.mrp != '1499' && scrapedMrpVal >= scrapedPriceVal)
            ? liveData.mrp
            : (parsedDeal.mrp || finalPrice);

          const finalImage = (liveData && liveData.image && !liveData.image.includes('generic') && !liveData.image.includes('package icon'))
            ? liveData.image
            : parsedDeal.image;

          let finalRating = (liveData && liveData.rating) ? parseFloat(liveData.rating) : null;
          let finalReviewCount = (liveData && liveData.reviewCount) ? parseInt(liveData.reviewCount, 10) : null;

          if (!finalRating || isNaN(finalRating)) {
            console.log(`[Fetcher] Fallback rating used for product: ${mapping.externalId} (${mapping.store})`);
            finalRating = null;
            finalReviewCount = null;
          }

          const normalized = normalizeProduct({
            externalId: mapping.externalId,
            title: finalTitle,
            imageUrl: finalImage,
            salePrice: finalPrice,
            originalPrice: finalMrp,
            rating: finalRating,
            reviewCount: finalReviewCount,
            store: mapping.store,
            rawUrl: mapping.cleanUrl
          }, mapping.store);

          const { enqueuedIds } = await enqueueProduct(normalized, activeChannels);
          if (enqueuedIds.length > 0) {
            itemsEnqueued += enqueuedIds.length;
            channelSourcedCount++;
            await eventBus.publish('ProductFetched', { normalized, enqueuedIds });
          }

          if (channelSourcedCount >= batchLimit) {
            console.log(`[Fetcher] Sourced maximum batch limit of ${batchLimit} deals. Moving on.`);
            break;
          }
        }
      } catch (channelErr) {
        console.error(`[Fetcher] Error sourcing from channel ${channelName}:`, channelErr.message);
        errors.push(`Sourcing ${channelName} failed: ${channelErr.message}`);
      }
    }

    const durationMs = Date.now() - startedAt.getTime();
    return {
      success: errors.length === 0,
      durationMs,
      itemsProcessed,
      itemsEnqueued,
      errors: errors.length > 0 ? errors : null
    };

  } catch (globalErr) {
    console.error('[Fetcher] Global failure:', globalErr);
    return {
      success: false,
      durationMs: Date.now() - startedAt.getTime(),
      itemsProcessed,
      itemsEnqueued: 0,
      errors: [globalErr.message]
    };
  }
}
