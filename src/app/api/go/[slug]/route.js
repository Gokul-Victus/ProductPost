import { supabase } from '@/database/supabase.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { slug } = params;

  if (!slug) {
    return new Response('Slug is missing.', { status: 400 });
  }

  try {
    // 1. Fetch destination url and product metadata
    const { data, error } = await supabase
      .from('click_slugs')
      .select(`
        product_id,
        affiliate_url,
        products (
          store
        )
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) {
      console.warn(`[ClickRedirect] Slug not found: ${slug}`);
      // Redirect to home page if slug is invalid
      return Response.redirect(new URL('/', request.url).toString(), 302);
    }

    const affiliateUrl = data.affiliate_url;
    const store = data.products?.store || 'Unknown';

    // 2. Log click analytics inside Supabase (running in background)
    supabase.from('clicks_analytics').insert({
      slug,
      store,
      channel: 'telegram', // Default for Phase 1/2 channel
      clicked_at: new Date().toISOString()
    }).then(({ error: logErr }) => {
      if (logErr) {
        console.error('[ClickRedirect] Failed to record click analytics:', logErr.message);
      }
    });

    // 3. Perform 302 redirect
    return Response.redirect(affiliateUrl, 302);

  } catch (err) {
    console.error(`[ClickRedirect] Global crash for slug ${slug}:`, err.message);
    return Response.redirect(new URL('/', request.url).toString(), 302);
  }
}
