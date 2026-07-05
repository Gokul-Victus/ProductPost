import { supabase } from '../../database/supabase.js';

const DEFAULT_TEMPLATE = `🔥 <b>Today's Deal</b>

<b>{title}</b>

💰 <s>₹{originalPrice}</s> ➜ <b>₹{salePrice}</b>
✅ <b>Save {discount}%</b>
⭐ Rating: <b>{rating}</b>

🛒 <a href="{affiliateUrl}"><b>Buy Now on {store}</b></a>`;

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

  // Safe strings
  const title = escapeHtml(product.title);
  const originalPrice = product.originalPrice ? product.originalPrice.toLocaleString('en-IN') : 'N/A';
  const salePrice = product.salePrice ? product.salePrice.toLocaleString('en-IN') : 'N/A';
  const rating = product.rating ? `${product.rating} / 5` : '4.0';

  // Replace placeholders
  return template
    .replace(/{title}/g, title)
    .replace(/{originalPrice}/g, originalPrice)
    .replace(/{salePrice}/g, salePrice)
    .replace(/{discount}/g, discount)
    .replace(/{rating}/g, rating)
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
