import { supabase } from '../../database/supabase.js';

const DEFAULT_TEMPLATE = `📱 <b>{category}</b> | ⚡ <b>{discount}% OFF</b>

<b>{title}</b>

<s>₹{originalPrice}</s>  ➜  <b>₹{salePrice}</b>
★<b>{starRating} {rating}</b> ({reviewCount}+ ratings)

✅ Free Delivery  ✅ <b>{badge}</b>
⏰ Price may increase anytime

👉 <b>Grab Now:</b> {affiliateUrl}`;

/**
 * Generates a visual star string from rating (e.g. 4.2 -> ★★★★☆)
 */
function generateStarRating(ratingVal) {
  const num = parseFloat(ratingVal);
  if (isNaN(num)) return '★★★★☆';
  const fullStars = Math.round(num);
  const emptyStars = 5 - fullStars;
  return '★'.repeat(Math.max(0, Math.min(5, fullStars))) + '☆'.repeat(Math.max(0, Math.min(5, emptyStars)));
}

/**
 * Infers category from title keywords
 */
function detectCategory(title, store) {
  const text = String(title).toLowerCase();
  
  if (text.match(/phone|mobile|iphone|samsung|oneplus|realme|redmi|vivo|oppo|xiaomi|pixel|moto/)) return 'Smartphones';
  if (text.match(/laptop|macbook|computer|monitor|keyboard|mouse|router|wifi|asus|hp|dell|lenovo/)) return 'Electronics';
  if (text.match(/headphone|earphone|earbuds|speaker|soundbar|audio|boat|noise|boult|sony/)) return 'Audio';
  if (text.match(/shirt|tshirt|jeans|top|kurta|dress|shoes|sneaker|sandal|watch|bag|wallet|belt/)) return 'Fashion';
  if (text.match(/shampoo|serum|cream|facewash|lipstick|makeup|perfume|sunscreen|loreal|mamaearth/)) return 'Beauty';
  if (text.match(/cooker|pan|kettle|vacuum|mop|bottle|container|kitchen|bedsheet|pillow|curtain/)) return 'Home & Kitchen';
  if (text.match(/supplement|protein|multivitamin|fitness|dumbbell|yoga|mask/)) return 'Health & Fitness';
  
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
  const ratingVal = product.rating || 4.2;
  const category = detectCategory(product.title, product.store);
  const starRating = generateStarRating(ratingVal);
  const badge = getBadge(ratingVal);
  const reviewCount = product.reviewCount || 145;

  // Safe strings
  const title = escapeHtml(product.title);
  const originalPrice = product.originalPrice ? product.originalPrice.toLocaleString('en-IN') : 'N/A';
  const salePrice = product.salePrice ? product.salePrice.toLocaleString('en-IN') : 'N/A';
  const rating = parseFloat(ratingVal).toFixed(1);

  // Replace placeholders
  return template
    .replace(/{title}/g, title)
    .replace(/{originalPrice}/g, originalPrice)
    .replace(/{salePrice}/g, salePrice)
    .replace(/{discount}/g, discount)
    .replace(/{rating}/g, rating)
    .replace(/{starRating}/g, starRating)
    .replace(/{category}/g, category)
    .replace(/{badge}/g, badge)
    .replace(/{reviewCount}/g, reviewCount.toString())
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
