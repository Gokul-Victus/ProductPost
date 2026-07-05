import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/database/supabase.js';

async function diagnose() {
  console.log('--- 1. Querying Last 10 Job Logs ---');
  const { data: logs, error: logsError } = await supabase
    .from('job_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);

  if (logsError) {
    console.error('Error fetching logs:', logsError.message);
  } else {
    logs.forEach(log => {
      console.log(`[${log.started_at}] Job: ${log.job_name} | Status: ${log.status} | Duration: ${log.duration_ms}ms | Items: ${log.items_processed}`);
    });
  }

  console.log('\n--- 2. Rating Fallback vs Scraped Count (Last 24h) ---');
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, store, title, rating, created_at')
    .gt('created_at', oneDayAgo);

  if (prodError) {
    console.error('Error fetching products:', prodError.message);
  } else if (products) {
    let scrapedCount = 0;
    let fallbackCount = 0;
    
    products.forEach(p => {
      const numRating = parseFloat(p.rating);
      if (numRating === 4.2) {
        fallbackCount++;
      } else {
        scrapedCount++;
      }
    });
    
    console.log(`Total Products Fetched: ${products.length}`);
    console.log(`Real Scraped Ratings: ${scrapedCount}`);
    console.log(`Fallback Ratings (4.2): ${fallbackCount}`);
  }

  console.log('\n--- 3. Checking Latest Queue Items Mapped Format ---');
  const { data: queueItems, error: qError } = await supabase
    .from('publisher_queue')
    .select('id, status, formatted_content, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (qError) {
    console.error('Error fetching queue:', qError.message);
  } else if (queueItems) {
    queueItems.forEach(item => {
      console.log(`[Queue ${item.id}] Status: ${item.status} | Created: ${item.created_at}`);
      console.log(`Payload: ${item.formatted_content}`);
    });
  }
}

diagnose();
