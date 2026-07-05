import { supabase } from '../../database/supabase.js';

const DEFAULT_TEMPLATE = `🔥 <b>{discount}% OFF</b> | <b>{category}</b>
<b>{title}</b>

<s>₹{originalPrice}</s> ➜ <b>₹{salePrice}</b>{ratingLine}
✅ Free Delivery
⏰ Price may increase anytime

👉 <b>Grab Now →</b> {affiliateUrl}`;

/**
 * Generates a precise visual star string supporting half stars (e.g. 4.5 -> ★★★★½)
 */
function generateStarRating(ratingVal) {
  const num = parseFloat(ratingVal);
  if (isNaN(num)) return '★★★★☆';
  
  const fullStars = Math.floor(num);
  const decimal = num - fullStars;
  
  let stars = '★'.repeat(Math.max(0, Math.min(5, fullStars)));
  if (decimal >= 0.25 && decimal < 0.75) {
    stars += '½'; // Unicode half-star
  } else if (decimal >= 0.75) {
    stars += '★';
  }
  
  const emptyStars = 5 - stars.replace('½', '').length;
  if (emptyStars > 0) {
    stars += '☆'.repeat(emptyStars);
  }
  return stars;
}

/**
 * Infers category from title keywords (accessory-first re-ordered)
 */
function detectCategory(title, store) {
  const text = String(title).toLowerCase();
  
  // Specific accessories/peripherals take priority
  if (text.match(/headphone|earphone|earbuds|speaker|soundbar|audio|buds|airdopes|neckband|tws/)) return 'Audio';
  if (text.match(/laptop|macbook|computer|monitor|keyboard|mouse|router|wifi|printer|processor|gpu|ram/)) return 'Electronics';
  if (text.match(/phone|mobile|smartphone|iphone|galaxy|nord/)) return 'Smartphones';
  
  // General brand targets next
  if (text.match(/samsung|oneplus|realme|redmi|vivo|oppo|xiaomi|pixel|motorola|apple/)) return 'Smartphones';
  
  if (text.match(/shirt|tshirt|jeans|top|kurta|dress|shoes|sneaker|sandal|watch|bag|wallet|belt|clothing|wear/)) return 'Fashion';
  if (text.match(/shampoo|serum|cream|facewash|lipstick|makeup|perfume|sunscreen|loreal|mamaearth|skincare|face/)) return 'Beauty';
  if (text.match(/cooker|pan|kettle|vacuum|mop|bottle|container|kitchen|bedsheet|pillow|curtain|spatula|appliances/)) return 'Home & Kitchen';
  if (text.match(/supplement|protein|multivitamin|fitness|dumbbell|yoga|gym/)) return 'Health & Fitness';
  
  if (store === 'Amazon' || store === 'Flipkart') return 'Deals';
  return 'Shopping';
}

/**
 * Returns dynamic badge based on rating
 */
function getBadge(ratingVal) {
  const num = parseFloat(ratingVal);
  if (isNaN(num)) return 'Trending';
  if (num >= 4.3) return 'Bestseller';
  if (num >= 4.0) return 'Top Rated';
  return 'Trending';
}

/**
 * Formats product details into a rich HTML text block using templates.
 * @param {Object} product - Normalized product object.
 * @param {string} affiliateUrl - Pre-converted affiliate URL.
 * @returns {Promise<string>} Rich text message string.
 */
export async function formatDealMessage(product, affiliateUrl) {
  let template = DEFAULT_TEMPLATE;

  // Attempt to load prompt template from database settings
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'prompt_templates')
      .single();

    if (!error && data && data.value && data.value.telegram_deal) {
      template = data.value.telegram_deal;
    }
  } catch (err) {
    console.warn('[Templates] Failed to load prompt template from database. Using default.', err.message);
  }

  // Calculate discount percentage if not provided
  let discount = '0';
  const original = parseFloat(product.originalPrice || product.mrp);
  const sale = parseFloat(product.salePrice || product.price);
  if (!isNaN(original) && !isNaN(sale) && original > sale) {
    discount = Math.round(((original - sale) / original) * 100).toString();
  }

  // Generate dynamic fields
  const category = detectCategory(product.title, product.store);
  const ratingVal = product.rating;
  const reviewCount = product.reviewCount;
  
  // Format rating line conditionally (omit if null/missing)
  let ratingLine = '';
  if (ratingVal && parseFloat(ratingVal) > 0) {
    const starRating = generateStarRating(ratingVal);
    const badge = getBadge(ratingVal);
    const ratingStr = parseFloat(ratingVal).toFixed(1);
    const reviewsStr = reviewCount ? `${reviewCount}+` : '100+';
    ratingLine = `\n${starRating} <b>${ratingStr}</b> (${reviewsStr} ratings) • <b>${badge}</b>\n`;
  }

  // Safe strings
  const title = escapeHtml(product.title);
  const originalPrice = product.originalPrice ? product.originalPrice.toLocaleString('en-IN') : 'N/A';
  const salePrice = product.salePrice ? product.salePrice.toLocaleString('en-IN') : 'N/A';

  // Replace placeholders
  return template
    .replace(/{title}/g, title)
    .replace(/{originalPrice}/g, originalPrice)
    .replace(/{salePrice}/g, salePrice)
    .replace(/{discount}/g, discount)
    .replace(/{category}/g, category)
    .replace(/{ratingLine}/g, ratingLine)
    .replace(/{store}/g, product.store || 'Store')
    .replace(/{affiliateUrl}/g, affiliateUrl);
}

/**
 * Escapes characters to prevent breaking Telegram HTML parser.
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
