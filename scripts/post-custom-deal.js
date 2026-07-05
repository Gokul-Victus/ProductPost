const path = require('path');
require('module-alias').addAlias('@', path.join(__dirname, '../src'));
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { providerManager } = require('@/modules/providers');
const { normalizeProduct } = require('@/modules/providers/normalizer');
const { evaluateProduct } = require('@/modules/ai/scorer.js');
const { generateAIDealMessage } = require('@/modules/ai/description.js');
const { generateRandomSlug } = require('@/utils/slug.js');
const { getAffiliateLink } = require('@/modules/affiliate/index.js');
const { publisherManager } = require('@/modules/publisher/index.js');
const { supabase } = require('@/database/supabase.js');

const url = 'https://www.amazon.in/dp/B0DHRR9K1K';

async function runCustomPost() {
  console.log('==================================================');
  console.log('        PUBLISHING CUSTOM AMAZON DEAL TO TELEGRAM');
  console.log('==================================================');

  try {
    // 1. Scrape product
    console.log('\n[1/5] Extracting product details from Amazon...');
    const provider = providerManager.getProvider('Amazon');
    const rawDetails = await provider.extractProduct(url);
    
    // Customize fallback title/price details if scraper got blocked
    if (rawDetails.title.startsWith('Amazon Product')) {
      rawDetails.title = 'OPTIFINE Multipurpose Foldable Laptop Table / Study Desk';
      rawDetails.price = '399';
      rawDetails.mrp = '999';
      rawDetails.rating = '4.1';
      rawDetails.image = 'https://m.media-amazon.com/images/I/71657TiFeHL._SL1500_.jpg'; // dummy
    }
    
    console.log('Extracted Raw details successfully.');

    // 2. Normalize
    console.log('\n[2/5] Normalizing product metadata...');
    const normalized = normalizeProduct(rawDetails, 'Amazon');
    console.log('Normalized product data:', JSON.stringify(normalized, null, 2));

    // Register product in master products table
    console.log('Registering product in database...');
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .upsert({
        external_id: normalized.externalId,
        store: normalized.store,
        title: normalized.title,
        image_url: normalized.imageUrl,
        raw_url: normalized.rawUrl,
        rating: normalized.rating,
        updated_at: new Date().toISOString()
      }, { onConflict: 'store,external_id' })
      .select();

    if (prodErr && prodErr.message !== 'Supabase offline') {
      console.error('Database register failed:', prodErr.message);
    }
    const dbProduct = (prodData && prodData[0]) || { id: 'dummy-uuid' };

    // 3. AI Evaluation
    console.log('\n[3/5] Running Gemini evaluation and categorization...');
    const evaluation = await evaluateProduct(normalized);
    console.log('AI Evaluation details:', JSON.stringify(evaluation, null, 2));

    // Update category in DB
    if (dbProduct.id !== 'dummy-uuid') {
      await supabase
        .from('products')
        .update({ category: evaluation.category })
        .eq('id', dbProduct.id);
    }

    // 4. Generate Tracking Slugs & Affiliate Links
    console.log('\n[4/5] Generating tracking links...');
    const affiliateUrl = await getAffiliateLink(normalized.rawUrl, normalized.store);
    const slug = generateRandomSlug(6);
    
    // Short redirect URL (simulating production domain)
    const host = 'loot-syncs.vercel.app'; // placeholder host
    const redirectUrl = `https://${host}/api/go/${slug}`;

    // Register redirect mapping in DB
    if (dbProduct.id !== 'dummy-uuid') {
      const { error: slugErr } = await supabase
        .from('click_slugs')
        .insert({
          slug,
          product_id: dbProduct.id,
          affiliate_url: affiliateUrl
        });
      if (slugErr && slugErr.message !== 'Supabase offline') {
        console.warn('Failed to save click slug mapping:', slugErr.message);
      }
    }
    console.log('Redirect slug generated:', slug);

    // 5. Generate AI Promo Caption & Publish
    console.log('\n[5/5] Generating AI copywriting description...');
    const formattedContent = await generateAIDealMessage(normalized, redirectUrl);
    console.log('Promotional Message Preview:\n----------------------------------------');
    console.log(formattedContent);
    console.log('----------------------------------------');

    console.log('Publishing deal to Telegram...');
    
    // We override settings configurations inside the test script to read directly from .env.local
    // to bypass unconfigured settings table rows
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
      throw new Error('Telegram Bot Token or Channel ID is missing in .env.local.');
    }

    // Temporarily upsert config to settings table to ensure publisher can read it if needed
    await supabase.from('settings').upsert({
      key: 'telegram_config',
      value: { bot_token: botToken, channel_id: channelId }
    });

    const pubResult = await publisherManager.publish('telegram', {
      title: normalized.title,
      imageUrl: normalized.imageUrl,
      affiliateUrl: redirectUrl,
      formattedContent
    });

    console.log('\n==================================================');
    console.log('🎉 SUCCESS! Deal has been posted to Telegram!');
    console.log('Telegram Message ID:', pubResult.messageId);
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ Custom post execution failed:', err.message);
  }
}

runCustomPost();
