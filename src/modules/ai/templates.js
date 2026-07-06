import { supabase } from '../../database/supabase.js';

const DEFAULT_TEMPLATE = `🔥 <b>{discount}% OFF</b> | <b>{category}</b>
<b>{title}</b>

<s>₹{originalPrice}</s> ➜ <b>₹{salePrice}</b>
✅ Free Delivery
⏰ Price may increase anytime

👉 <b>Grab Now →</b> {affiliateUrl}`;

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
