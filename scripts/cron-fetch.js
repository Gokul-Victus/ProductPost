import 'dotenv/config';
import { executeFetcher } from '../src/modules/queue/fetcher.js';
import { supabase } from '../src/database/supabase.js';

async function run() {
  const startedAt = new Date();
  console.log('[CronFetch CLI] Starting fetch execution...');

  // 1. Check and acquire Lock
  try {
    const { data: lockData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'job_run_lock')
      .maybeSingle();

    const lock = lockData?.value || { locked: false, locked_at: null };
    const now = new Date();

    if (lock.locked && lock.locked_at) {
      const lockTime = new Date(lock.locked_at);
      const diffMinutes = (now.getTime() - lockTime.getTime()) / (1000 * 60);

      // If lock is active and less than 30 minutes old, abort to prevent overlap
      if (diffMinutes < 30) {
        console.log(`[CronFetch CLI] Execution aborted: Lock active since ${lock.locked_at} (${Math.round(diffMinutes)}m ago).`);
        process.exit(0);
      }
      console.log('[CronFetch CLI] Stale lock detected, bypassing and taking over...');
    }

    // Acquire lock
    await supabase
      .from('settings')
      .upsert({
        key: 'job_run_lock',
        value: { locked: true, locked_at: now.toISOString() },
        updated_at: now.toISOString()
      });
    console.log('[CronFetch CLI] Run-Lock acquired.');

  } catch (lockErr) {
    console.error('[CronFetch CLI] Lock checking failed:', lockErr.message);
  }

  // 2. Run Fetcher
  let result = null;
  try {
    // We can run larger batch sizes since timeout is resolved
    result = await executeFetcher({ limit: 10 });
    console.log('[CronFetch CLI] Fetcher result:', result);
  } catch (err) {
    console.error('[CronFetch CLI] Fetcher crashed:', err.message);
    result = { success: false, itemsProcessed: 0, errors: [err.message] };
  }

  // 3. Log results to Database
  try {
    const durationMs = Date.now() - startedAt.getTime();
    await supabase.from('job_logs').insert({
      job_name: 'fetcher_cron_cli',
      status: result.success ? 'success' : 'warning',
      duration_ms: durationMs,
      items_processed: result.itemsProcessed,
      error_message: result.errors ? result.errors.join('; ') : null,
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString()
    });
  } catch (logErr) {
    console.error('[CronFetch CLI] Failed to write job log:', logErr.message);
  }

  // 4. Release Lock
  try {
    await supabase
      .from('settings')
      .upsert({
        key: 'job_run_lock',
        value: { locked: false, locked_at: null },
        updated_at: new Date().toISOString()
      });
    console.log('[CronFetch CLI] Run-Lock released.');
  } catch (lockReleaseErr) {
    console.error('[CronFetch CLI] Failed to release lock:', lockReleaseErr.message);
  }

  process.exit(0);
}

run();
