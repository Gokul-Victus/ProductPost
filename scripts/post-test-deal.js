import 'dotenv/config';
import { executeFetcher } from '../src/modules/queue/fetcher.js';
import { executeWorker } from '../src/modules/queue/worker.js';

async function run() {
  console.log('==================================================');
  console.log('       RUNNING END-TO-END AUTOMATION TEST');
  console.log('==================================================');

  try {
    // 1. Run Fetcher to scrape a trending deal and add it to queue
    console.log('\n[1/2] Fetching live deal from Telegram preview...');
    const fetchResult = await executeFetcher({ limit: 1 });
    console.log('Fetch Ingestion Result:', JSON.stringify(fetchResult, null, 2));

    if (fetchResult.itemsEnqueued === 0) {
      console.log('\n⚠️ No new deals were enqueued (either duplicates existed or fetch was empty).');
      console.log('If you want to force post a test, ensure there is a new product in the channel.');
    }

    // 2. Run Worker to process and publish the queued deal
    console.log('\n[2/2] Processing and publishing queued deals...');
    const workerResult = await executeWorker({ 
      limit: 1,
      host: 'lootsyncs.vercel.app' 
    });
    console.log('Worker Execution Result:', JSON.stringify(workerResult, null, 2));

  } catch (err) {
    console.error('Test execution failed:', err.message);
  }

  process.exit(0);
}

run();
