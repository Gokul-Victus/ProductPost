import 'dotenv/config';
import { executeWorker } from '../src/modules/queue/worker.js';
import { supabase } from '../src/database/supabase.js';

async function run() {
  const startedAt = new Date();
  console.log('[CronWorker CLI] Starting worker execution...');

  // 1. Check and acquire Lock
  try {
    const { data: lockData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'job_run_lock_worker')
      .maybeSingle();

    const lock = lockData?.value || { locked: false, locked_at: null };
    const now = new Date();

    if (lock.locked && lock.locked_at) {
      const lockTime = new Date(lock.locked_at);
      const diffMinutes = (now.getTime() - lockTime.getTime()) / (1000 * 60);

      // Abort if active lock is under 30 minutes old
      if (diffMinutes < 30) {
        console.log(`[CronWorker CLI] Execution aborted: Lock active since ${lock.locked_at} (${Math.round(diffMinutes)}m ago).`);
        process.exit(0);
      }
      console.log('[CronWorker CLI] Stale lock detected, bypassing and taking over...');
    }

    // Acquire lock
    await supabase
      .from('settings')
      .upsert({
        key: 'job_run_lock_worker',
        value: { locked: true, locked_at: now.toISOString() },
        updated_at: now.toISOString()
      });
    console.log('[CronWorker CLI] Run-Lock acquired.');

  } catch (lockErr) {
    console.error('[CronWorker CLI] Lock checking failed:', lockErr.message);
  }

  // 2. Run Worker
  let result = null;
  try {
    // Increase worker limit to 10 since there is no serverless timeout on GitHub Actions runner
    result = await executeWorker({ 
      limit: 10,
      host: 'product-post.vercel.app' 
    });
    console.log('[CronWorker CLI] Worker result:', result);
  } catch (err) {
    console.error('[CronWorker CLI] Worker crashed:', err.message);
    result = { success: false, itemsProcessed: 0, itemsFailed: 1, logs: [err.message] };
  }

  // 3. Log results to Database
  try {
    const durationMs = Date.now() - startedAt.getTime();
    await supabase.from('job_logs').insert({
      job_name: 'queue_worker_cli',
      status: result.itemsFailed > 0 ? 'warning' : 'success',
      duration_ms: durationMs,
      items_processed: result.itemsProcessed,
      error_message: result.logs ? result.logs.join('\n') : null,
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString()
    });
  } catch (logErr) {
    console.error('[CronWorker CLI] Failed to write job log:', logErr.message);
  }

  // 4. Release Lock
  try {
    await supabase
      .from('settings')
      .upsert({
        key: 'job_run_lock_worker',
        value: { locked: false, locked_at: null },
        updated_at: new Date().toISOString()
      });
    console.log('[CronWorker CLI] Run-Lock released.');
  } catch (lockReleaseErr) {
    console.error('[CronWorker CLI] Failed to release lock:', lockReleaseErr.message);
  }

  process.exit(0);
}

run();
