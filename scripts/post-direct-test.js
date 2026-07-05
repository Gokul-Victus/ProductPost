import 'dotenv/config';
import { supabase } from '../src/database/supabase.js';
import { normalizeProduct } from '../src/modules/providers/normalizer.js';
import { enqueueProduct } from '../src/modules/queue/manager.js';
import { executeWorker } from '../src/modules/queue/worker.js';

async function run() {
  console.log('==================================================');
  console.log('    FORCING END-TO-END TEST DEAL PUBLICATION');
  console.log('==================================================');

  // Generate a unique test ASIN to bypass deduplication
  const testAsin = 'B0TEST' + Math.floor(100000 + Math.random() * 900000);
  
  const rawProduct = {
    externalId: testAsin,
    title: 'LootSyncs Premium Test Deal (Refactored SigV4 & Omit Ratings Fallback Verified)',
    imageUrl: 'https://m.media-amazon.com/images/I/71657TiFeHL._SL1500_.jpg', // clean high-res image
    price: '299',
    mrp: '999',
    rating: '4.5',
    reviewCount: 342,
    store: 'Amazon',
    rawUrl: `https://www.amazon.in/dp/${testAsin}`
  };

  try {
    console.log(`\n[1/2] Normalizing and enqueuing test product ${testAsin}...`);
    const normalized = normalizeProduct(rawProduct, 'Amazon');
    
    // Enqueue for both active channels
    const { enqueuedIds } = await enqueueProduct(normalized, ['telegram', 'whatsapp']);
    console.log('Enqueued Queue Job IDs:', enqueuedIds);

    // 2. Run Worker to process and publish this specific deal
    console.log('\n[2/2] Executing queue worker to process and publish...');
    const workerResult = await executeWorker({
      limit: 10,
      host: 'product-post.vercel.app'
    });
    console.log('Worker Result:', JSON.stringify(workerResult, null, 2));

  } catch (err) {
    console.error('Test failed:', err.message);
  }

  process.exit(0);
}

run();
