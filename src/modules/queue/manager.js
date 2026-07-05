import { supabase } from '../../database/supabase.js';

/**
 * Enqueues a normalized product into the database for queue-based publishing.
 * Performs product registration (upsert) and duplicate checking.
 * @param {Object} product - Normalized product object.
 * @param {Array<string>} [channels] - Target channels to post to (default: ['telegram']).
 * @returns {Promise<Object>} Object containing database product ID and enqueued queue job IDs.
 */
export async function enqueueProduct(product, channels = ['telegram']) {
  if (!product.externalId || !product.store) {
    throw new Error('[QueueManager] Cannot enqueue product without externalId and store.');
  }

  // 1. Register/Upsert product in master catalog
  const { data: productData, error: productError } = await supabase
    .from('products')
    .upsert({
      external_id: product.externalId,
      store: product.store,
      title: product.title,
      image_url: product.imageUrl,
      raw_url: product.rawUrl,
      rating: product.rating,
      updated_at: new Date().toISOString()
    }, { onConflict: 'store,external_id' })
    .select();

  if (productError) {
    throw new Error(`[QueueManager] Product registration failed: ${productError.message}`);
  }

  const dbProduct = productData[0];
  const enqueuedIds = [];

  // 2. Add to price history
  try {
    const salePrice = parseFloat(product.salePrice);
    if (!isNaN(salePrice)) {
      await supabase
        .from('price_history')
        .insert({
          product_id: dbProduct.id,
          price: salePrice
        });
    }
  } catch (err) {
    console.warn(`[QueueManager] Failed to record price history for ${dbProduct.id}:`, err.message);
  }

  // 3. Create publishing queue jobs
  for (const channel of channels) {
    // Duplicate Check: Avoid queueing if there's a pending or completed job for this product & channel
    const { data: existing, error: checkError } = await supabase
      .from('publisher_queue')
      .select('id, status')
      .eq('product_id', dbProduct.id)
      .eq('channel', channel)
      .in('status', ['pending', 'completed']);

    if (!checkError && existing && existing.length > 0) {
      console.log(`[QueueManager] Product ${dbProduct.external_id} is already enqueued or completed for ${channel}. Skipping.`);
      continue;
    }

    // Insert pending queue job
    const { data: queueData, error: queueError } = await supabase
      .from('publisher_queue')
      .insert({
        product_id: dbProduct.id,
        channel,
        status: 'pending',
        formatted_content: JSON.stringify({
          salePrice: product.salePrice,
          originalPrice: product.originalPrice
        })
      })
      .select();

    if (queueError) {
      console.error(`[QueueManager] Failed to insert queue job for channel "${channel}":`, queueError.message);
    } else if (queueData && queueData[0]) {
      enqueuedIds.push(queueData[0].id);
    }
  }

  return {
    productId: dbProduct.id,
    enqueuedIds
  };
}

/**
 * Fetches a batch of pending jobs from the queue.
 * @param {number} [limit] - Max number of jobs to fetch.
 * @returns {Promise<Array<Object>>} List of pending queue jobs including joined product details.
 */
export async function getPendingJobs(limit = 5) {
  const { data, error } = await supabase
    .from('publisher_queue')
    .select(`
      id,
      product_id,
      channel,
      status,
      retries,
      formatted_content,
      products (
        id,
        external_id,
        store,
        title,
        image_url,
        raw_url,
        rating
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`[QueueManager] Failed to fetch pending jobs: ${error.message}`);
  }

  return data;
}

/**
 * Updates a queue job's status.
 * @param {string} queueId - UUID of the queue job.
 * @param {string} status - New queue status ('processing', 'completed', 'failed').
 * @param {Object} [updates] - Additional columns to update (e.g. error_log, processed_at).
 * @returns {Promise<void>}
 */
export async function updateJobStatus(queueId, status, updates = {}) {
  const payload = {
    status,
    ...updates,
    processed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null
  };

  const { error } = await supabase
    .from('publisher_queue')
    .update(payload)
    .eq('id', queueId);

  if (error) {
    console.error(`[QueueManager] Failed to update queue job ${queueId} to ${status}:`, error.message);
  }
}
