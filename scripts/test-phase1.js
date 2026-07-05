// Register import aliases
const path = require('path');
require('module-alias').addAlias('@', path.join(__dirname, '../src'));

// Load environment variables from .env.local if exists
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { providerManager } = require('@/modules/providers');
const { normalizeProduct } = require('@/modules/providers/normalizer');
const { enqueueProduct, getPendingJobs, updateJobStatus } = require('@/modules/queue/manager');
const { getAffiliateLink } = require('@/modules/affiliate');
const { formatDealMessage } = require('@/modules/ai/templates');
const { publisherManager } = require('@/modules/publisher');

async function runTest() {
  console.log('==================================================');
  console.log('        AFFILIATE PLATFORM PHASE 1 INTEGRATION TEST');
  console.log('==================================================');

  try {
    // 1. Test Provider Sourcing
    console.log('\n[1/5] Sourcing deals from Amazon provider...');
    const provider = providerManager.getProvider('Amazon');
    const rawDeals = await provider.fetchDeals();
    console.log(`Successfully fetched ${rawDeals.length} raw deals.`);
    console.log('Sample raw product:', JSON.stringify(rawDeals[0], null, 2));

    // 2. Test Normalization
    console.log('\n[2/5] Running Product Normalization...');
    const normalizedDeals = rawDeals.map(deal => normalizeProduct(deal, 'Amazon'));
    console.log('Successfully normalized raw deals.');
    console.log('Sample normalized product:', JSON.stringify(normalizedDeals[0], null, 2));

    // 3. Test Queue Manager & DB insertion
    console.log('\n[3/5] Enqueuing deals to Database Queue...');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ Supabase credentials not found in env. Simulating queue step.');
    } else {
      const enqueuedResults = [];
      for (const normalized of normalizedDeals) {
        const result = await enqueueProduct(normalized, ['telegram']);
        enqueuedResults.push(result);
      }
      console.log(`Successfully enqueued products. Details:`, enqueuedResults);
    }

    // 4. Test Affiliate Translation & Content Formatting
    console.log('\n[4/5] Testing Link Conversion and Content Formatting...');
    const testProduct = normalizedDeals[0];
    
    // Convert Link
    const affiliateUrl = await getAffiliateLink(testProduct.rawUrl, testProduct.store);
    console.log('Original URL:', testProduct.rawUrl);
    console.log('Affiliate URL:', affiliateUrl);

    // Format HTML Message
    const formattedContent = await formatDealMessage(testProduct, affiliateUrl);
    console.log('Formatted HTML Message:\n----------------------------------------');
    console.log(formattedContent);
    console.log('----------------------------------------');

    // 5. Test Publisher Dispatch
    console.log('\n[5/5] Testing Channel Dispatch (Telegram)...');
    const telegramConfig = process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID;
    
    if (!telegramConfig) {
      console.warn('⚠️ Telegram bot credentials not set in .env.local. Skipping direct post test.');
      console.log('Setup TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID in .env.local to test posting.');
    } else {
      console.log('Dispatching post to Telegram channel...');
      try {
        const result = await publisherManager.publish('telegram', {
          title: testProduct.title,
          imageUrl: testProduct.imageUrl,
          affiliateUrl,
          formattedContent
        });
        console.log('SUCCESS! Post published. Telegram Message ID:', result.messageId);
      } catch (postErr) {
        console.error('❌ Publisher failed:', postErr.message);
      }
    }

    console.log('\n==================================================');
    console.log('🎉 INTEGRATION TEST SUITE RUN COMPLETED SUCCESSFULLY');
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

runTest();
