const path = require('path');
require('module-alias').addAlias('@', path.join(__dirname, '../src'));
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { supabase } = require('@/database/supabase.js');

async function inspect() {
  console.log('=== DATABASE INSPECTION ===');
  
  const { data: queue } = await supabase.from('publisher_queue').select('*');
  console.log('Queue jobs count:', queue.length);
  queue.forEach(q => {
    console.log(`- Job ID: ${q.id} | Product ID: ${q.product_id} | Status: ${q.status}`);
  });

  const { data: products } = await supabase.from('products').select('*');
  console.log('\nProducts count:', products.length);
  products.forEach(p => {
    console.log(`- Product ID: ${p.id} | Title: ${p.title.substring(0, 40)}`);
  });

  const { data: clickSlugs } = await supabase.from('click_slugs').select('*');
  console.log('\nClick Slugs count:', clickSlugs.length);
  clickSlugs.forEach(c => {
    console.log(`- Slug: ${c.slug} | Product ID: ${c.product_id}`);
  });
}

inspect();
