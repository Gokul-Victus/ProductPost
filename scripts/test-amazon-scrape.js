async function run() {
  const url = 'https://www.amazon.in/dp/B0DZP35V4D';
  console.log('Fetching:', url);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    const html = await response.text();

    console.log('Is CAPTCHA page?', html.includes('captcha'));

    // Test Title
    const titleMatch = html.match(/id="productTitle"[^>]*>\s*([^<]+)/i);
    console.log('Title Match:', titleMatch ? titleMatch[1].trim() : 'NONE');

    // Test Price matches
    const matchesWhole = [...html.matchAll(/class="a-price-whole"[^>]*>\s*([0-9.,₹\s]+)/ig)];
    console.log('\nAll occurrences of a-price-whole:');
    matchesWhole.forEach((m, idx) => {
      console.log(`${idx + 1}: ${m[0]} -> Extracted: ${m[1]}`);
    });

    const priceMatch = html.match(/class="a-price-whole"[^>]*>\s*([0-9.,₹\s]+)/i);
    console.log('\nFinal regex match choice:', priceMatch ? priceMatch[1] : 'NONE');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
