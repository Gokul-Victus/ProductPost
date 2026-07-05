const { supabase } = require('../src/database/supabase.js');

async function run() {
  console.log('Clearing the Pulsar and Dabur Shampoo items from database to trigger a clean re-fetch...');
  
  try {
    // 1. Delete matching queue items
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .in('external_id', ['B0GZ4823BQ', 'B092LXV199']);

    if (products && products.length > 0) {
      const ids = products.map(p => p.id);
      
      const { error: queueErr } = await supabase
        .from('publisher_queue')
        .delete()
        .in('product_id', ids);

      if (queueErr) console.error('Error deleting queue jobs:', queueErr.message);

      // 2. Delete products (will cascade to price history)
      const { error: prodErr } = await supabase
        .from('products')
        .delete()
        .in('id', ids);

      if (prodErr) console.error('Error deleting products:', prodErr.message);
      else console.log('Successfully cleared products from DB.');
    } else {
      console.log('Products already cleared or not found.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
