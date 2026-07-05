import 'dotenv/config';
import { providerManager } from '../src/modules/providers/index.js';
import { normalizeProduct } from '../src/modules/providers/normalizer.js';
import { evaluateProduct } from '../src/modules/ai/scorer.js';
import { generateAIDealMessage } from '../src/modules/ai/description.js';
import { getAffiliateLink } from '../src/modules/affiliate/index.js';
import { publisherManager } from '../src/modules/publisher/index.js';
import { supabase } from '../src/database/supabase.js';

// Real product URL (a study table/desk or any active Amazon listing)
const url = 'https://www.amazon.in/dp/B0DHRR9K1K';

async function runRealTest() {
  console.log('==================================================');
  console.log('    RUNNING REAL END-TO-END DEALS PUBLISHING TEST');
  console.log('==================================================');

  try {
    // 1. Scrape product
    console.log('\n[1/5] Extracting product details from Amazon...');
    const provider = providerManager.getProvider('Amazon');
    const rawDetails = await provider.extractProduct(url);
    
    console.log('Raw details extracted:', JSON.stringify(rawDetails, null, 2));

    // 2. Strict validation check
    const isGenericTitle = !rawDetails.title || 
                           rawDetails.title.toLowerCase().includes('amazon product') || 
                           rawDetails.title.toLowerCase().includes('generic product') || 
                           rawDetails.title.toLowerCase().includes('flipkart product') || 
                           rawDetails.title.toLowerCase().includes('lootsyncs premium');

    if (isGenericTitle) {
      throw new Error(`CRITICAL STOP: Scraper returned a fallback/generic title "${rawDetails.title}". Aborting post to prevent placeholder posts.`);
    }

    // 3. Normalize
    console.log('\n[2/5] Normalizing product metadata...');
    const normalized = normalizeProduct(rawDetails, 'Amazon');
    console.log('Normalized data:', JSON.stringify(normalized, null, 2));

    // 4. Scorer evaluation
    console.log('\n[3/5] AI Evaluation...');
    const evaluation = await evaluateProduct(normalized);
    console.log('Scorer Evaluation:', JSON.stringify(evaluation, null, 2));

    // 5. Generate tracking link
    console.log('\n[4/5] Building affiliate tracking redirect link...');
    const affiliateUrl = await getAffiliateLink(normalized.rawUrl, normalized.store);
    const mockSlug = 'tst' + Math.floor(100 + Math.random() * 900);
    const redirectUrl = `https://lootsyncs.vercel.app/api/go/${mockSlug}`;

    // 6. Generate caption
    console.log('\n[5/5] Generating AI copywriting caption...');
    const formattedContent = await generateAIDealMessage(normalized, redirectUrl);
    console.log('Caption Preview:\n----------------------------------------');
    console.log(formattedContent);
    console.log('----------------------------------------');

    console.log('\nPublishing live to Telegram...');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    
    // Temporarily ensure settings has configs for test environment
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
    console.log('Telegram Post SUCCESS. Message ID:', pubResult.messageId);

  } catch (err) {
    console.error('\n❌ Real test failed:', err.message);
  }
  process.exit(0);
}

runRealTest();
