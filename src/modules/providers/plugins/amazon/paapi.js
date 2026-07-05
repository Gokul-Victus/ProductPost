import crypto from 'crypto';

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

/**
 * Client for Amazon Product Advertising API 5.0 (PA-API) using SigV4 signing.
 */
export class AmazonPAAPI {
  constructor(config = {}) {
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.partnerTag = config.partnerTag || 'smartdealsgo-21';
    this.host = config.host || 'webservices.amazon.in';
    this.region = config.region || 'eu-west-1'; // eu-west-1 is region for webservices.amazon.in
    this.service = 'ProductAdvertisingAPI';
    this.path = '/paapi5/getitems';
  }

  /**
   * Retrieves product details from Amazon PA-API using GetItems request.
   * @param {Array<string>} itemIds - List of ASIN codes (up to 10).
   * @returns {Promise<Array<Object>>} List of parsed product objects.
   */
  async getItems(itemIds) {
    if (!this.accessKey || !this.secretKey) {
      throw new Error('[PA-API] Credentials missing. Add AWS keys to settings.');
    }

    const payload = JSON.stringify({
      ItemIds: itemIds,
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'Offers.Listings.Price',
        'Offers.Listings.SavingBasis',
        'CustomerReviews.SearchBin'
      ],
      PartnerTag: this.partnerTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.in'
    });

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const dateStamp = amzDate.substring(0, 8);

    const canonicalHeaders = `host:${this.host}\nx-amz-date:${amzDate}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems\n`;
    const signedHeaders = 'host;x-amz-date;x-amz-target';
    
    const canonicalRequest = [
      'POST',
      this.path,
      '',
      canonicalHeaders,
      signedHeaders,
      sha256(payload)
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest)
    ].join('\n');

    const signingKey = getSignatureKey(this.secretKey, dateStamp, this.region, this.service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const url = `https://${this.host}${this.path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Host': this.host,
        'X-Amz-Date': amzDate,
        'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
        'Authorization': authorizationHeader
      },
      body: payload
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.Errors?.[0]?.Message || `PA-API HTTP ${response.status}`);
    }

    const items = data?.SearchResult?.Items || [];
    return items.map(item => {
      const asin = item.ASIN;
      const title = item.ItemInfo?.Title?.DisplayValue || 'Discounted Product';
      const image = item.Images?.Primary?.Large?.URL || 'https://m.media-amazon.com/images/I/31W%2Bq%2BCXyOL.jpg';
      
      const listing = item.Offers?.Listings?.[0];
      const price = listing?.Price?.Amount || null;
      // SavingBasis is the List Price (MRP)
      const mrp = listing?.SavingBasis?.Amount || price;

      return {
        asin,
        title,
        image,
        price: price ? String(price) : '999',
        mrp: mrp ? String(mrp) : '1499',
        rating: '4.2', // PA-API 5.0 does not return star ratings directly, default to 4.2
        url: `https://www.amazon.in/dp/${asin}`
      };
    });
  }
}
