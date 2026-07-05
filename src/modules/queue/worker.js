import { supabase } from '../../database/supabase.js';
import { getAffiliateLink } from '../affiliate/index.js';
import { formatDealMessage } from '../ai/templates.js';
import { evaluateProduct } from '../ai/scorer.js';
import { generateAIDealMessage } from '../ai/description.js';
import { generateRandomSlug } from '../../utils/slug.js';
import { eventBus } from '../events/bus.js';
import { publisherManager } from '../publisher/index.js';
import { getPendingJobs, updateJobStatus } from './manager.js';
import { sendAdminAlert } from '../publisher/channels/telegram.js';

/**
 * Main worker queue execution loop.
 * @param {Object} [options] - Override limits or configurations.
 * @returns {Promise<Object>} Execution summary data.
 */
export async function executeWorker(options = {}) {
  const startedAt = new Date();
  let itemsProcessed = 0;
  let itemsFailed = 0;
  let logs = [];

  try {
    // 1. Load configurations
    const { data: flagData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'feature_flags')
      .single();
    const flags = flagData?.value || { enable_ai: false, enable_telegram: true };

    const { data: sizeData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'batch_sizes')
      .maybeSingle();
    const workerLimit = options.limit || sizeData?.value?.worker_limit || 5;

    // 2. Fetch pending jobs
    const jobs = await getPendingJobs(workerLimit);

    if (jobs.length === 0) {
      console.log('[Worker] Queue is empty.');
    } else {
      console.log(`[Worker] Processing queue batch size: ${jobs.length}`);
    }

    for (const job of jobs) {
      itemsProcessed++;
      const { id: jobId, channel, formatted_content, products: product } = job;
      
      try {
        await updateJobStatus(jobId, 'processing');

        if (formatted_content) {
          try {
            const meta = JSON.parse(formatted_content);
            if (meta) {
              if (meta.salePrice !== undefined) product.salePrice = meta.salePrice;
              if (meta.originalPrice !== undefined) product.originalPrice = meta.originalPrice;
              if (meta.rating !== undefined) product.rating = meta.rating;
              if (meta.reviewCount !== undefined) product.reviewCount = meta.reviewCount;
            }
          } catch (e) {
            // ignore
          }
        }

        let category = product.category;
        let score = 100;
        let justification = '';

        if (flags.enable_ai) {
          try {
            console.log(`[Worker] Evaluating deal with AI: ${product.title}`);
            const evaluation = await evaluateProduct(product);
            category = evaluation.category;
            score = evaluation.score;
            justification = evaluation.justification;

            await supabase
              .from('products')
              .update({ category, updated_at: new Date().toISOString() })
              .eq('id', product.id);

            const scoreThreshold = flags.min_deal_score !== undefined ? flags.min_deal_score : 30;
            if (score < scoreThreshold) {
              console.log(`[Worker] Deal score (${score}) below threshold (${scoreThreshold}). Skipping.`);
              await updateJobStatus(jobId, 'completed', { 
                error_log: `Skipped: score (${score}) below threshold. Justification: ${justification}` 
              });
              logs.push(`Job ${jobId} skipped (score ${score} < ${scoreThreshold}).`);
              continue;
            }
          } catch (evalErr) {
            console.warn('[Worker] AI Scorer failed. Proceeding without filters:', evalErr.message);
          }
        }

        // Affiliate conversions
        const affiliateUrl = await getAffiliateLink(product.raw_url, product.store);
        const slug = generateRandomSlug(6);
        
        // Host resolve (use override or localhost default)
        const host = options.host || 'lootsyncs.vercel.app';
        const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
        const redirectUrl = `${protocol}://${host}/api/go/${slug}`;

        // Save slug mapping
        const { error: slugError } = await supabase
          .from('click_slugs')
          .insert({
            slug,
            product_id: product.id,
            affiliate_url: affiliateUrl
          });

        if (slugError) {
          throw new Error(`Failed to save redirect slug mapping: ${slugError.message}`);
        }

        let formattedContent = '';
        if (flags.enable_ai) {
          formattedContent = await generateAIDealMessage(product, redirectUrl);
        } else {
          formattedContent = await formatDealMessage(product, redirectUrl);
        }

        const isEnabled = channel === 'telegram'
          ? (flags.enable_telegram !== false)
          : (channel === 'whatsapp'
              ? (flags.enable_whatsapp === true)
              : true);

        if (isEnabled) {
          const pubResult = await publisherManager.publish(channel, {
            title: product.title,
            imageUrl: product.image_url,
            affiliateUrl: redirectUrl,
            formattedContent
          });

          await updateJobStatus(jobId, 'completed', {
            error_log: `Msg ID: ${pubResult.messageId}`
          });

          await eventBus.publish('DealPublished', { 
            jobId, 
            productId: product.id, 
            channel, 
            messageId: pubResult.messageId, 
            redirectUrl 
          });

          logs.push(`Job ${jobId} posted to ${channel}. Msg ID: ${pubResult.messageId}`);
        } else {
          await updateJobStatus(jobId, 'completed', { 
            error_log: `Simulated post: enable_${channel} flag is false.` 
          });
          logs.push(`Job ${jobId} completed (Simulated, ${channel} disabled).`);
        }

      } catch (err) {
        itemsFailed++;
        const nextRetry = job.retries + 1;
        const isExhausted = nextRetry >= 3;
        const newStatus = isExhausted ? 'failed' : 'pending';

        console.error(`[Worker] Job ${jobId} failed (attempt ${nextRetry}/3):`, err.message);

        await updateJobStatus(jobId, newStatus, {
          retries: nextRetry,
          error_log: err.message
        });

        // Send alert if job failed after exhausting all retries
        if (isExhausted) {
          await sendAdminAlert(`Queue Job ${jobId} for product "${product.title}" has failed after 3 attempts. Error: ${err.message}`, 'worker_job_exhausted');
        }

        logs.push(`Job ${jobId} failed: ${err.message}. Status: ${newStatus}`);
      }
    }

    // 3. Compile Daily Performance Summary Digest
    try {
      const now = new Date();
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      
      // Execute only in the late evening (between 18:00 and 18:30 UTC / 11:30 PM and 12:00 AM IST)
      // This ensures it runs exactly once near the end of the day.
      if (currentHour === 18 && currentMinute < 15) {
        const todayStr = now.toISOString().split('T')[0];
        
        // Check if digest was already sent today
        const { data: digestTrack } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'daily_digest_sent')
          .maybeSingle();
          
        const lastSentDate = digestTrack?.value?.date;
        
        if (lastSentDate !== todayStr) {
          console.log('[Worker] Executing Daily Performance Summary Digest...');
          
          // Query job logs for past 24 hours
          const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          const { data: recentLogs } = await supabase
            .from('job_logs')
            .select('*')
            .gt('started_at', dayAgo);
            
          const fetcherRuns = recentLogs?.filter(l => l.job_name === 'fetcher_cron').length || 0;
          const workerRuns = recentLogs?.filter(l => l.job_name === 'queue_worker').length || 0;
          
          // Query queue statuses
          const { data: pendingCount } = await supabase.rpc('get_queue_count_by_status', { check_status: 'pending' });
          const { data: completedCount } = await supabase.rpc('get_queue_count_by_status', { check_status: 'completed' });
          const { data: failedCount } = await supabase.rpc('get_queue_count_by_status', { check_status: 'failed' });
          
          // Fallback query if RPCs not configured
          let pCount = pendingCount || 0;
          let cCount = completedCount || 0;
          let fCount = failedCount || 0;
          
          if (pendingCount === null) {
            const { count: p } = await supabase.from('publisher_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: c } = await supabase.from('publisher_queue').select('*', { count: 'exact', head: true }).eq('status', 'completed');
            const { count: f } = await supabase.from('publisher_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed');
            pCount = p;
            cCount = c;
            fCount = f;
          }

          const { data: usageData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'whatsapp_usage')
            .maybeSingle();
            
          const waCount = usageData?.value?.count || 0;
          
          const digestMsg = `📊 <b>Daily Performance Digest</b>\n` +
            `📅 Date: <b>${todayStr} (UTC)</b>\n\n` +
            `🔄 Fetcher Runs: <b>${fetcherRuns}</b>\n` +
            `⚙️ Worker Runs: <b>${workerRuns}</b>\n\n` +
            `✅ Completed Deals: <b>${cCount}</b>\n` +
            `⏳ Pending Queue: <b>${pCount}</b>\n` +
            `❌ Failed Queue: <b>${fCount}</b>\n\n` +
            `📱 WhatsApp API Quota: <b>${waCount}/100</b>\n` +
            `💓 Heartcheck status: <b>Active</b>`;
            
          await sendAdminAlert(digestMsg, 'daily_digest');
          
          // Save sent date
          await supabase
            .from('settings')
            .upsert({
              key: 'daily_digest_sent',
              value: { date: todayStr },
              updated_at: new Date().toISOString()
            });
        }
      }
    } catch (digestErr) {
      console.warn('[Worker] Daily summary digest failed:', digestErr.message);
    }

    return {
      success: true,
      durationMs: Date.now() - startedAt.getTime(),
      itemsProcessed,
      itemsFailed,
      logs
    };

  } catch (globalErr) {
    console.error('[Worker] Global failure:', globalErr);
    return {
      success: false,
      durationMs: Date.now() - startedAt.getTime(),
      itemsProcessed,
      itemsFailed,
      errors: [globalErr.message]
    };
  }
}
