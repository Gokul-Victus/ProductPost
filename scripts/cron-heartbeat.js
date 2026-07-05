import 'dotenv/config';
import { supabase } from '../src/database/supabase.js';
import { sendAdminAlert } from '../src/modules/publisher/channels/telegram.js';

async function check() {
  console.log('[HeartbeatCheck CLI] Checking MacroDroid heartbeat status...');

  try {
    // 1. Check if any posts were sent to Telegram in the last 12 hours
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    
    const { count: tgPosts, error: tgError } = await supabase
      .from('publisher_queue')
      .select('*', { count: 'exact', head: true })
      .eq('channel', 'telegram')
      .eq('status', 'completed')
      .gt('processed_at', twelveHoursAgo);

    if (tgError) {
      throw new Error(`Failed to query queue: ${tgError.message}`);
    }

    // If no posts were sent to Telegram, MacroDroid had nothing to mirror (no check needed)
    if (tgPosts === 0) {
      console.log('[HeartbeatCheck CLI] No posts went to Telegram in the last 12h. Heartbeat check skipped.');
      process.exit(0);
    }

    // 2. Fetch last recorded heartbeat
    const { data: heartbeatData, error: hbError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'macrodroid_heartbeat')
      .maybeSingle();

    if (hbError) {
      throw new Error(`Failed to query heartbeat: ${hbError.message}`);
    }

    const lastHeartbeat = heartbeatData?.value?.timestamp;
    const now = new Date();

    if (!lastHeartbeat) {
      await sendAdminAlert('No heartbeat registry found for MacroDroid! Please check your phone settings.', 'macrodroid_heartcheck');
    } else {
      const hbTime = new Date(lastHeartbeat);
      const diffHours = (now.getTime() - hbTime.getTime()) / (1000 * 60 * 60);

      console.log(`[HeartbeatCheck CLI] Last heartbeat was ${diffHours.toFixed(2)}h ago.`);

      // Alert if heartbeat is missing for over 12 hours
      if (diffHours >= 12) {
        await sendAdminAlert(
          `MacroDroid phone mirroring is down! Last heartbeat was received ${diffHours.toFixed(1)} hours ago (${lastHeartbeat}).`,
          'macrodroid_heartcheck'
        );
      } else {
        console.log('[HeartbeatCheck CLI] Heartbeat is healthy.');
      }
    }

  } catch (err) {
    console.error('[HeartbeatCheck CLI] Error running check:', err.message);
  }

  process.exit(0);
}

check();
