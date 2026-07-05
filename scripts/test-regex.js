async function testProduct(asin) {
  const url = `https://www.amazon.in/dp/${asin}`;
  console.log(`\nTesting ASIN: ${asin}`);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await response.text();

    const refinedMrpMatch = html.match(/class="a-price\s+a-text-price"[^>]*data-a-strike="true"[^]*?class="a-offscreen"[^>]*>\s*([0-9.,₹\s]+)/i) ||
                             html.match(/data-a-strike="true"[^]*?class="a-price\s+a-text-price"[^]*?class="a-offscreen"[^>]*>\s*([0-9.,₹\s]+)/i);

    if (refinedMrpMatch) {
      console.log('MRP Found:', refinedMrpMatch[1].trim());
    } else {
      console.log('MRP NOT Found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function run() {
  await testProduct('B092LXV199'); // Dabur Shampoo
  await testProduct('B0GZ4823BQ'); // Pulsar Bike
}

run();
