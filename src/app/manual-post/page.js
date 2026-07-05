'use client';

import { useState } from 'react';
import { Send, Link2, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

export default function ManualPostPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Product state
  const [product, setProduct] = useState(null);

  const handleExtract = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setProduct(null);

    try {
      const res = await fetch(`/api/fetch-metadata?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setProduct(data.product);
      } else {
        setError(data.error || 'Failed to extract product details.');
      }
    } catch (err) {
      setError(`Extraction connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/manual-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          channels: ['telegram']
        })
      });
      
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Product successfully registered and enqueued! Running queue worker next is advised.');
        // Clear form after delay
        setTimeout(() => {
          setProduct(null);
          setUrl('');
          setSuccess('');
        }, 3000);
      } else {
        setError(data.error || 'Failed to enqueue product.');
      }
    } catch (err) {
      setError(`Submission connection error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate discount percentage
  const calculateDiscount = () => {
    if (!product) return 0;
    const original = parseFloat(product.originalPrice);
    const sale = parseFloat(product.salePrice);
    if (!isNaN(original) && !isNaN(sale) && original > sale) {
      return Math.round(((original - sale) / original) * 100);
    }
    return 0;
  };

  const discountPercent = calculateDiscount();

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
          Manual deal insertion
        </span>
        <h1 className="glow-text" style={{ fontSize: '32px', marginTop: '4px' }}>Publish Custom Deals</h1>
      </div>

      <div className="glass-panel" style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Paste Product Link</h3>
        <form onSubmit={handleExtract} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Link2 size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="url" 
              placeholder="Paste Amazon product URL (e.g. https://www.amazon.in/dp/...)" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '48px' }}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ minWidth: '150px', justifyContent: 'center' }}>
            {loading ? 'Scraping...' : 'Extract Product'}
          </button>
        </form>
      </div>

      {error && (
        <div className="badge-failed" style={{ padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px', fontSize: '14px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="badge-completed" style={{ padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px', fontSize: '14px' }}>
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      {product && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px' }}>
          {/* Edit Form */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} style={{ color: 'var(--accent-cyan)' }} />
              Review & Customize Scraped Metadata
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                  Product Title
                </label>
                <input 
                  type="text" 
                  value={product.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                    Sale Price (₹)
                  </label>
                  <input 
                    type="number" 
                    value={product.salePrice || ''}
                    onChange={(e) => handleFieldChange('salePrice', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                    Original Price / MRP (₹)
                  </label>
                  <input 
                    type="number" 
                    value={product.originalPrice || ''}
                    onChange={(e) => handleFieldChange('originalPrice', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                    Rating (out of 5)
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="5"
                    value={product.rating || ''}
                    onChange={(e) => handleFieldChange('rating', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                    External ID (ASIN / ASIN-Ref)
                  </label>
                  <input 
                    type="text" 
                    value={product.externalId}
                    className="form-input"
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    disabled
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                  Image URL
                </label>
                <input 
                  type="text" 
                  value={product.imageUrl || ''}
                  onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ marginTop: '10px' }}>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  <Send size={18} />
                  {submitting ? 'Adding to Queue...' : 'Queue Deal for Telegram'}
                </button>
              </div>
            </form>
          </div>

          {/* Interactive Card Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Deal Card Preview
            </h4>
            
            <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
              {discountPercent > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'var(--primary-glow)',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  boxShadow: '0 4px 10px rgba(225,0,255,0.3)',
                  zIndex: 2
                }}>
                  -{discountPercent}% OFF
                </div>
              )}

              {/* Product Image */}
              <div style={{
                width: '100%',
                height: '180px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.03)',
                marginBottom: '16px'
              }}>
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt="Preview" 
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', padding: '10px' }}
                  />
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No Image Provided</span>
                )}
              </div>

              {/* Product Metadata */}
              <span style={{ fontSize: '10px', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,240,255,0.2)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                {product.store}
              </span>

              <h4 style={{
                fontSize: '15px',
                fontWeight: 600,
                marginTop: '10px',
                lineHeight: '1.4',
                height: '42px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                color: '#fff'
              }}>
                {product.title || 'Product Title'}
              </h4>

              {/* Price details */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '14px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{product.salePrice ? Number(product.salePrice).toLocaleString('en-IN') : '0'}
                </span>
                {product.originalPrice && Number(product.originalPrice) > Number(product.salePrice) && (
                  <span style={{ fontSize: '13px', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>
                    ₹{Number(product.originalPrice).toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {product.rating && (
                <div style={{ fontSize: '12px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '14px' }}>
                  <span>★</span>
                  <span style={{ fontWeight: 600 }}>{product.rating}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>out of 5</span>
                </div>
              )}

              <div style={{
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                Affiliate tag automatically appended on queue publish.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
