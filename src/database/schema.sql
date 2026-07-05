-- 1. Configuration & Settings (Feature Flags, API details, prompts)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Master Product Registry
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,         -- store-specific unique ID (e.g. ASIN)
  store TEXT NOT NULL,               -- 'Amazon', 'Flipkart', etc.
  title TEXT NOT NULL,
  image_url TEXT,
  category TEXT,                     -- AI categorized
  raw_url TEXT NOT NULL,
  rating NUMERIC(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(store, external_id)
);

-- 3. Price History for Price Drop Tracking
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Publisher Queue status enum and table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_status') THEN
    CREATE TYPE queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS publisher_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,             -- 'telegram', 'discord', etc.
  formatted_content TEXT,
  image_url TEXT,
  status queue_status DEFAULT 'pending' NOT NULL,
  retries INT DEFAULT 0 NOT NULL,
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Click Redirect Registry & Analytics
CREATE TABLE IF NOT EXISTS click_slugs (
  slug TEXT PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  affiliate_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS clicks_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT REFERENCES click_slugs(slug) ON DELETE CASCADE,
  store TEXT NOT NULL,
  channel TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  estimated_commission NUMERIC(10, 2) DEFAULT 0.0,
  actual_commission NUMERIC(10, 2) DEFAULT 0.0,
  conversion_status TEXT DEFAULT 'pending', -- 'pending', 'converted', 'cancelled'
  currency TEXT DEFAULT 'INR'
);

-- 6. Event Log / Job Log
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INT NOT NULL,
  items_processed INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Seed default settings for Phase 1
INSERT INTO settings (key, value)
VALUES 
  ('feature_flags', '{"enable_ai": false, "enable_telegram": true, "enable_logging": true, "enable_queue": true}'),
  ('telegram_config', '{"bot_token": "", "channel_id": ""}'),
  ('amazon_config', '{"tag": "your-amazon-tag-21", "use_api": false}'),
  ('prompt_templates', '{"telegram_deal": "🔥 Today''s Deal\n\n{title}\n\n₹{salePrice} ➜ ₹{originalPrice}\n\n✅ Save {discount}%\n\n⭐ Rating {rating}\n\n🛒 Buy Now: {affiliateUrl}"}')
ON CONFLICT (key) DO NOTHING;
