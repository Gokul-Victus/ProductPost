async function scrapeStructuredData(url) {
  console.log(`Fetching page: ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    const html = await response.text();

    // Find JSON-LD script blocks
    const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([^]+?)<\/script>/ig)];
    console.log(`Found ${jsonLdBlocks.length} JSON-LD block(s).`);

    let productDetails = null;

    for (const block of jsonLdBlocks) {
      try {
        const json = JSON.parse(block[1].trim());
        
        // Handle array of schemas or single schema
        const schemas = Array.isArray(json) ? json : [json];
        
        for (const schema of schemas) {
          if (schema['@type'] === 'Product') {
            const name = schema.name || schema.title;
            const image = Array.isArray(schema.image) ? schema.image[0] : schema.image;
            let price = null;
            let currency = 'INR';

            if (schema.offers) {
              const offer = Array.isArray(schema.offers) ? schema.offers[0] : schema.offers;
              price = offer.price || offer.lowPrice;
              currency = offer.priceCurrency || 'INR';
            }

            productDetails = {
              title: name,
              image: image,
              price: price,
              currency: currency
            };
            break;
          }
        }
        if (productDetails) break;
      } catch (e) {
        // ignore JSON parse error in specific block
      }
    }

    if (productDetails) {
      console.log('Successfully extracted product details:');
      console.log(JSON.stringify(productDetails, null, 2));
    } else {
      console.log('Could not find Product Schema in JSON-LD. Extracting OpenGraph fallback...');
      const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/i) || html.match(/content="([^"]+)"\s+property="og:title"/i);
      const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/i) || html.match(/content="([^"]+)"\s+property="og:image"/i);
      
      console.log('OG Title:', ogTitle ? ogTitle[1] : 'None');
      console.log('OG Image:', ogImage ? ogImage[1] : 'None');
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function run() {
  // Test with a real Myntra T-Shirt URL
  await scrapeStructuredData('https://www.myntra.com/tshirts/roadster/roadster-men-black-cotton-pure-cotton-t-shirt/1996777/buy');
}

run();
