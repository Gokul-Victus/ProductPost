import { generateContent } from './gemini.js';
import { supabase } from '../../database/supabase.js';

const SYSTEM_INSTRUCTION = `You are an expert affiliate marketer and copywriter. Your goal is to write high-CTR (Click-Through Rate) product promotion posts for a Telegram and WhatsApp deals channel.
Follow these rules:
1. Keep the copy punchy, exciting, and extremely scannable.
2. Use emojis strategically (e.g. 🔥, 💥, ⚡, 🛒, 📦).
3. Do NOT use Markdown formatting (like **, *, _, [text](url)).
4. You MUST only use HTML tags: <b>...</b> for bold, <i>...</i> for italics, and <s>...</s> for strikeout.
5. Do NOT hide the affiliate link behind a hyperlink. You MUST print the affiliate link visibly at the end as raw text (e.g., 'Grab It Now: https://...').
6. Create a list of 2-3 key selling features or highlights.
7. Write a strong, clear call to action pointing to the affiliate link.
8. Return the final formatted HTML string only.`;

/**
 * Generates an AI-written high-CTR HTML post caption using Gemini.
 * @param {Object} product - Normalized product object.
 * @param {string} affiliateUrl - Converted affiliate/redirect URL.
 * @returns {Promise<string>} The formatted HTML message string.
 */
export async function generateAIDealMessage(product, affiliateUrl) {
  let customInstruction = SYSTEM_INSTRUCTION;

  // Try loading custom copywriting rules from settings
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'prompt_templates')
      .single();

    if (!error && data && data.value && data.value.copywriter_instruction) {
      customInstruction = data.value.copywriter_instruction;
    }
  } catch (err) {
    console.warn('[AICopywriter] Could not load custom prompts from database. Using default.', err.message);
  }

  let original = parseFloat(product.originalPrice || product.mrp);
  const sale = parseFloat(product.salePrice || product.price);
  
  if (!isNaN(original) && !isNaN(sale) && original < sale) {
    original = sale;
  }

  let discount = '0';
  if (!isNaN(original) && !isNaN(sale) && original > sale) {
    discount = Math.round(((original - sale) / original) * 100).toString();
  }

  const prompt = `${customInstruction}

Product Details:
- Title: ${product.title}
- Store: ${product.store}
- Original Price: ${original && original > sale ? `₹${original.toLocaleString('en-IN')}` : 'N/A'}
- Sale Price: ₹${sale.toLocaleString('en-IN')}
- Discount: ${discount}%
- Rating: ${product.rating || '4.0'} / 5
- Affiliate URL: ${affiliateUrl}

Generate the promotional message:`;

  try {
    const aiText = await generateContent(prompt);
    
    if (aiText && aiText.trim()) {
      return aiText.trim();
    }
    
    throw new Error('Gemini returned an empty caption.');
  } catch (err) {
    console.error('[AICopywriter] Gemini generation failed, using fallback templates:', err.message);
    
    const salePrice = sale ? sale.toLocaleString('en-IN') : 'N/A';
    const ratingStr = product.rating ? `${product.rating} / 5` : '4.0';

    const priceLine = (original && original > sale)
      ? `💰 Price: <s>₹${original.toLocaleString('en-IN')}</s> ➜ <b>₹${salePrice}</b>`
      : `💰 Price: <b>₹${salePrice}</b>`;

    const discountLine = (original && original > sale)
      ? `\n⚡ Discount: <b>${discount}% OFF</b>`
      : '';

    return `🔥 <b>Deal of the Day!</b>

<b>${escapeHtml(product.title)}</b>

${priceLine}${discountLine}
⭐ Rating: <b>${ratingStr}</b>

✅ Free Delivery & Top Rated
✅ Limited Time Price Drop

🛒 <b>Grab It Now on ${product.store}:</b> ${affiliateUrl}`;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
