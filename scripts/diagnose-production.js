const path = require('path');
require('module-alias').addAlias('@', path.join(__dirname, '../src'));
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { supabase } = require('@/database/supabase.js');

async function diagnose() {
  console.log('==================================================');
  console.log('           PRODUCTION DIAGNOSTIC TOOL');
  console.log('==================================================');

  try {
    // 1. Check Supabase connection
    console.log('\n[1/5] Checking Supabase connection & credentials...');
    console.log('Database URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    const { data: testData, error: testErr } = await supabase.from('settings').select('key');
    if (testErr) {
      throw new Error(`Supabase connection failed: ${testErr.message}`);
    }
    console.log('✅ Supabase connected successfully! Found keys:', testData.map(d => d.key));

    // 2. Check Database Settings Table
    console.log('\n[2/5] Checking database settings configuration...');
    const { data: settingsData } = await supabase.from('settings').select('*');
    
    const telegramRow = settingsData.find(s => s.key === 'telegram_config');
    const amazonRow = settingsData.find(s => s.key === 'amazon_config');
    const geminiRow = settingsData.find(s => s.key === 'gemini_config');

    console.log('Telegram config in DB:', telegramRow ? JSON.stringify(telegramRow.value) : 'MISSING');
    console.log('Amazon config in DB:', amazonRow ? JSON.stringify(amazonRow.value) : 'MISSING');
    console.log('Gemini config in DB:', geminiRow ? JSON.stringify(geminiRow.value) : 'MISSING');

    if (!telegramRow || !telegramRow.value.bot_token || telegramRow.value.bot_token.trim() === '') {
      console.warn('⚠️ WARNING: Telegram credentials are EMPTY in your database settings table. The worker will fail to post.');
      console.warn('👉 FIX: Go to https://product-post.vercel.app/settings in your browser, verify the pre-filled inputs, and click "Save Settings".');
    } else {
      console.log('✅ Telegram credentials are saved in the database settings table!');
    }

    // 3. Check Queue status
    console.log('\n[3/5] Checking publisher queue status...');
    const { data: queueData } = await supabase.from('publisher_queue').select('status, created_at');
    console.log(`Total queue items in DB: ${queueData.length}`);
    const pending = queueData.filter(q => q.status === 'pending');
    const failed = queueData.filter(q => q.status === 'failed');
    const completed = queueData.filter(q => q.status === 'completed');
    console.log(`- Pending: ${pending.length}`);
    console.log(`- Failed: ${failed.length}`);
    console.log(`- Completed: ${completed.length}`);

    // 4. Check Job execution logs
    console.log('\n[4/5] Checking cron execution logs...');
    const { data: logsData } = await supabase
      .from('job_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5);

    if (logsData.length === 0) {
      console.log('No cron jobs have executed yet. (You might need to wait for cron-job.org or manually trigger them once).');
    } else {
      console.log('Recent job logs in database:');
      logsData.forEach(log => {
        console.log(`- ${log.job_name} | Status: ${log.status} | Duration: ${log.duration_ms}ms | Items: ${log.items_processed} | Error: ${log.error_message || 'None'}`);
      });
    }

    // 5. Check products
    console.log('\n[5/5] Checking master product registry...');
    const { data: prodData } = await supabase.from('products').select('id, title, store').limit(5);
    console.log(`Total products registered: ${prodData.length}`);
    if (prodData.length > 0) {
      console.log('Sample products:');
      prodData.forEach(p => console.log(`- [${p.store}] ${p.title.substring(0, 50)}...`));
    }

  } catch (err) {
    console.error('Diagnostic error:', err.message);
  }
  console.log('\n==================================================');
}

diagnose();
