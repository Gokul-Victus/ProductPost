async function testRSS() {
  console.log('Fetching live deals RSS feed...');
  try {
    const response = await fetch('https://indiafreestuff.in/feed');
    const xmlText = await response.text();
    console.log(`Feed retrieved. Length: ${xmlText.length} bytes`);
    console.log('Response preview:', xmlText.substring(0, 1000));

    // Match all Amazon links
    const amazonPattern = /https?:\/\/(?:www\.)?(?:amazon\.in|amzn\.to|amzn\.in)\/[^\s"'>]+/gi;
    const matches = xmlText.match(amazonPattern) || [];
    
    // Clean and filter duplicates
    const uniqueUrls = [...new Set(matches.map(url => {
      // Decode XML entities like &amp;
      return url.replace(/&amp;/g, '&');
    }))];

    console.log(`Found ${uniqueUrls.length} Amazon URLs in feed:`);
    uniqueUrls.slice(0, 10).forEach((url, index) => {
      console.log(`[${index + 1}] ${url}`);
    });
  } catch (err) {
    console.error('Failed to parse RSS feed:', err.message);
  }
}

testRSS();
