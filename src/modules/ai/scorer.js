import { generateContent } from './gemini.js';

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    category: { 
      type: 'STRING', 
      description: 'The product category. Must be strictly one of: Electronics, Fashion, Gaming, Kitchen, Books, Health, Home, Beauty, Grocery, Other.' 
    },
    score: { 
      type: 'INTEGER', 
      description: 'An evaluation score from 0 to 100 ranking the strength of the deal. Higher scores for discounts > 25%, price drops, and rating > 4.2.' 
    },
    justification: { 
      type: 'STRING', 
      description: 'A 1-sentence explanation of why the deal scored this way.' 
    }
  },
  required: ['category', 'score', 'justification']
};

/**
 * Categorizes and scores a deal using Gemini GenAI.
 * @param {Object} product - Normalized product object.
 * @returns {Promise<Object>} Object containing category, score, and justification.
 */
export async function evaluateProduct(product) {
  const discountPercent = calculateDiscount(product.originalPrice || product.mrp, product.salePrice || product.price);
  
  const prompt = `Analyze this product deal and evaluate it.
Product Title: ${product.title}
Store: ${product.store}
Original Price: INR ${product.originalPrice || 'N/A'}
Sale Price: INR ${product.salePrice || 'N/A'}
Computed Discount: ${discountPercent}%
Rating: ${product.rating || 'N/A'}

Guidelines for scoring (0 to 100):
- Score 85-100: Exceptional deals (High rating > 4.3 AND discount > 35%).
- Score 65-84: Good value deals (Rating > 4.0 AND discount 20%-35%).
- Score 40-64: Average deals (Low discount < 20% or rating 3.8-4.0).
- Score 0-39: Poor deals (Low rating < 3.7 or extremely low discount).

Return JSON matching the schema.`;

  try {
    const responseText = await generateContent(prompt, RESPONSE_SCHEMA);
    if (!responseText) {
      // Return local fallback evaluation if Gemini is disabled or fails
      return getFallbackEvaluation(product);
    }
    
    return JSON.parse(responseText);
  } catch (err) {
    console.error('[ProductScorer] Evaluation error:', err.message);
    return getFallbackEvaluation(product);
  }
}

function calculateDiscount(original, sale) {
  const o = parseFloat(original);
  const s = parseFloat(sale);
  if (!isNaN(o) && !isNaN(s) && o > s) {
    return Math.round(((o - s) / o) * 100);
  }
  return 0;
}

/**
 * Fallback evaluation logic in case Gemini is offline or not configured.
 */
function getFallbackEvaluation(product) {
  const discount = calculateDiscount(product.originalPrice || product.mrp, product.salePrice || product.price);
  
  // Direct algorithmic scoring as fallback
  let score = 50;
  if (discount > 30) score += 20;
  else if (discount > 15) score += 10;

  const rating = parseFloat(product.rating);
  if (!isNaN(rating)) {
    if (rating >= 4.5) score += 20;
    else if (rating >= 4.0) score += 10;
    else if (rating < 3.8) score -= 20;
  }

  // Basic category heuristic
  let category = 'Other';
  const titleLower = String(product.title).toLowerCase();
  
  if (titleLower.includes('phone') || titleLower.includes('laptop') || titleLower.includes('earbud') || titleLower.includes('tv') || titleLower.includes('headphone') || titleLower.includes('smartwatch')) {
    category = 'Electronics';
  } else if (titleLower.includes('shirt') || titleLower.includes('jeans') || titleLower.includes('shoe') || titleLower.includes('sandal') || titleLower.includes('t-shirt') || titleLower.includes('watch')) {
    category = 'Fashion';
  } else if (titleLower.includes('game') || titleLower.includes('console') || titleLower.includes('controller') || titleLower.includes('playstation') || titleLower.includes('xbox')) {
    category = 'Gaming';
  } else if (titleLower.includes('pan') || titleLower.includes('cooker') || titleLower.includes('blender') || titleLower.includes('oven') || titleLower.includes('induction')) {
    category = 'Kitchen';
  }

  return {
    category,
    score: Math.max(0, Math.min(100, score)),
    justification: 'Algorithmic fallback score calculated based on discount and rating.'
  };
}
