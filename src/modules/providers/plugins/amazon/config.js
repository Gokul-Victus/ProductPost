export const config = {
  name: 'Amazon',
  enabled: true,
  defaultTag: 'your-amazon-tag-21',
  // CSS selectors for backup scraper
  selectors: {
    title: [
      '#productTitle',
      'meta[property="og:title"]',
      'h1'
    ],
    price: [
      '.a-price-whole',
      '.apexPriceToPay .a-offscreen',
      '.priceToPay .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice'
    ],
    mrp: [
      '.basisPrice .a-offscreen',
      '.a-price.a-text-price .a-offscreen',
      '#priceblock_strike'
    ],
    image: [
      '#landingImage',
      'meta[property="og:image"]',
      '#imgBlkFront'
    ],
    rating: [
      '#acrPopover .a-color-base',
      '.a-icon-alt',
      '#acrCustomerReviewLink'
    ]
  }
};
