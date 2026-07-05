// Register import aliases
const path = require('path');
require('module-alias').addAlias('@', path.join(__dirname, '../src'));

// Load environment variables from .env.local if exists
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { evaluateProduct } = require('@/modules/ai/scorer.js');
const { generateAIDealMessage } = require('@/modules/ai/description.js');
const { generateRandomSlug } = require('@/utils/slug.js');
const { getAffiliateLink } = require('@/modules/affiliate/index.js');

async function runTest() {
  console.log('==================================================');
  console.log('        AFFILIATE PLATFORM PHASE 2 INTEGRATION TEST');
  console.log('==================================================');

  // Check if API key is present
  const hasApiKey = process.env.GEMINI_API_KEY;
  if (!hasApiKey) {
    console.log('⚠️ GEMINI_API_KEY environment variable is not configured in .env.local.');
    console.log('Test will run in Fallback Mode (non-AI algorithmic logic).');
    console.log('Setup GEMINI_API_KEY in .env.local to test real Gemini outputs.');
  } else {
    console.log('✅ Gemini API Key found in environment variables. Running real AI tests.');
  }

  // 1. Setup Mock Product (Apple AirPods Pro)
  const mockProduct = {
    externalId: 'B0BPMRW54E',
    store: 'Amazon',
    title: 'Apple AirPods Pro (2nd Generation) with MagSafe Case (USB‑C) ​​​​​​​',
    imageUrl: 'https://m.media-amazon.com/images/I/61SUj2aKoEL._SL1500_.jpg',
    originalPrice: 24900,
    salePrice: 19999,
    rating: 4.8,
    rawUrl: 'https://www.amazon.in/dp/B0BPMRW54E'
  };

  try {
    // 2. Test AI Scorer & Categorizer
    console.log('\n[1/3] Running AI Evaluation (Scorer & Categorizer)...');
    console.log('Product to evaluate:', mockProduct.title);
    const evaluation = await evaluateProduct(mockProduct);
    console.log('AI Evaluation Output:');
    console.log(JSON.stringify(evaluation, null, 2));

    // 3. Test Redirect Slug generation
    console.log('\n[2/3] Generating Click Redirect Slugs...');
    const slug = generateRandomSlug(6);
    const fakeHost = 'localhost:3000';
    const redirectUrl = `http://${fakeHost}/api/go/${slug}`;
    console.log(`Generated short redirect URL: ${redirectUrl}`);

    // Convert link
    const directAffiliateUrl = await getAffiliateLink(mockProduct.rawUrl, mockProduct.store);
    console.log(`Direct Affiliate URL mappings: ${directAffiliateUrl}`);

    // 4. Test AI Copywriting Promotional Caption
    console.log('\n[3/3] Running AI Copywriter (High-CTR HTML description)...');
    const promotionalCaption = await generateAIDealMessage(mockProduct, redirectUrl);
    console.log('\nGenerated HTML promotional post caption:\n----------------------------------------');
    console.log(promotionalCaption);
    console.log('----------------------------------------');

    console.log('\n==================================================');
    console.log('🎉 PHASE 2 SUITE COMPLETED SUCCESSFULLY');
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ Phase 2 test suite failed:', err);
    process.exit(1);
  }
}

runTest();
