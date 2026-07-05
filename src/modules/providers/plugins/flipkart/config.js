export const config = {
  name: 'Flipkart',
  enabled: true,
  defaultAffid: 'your-flipkart-affid',
  // CSS selectors for backup scraper
  selectors: {
    title: [
      'h1',
      'meta[property="og:title"]',
      '.B_NuCI'
    ],
    price: [
      '._30jeq3',
      '._16Jk6d',
      '.a-price-whole'
    ],
    mrp: [
      '._3I9_R0',
      '._2pLDsy',
      '.a-price.a-text-price'
    ],
    image: [
      'img._396csP',
      'meta[property="og:image"]',
      '._312yqP'
    ],
    rating: [
      '._3LWZlK',
      '.a-icon-alt'
    ]
  }
};
