import { generateContent } from './gemini.js';
import { supabase } from '../../database/supabase.js';

const SYSTEM_INSTRUCTION = `You are an expert affiliate marketer. Your goal is to write high-CTR product promotion posts.
You MUST format the final output using EXACTLY this structure:

🔥 {discount}% OFF | {category}
{title}

₹{originalPrice} ➜ ₹{salePrice}
{starRating} {rating} ({reviewCount}+ ratings) • {badge}

✅ Free Delivery
⏰ Price may increase anytime

👉 Grab Now → {affiliateUrl}

Rules:
1. Replace {category} with inferred keywords (e.g. Smartphones, Electronics, Audio, Fashion, Beauty, Home & Kitchen, Health & Fitness).
2. Replace {discount} with the calculated percent discount.
3. Replace {title} with a clean, short, punchy version of the product title.
4. Replace {originalPrice} and {salePrice} with formatted currency.
5. Replace {rating} with rating float (e.g. 4.2).
6. Replace {starRating} with a visual star representation (e.g., 4.2 -> ★★★★☆, 4.5 -> ★★★★½, 4.8 -> ★★★★★).
7. Replace {reviewCount} with total reviews count (e.g. 145).
8. Replace {badge} with: "Bestseller" if rating >= 4.3, "Top Rated" if >= 4.0, "Trending" otherwise.
9. You MUST use raw HTML tags for formatting: <b>...</b> for bold, <s>...</s> for strikethrough.
10. Print the affiliate link ({affiliateUrl}) visibly at the end as raw text.
11. Return ONLY the final formatted HTML string.`;

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

  const ratingVal = product.rating;
  const reviewCountVal = product.reviewCount;

  const prompt = `${customInstruction}

Product Details:
- Title: ${product.title}
- Store: ${product.store}
- Original Price: ${original && original > sale ? `₹${original.toLocaleString('en-IN')}` : 'N/A'}
- Sale Price: ₹${sale.toLocaleString('en-IN')}
- Discount: ${discount}%
- Rating: ${ratingVal || 'N/A'}
- Review Count: ${reviewCountVal || 'N/A'}
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
    
    // Format rating line conditionally
    let ratingLine = '';
    if (ratingVal && parseFloat(ratingVal) > 0) {
      const num = parseFloat(ratingVal);
      const fullStars = Math.floor(num);
      const decimal = num - fullStars;
      
      let starStr = '★'.repeat(Math.max(0, Math.min(5, fullStars)));
      if (decimal >= 0.25 && decimal < 0.75) {
        starStr += '½';
      } else if (decimal >= 0.75) {
        starStr += '★';
      }
      const emptyStars = 5 - starStr.replace('½', '').length;
      if (emptyStars > 0) {
        starStr += '☆'.repeat(emptyStars);
      }
      
      let bd = 'Trending';
      const numRating = parseFloat(ratingVal);
      if (numRating >= 4.3) bd = 'Bestseller';
      else if (numRating >= 4.0) bd = 'Top Rated';

      ratingLine = `\n${starStr} <b>${parseFloat(ratingVal).toFixed(1)}</b> (${reviewCountVal ? `${reviewCountVal}+` : '100+'} ratings) • <b>${bd}</b>\n`;
    }
    
    // Keyword category parser (accessory-first re-ordered)
    const text = String(product.title).toLowerCase();
    let cat = 'Deals';
    if (text.match(/headphone|earphone|earbuds|speaker|soundbar|audio|buds|airdopes|neckband|tws/)) cat = 'Audio';
    else if (text.match(/laptop|macbook|computer|monitor|keyboard|mouse|router|wifi|printer|processor|gpu|ram/)) cat = 'Electronics';
    else if (text.match(/phone|mobile|smartphone|iphone|galaxy|nord/)) cat = 'Smartphones';
    else if (text.match(/samsung|oneplus|realme|redmi|vivo|oppo|xiaomi|pixel|motorola|apple/)) cat = 'Smartphones';
    else if (text.match(/shirt|tshirt|jeans|top|kurta|dress|shoes|sneaker|sandal|watch|bag|wallet|belt|clothing|wear/)) cat = 'Fashion';
    else if (text.match(/shampoo|serum|cream|facewash|lipstick|makeup|perfume|sunscreen|loreal|mamaearth|skincare|face/)) cat = 'Beauty';
    else if (text.match(/cooker|pan|kettle|vacuum|mop|bottle|container|kitchen|bedsheet|pillow|curtain|spatula|appliances/)) cat = 'Home & Kitchen';

    const salePrice = sale ? sale.toLocaleString('en-IN') : 'N/A';
    const mrpPrice = original ? original.toLocaleString('en-IN') : 'N/A';

    return `🔥 <b>${discount}% OFF</b> | <b>${cat}</b>
<b>${escapeHtml(product.title)}</b>

<s>₹${mrpPrice}</s> ➜ <b>₹${salePrice}</b>{ratingLine}
✅ Free Delivery
⏰ Price may increase anytime

👉 <b>Grab Now →</b> ${affiliateUrl}`;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
