'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, Shield, Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Settings values
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [amazonTag, setAmazonTag] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  
  // WhatsApp settings (Green API)
  const [whatsappInstanceId, setWhatsappInstanceId] = useState('');
  const [whatsappApiToken, setWhatsappApiToken] = useState('');
  const [whatsappChatId, setWhatsappChatId] = useState('');

  // Flipkart & sub-affiliates settings
  const [flipkartTag, setFlipkartTag] = useState('');
  const [cuelinksPubId, setCuelinksPubId] = useState('');
  const [earnkaroRefId, setEarnKaroRefId] = useState('');

  // Sourcing settings
  const [sourcingChannels, setSourcingChannels] = useState('lootalerts');
  
  // Feature flags
  const [flags, setFlags] = useState({
    enable_ai: false,
    enable_telegram: true,
    enable_whatsapp: false,
    enable_logging: true,
    enable_queue: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();

      if (res.ok && data.success) {
        const dbSettings = data.settings;
        
        if (dbSettings.telegram_config) {
          setBotToken(dbSettings.telegram_config.bot_token || '');
          setChannelId(dbSettings.telegram_config.channel_id || '');
        }
        if (dbSettings.amazon_config) {
          setAmazonTag(dbSettings.amazon_config.tag || '');
        }
        if (dbSettings.gemini_config) {
          setGeminiKey(dbSettings.gemini_config.api_key || '');
        }
        if (dbSettings.whatsapp_config) {
          setWhatsappInstanceId(dbSettings.whatsapp_config.instance_id || '');
          setWhatsappApiToken(dbSettings.whatsapp_config.api_token || '');
          setWhatsappChatId(dbSettings.whatsapp_config.chat_id || '');
        }
        if (dbSettings.flipkart_config) {
          setFlipkartTag(dbSettings.flipkart_config.affid || '');
        }
        if (dbSettings.cuelinks_config) {
          setCuelinksPubId(dbSettings.cuelinks_config.pub_id || '');
        }
        if (dbSettings.earnkaro_config) {
          setEarnKaroRefId(dbSettings.earnkaro_config.ref_id || '');
        }
        if (dbSettings.sourcing_channels) {
          setSourcingChannels(dbSettings.sourcing_channels.join(', '));
        }
        if (dbSettings.feature_flags) {
          setFlags(dbSettings.feature_flags);
        }
      } else {
        setError(data.error || 'Failed to fetch settings from database.');
      }
    } catch (err) {
      setError(`Failed to connect to configurations API: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagChange = (flag) => {
    setFlags(prev => ({
      ...prev,
      [flag]: !prev[flag]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      settings: {
        telegram_config: { bot_token: botToken, channel_id: channelId },
        amazon_config: { tag: amazonTag, use_api: false },
        gemini_config: { api_key: geminiKey },
        whatsapp_config: { instance_id: whatsappInstanceId, api_token: whatsappApiToken, chat_id: whatsappChatId },
        flipkart_config: { affid: flipkartTag, use_api: false },
        cuelinks_config: { pub_id: cuelinksPubId },
        earnkaro_config: { ref_id: earnkaroRefId },
        sourcing_channels: sourcingChannels.split(',').map(s => s.trim()).filter(Boolean),
        feature_flags: flags
      }
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Configurations successfully saved and synchronized.');
      } else {
        setError(data.error || 'Failed to update configurations.');
      }
    } catch (err) {
      setError(`Save connection error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--text-secondary)' }}>
        Loading configuration panels...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
          Configuration Engine
        </span>
        <h1 className="glow-text" style={{ fontSize: '32px', marginTop: '4px' }}>System Settings</h1>
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

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Telegram Config Panel */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} style={{ color: 'var(--accent-cyan)' }} />
            Telegram Publisher Credentials
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                Telegram Bot Token
              </label>
              <input 
                type="password" 
                placeholder="Enter Bot Token (e.g. 123456789:ABCdefGhI_jklm...)" 
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                Telegram Channel Chat ID
              </label>
              <input 
                type="text" 
                placeholder="Enter Channel ID (e.g. -1001234567890 or @yourchannel)" 
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Affiliate Tag Panel */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} style={{ color: 'var(--accent-cyan)' }} />
            Amazon Associate Tracking Parameters
          </h3>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
              Associate Tag (default)
            </label>
            <input 
              type="text" 
              placeholder="e.g. tag-21" 
              value={amazonTag}
              onChange={(e) => setAmazonTag(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        {/* Gemini AI Config Panel */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} style={{ color: 'var(--accent-cyan)' }} />
            Google Gemini AI Engine Credentials
          </h3>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
              Gemini API Key
            </label>
            <input 
              type="password" 
              placeholder="Enter Gemini API Key (e.g. AIzaSy...)" 
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        {/* Sourcing Channels Panel */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} style={{ color: 'var(--accent-cyan)' }} />
            Automatic Sourcing Channels
          </h3>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
              Telegram Source Channels (comma-separated handles)
            </label>
            <input 
              type="text" 
              placeholder="e.g. lootalerts, desidimeloot" 
              value={sourcingChannels}
              onChange={(e) => setSourcingChannels(e.target.value)}
              className="form-input"
            />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              The scraper will crawl the public preview of these Telegram channels (every 15 minutes) to extract Amazon, Flipkart, Myntra, Ajio, and Meesho links automatically.
            </p>
          </div>
        </div>

        {/* WhatsApp Config Panel (Green API) */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} style={{ color: 'var(--accent-cyan)' }} />
            WhatsApp Publisher Credentials (Green API)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                Green API Instance ID
              </label>
              <input 
                type="text" 
                placeholder="Enter Instance ID (e.g. 1101824701)" 
                value={whatsappInstanceId}
                onChange={(e) => setWhatsappInstanceId(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                Green API Token Instance
              </label>
              <input 
                type="password" 
                placeholder="Enter API Token Instance" 
                value={whatsappApiToken}
                onChange={(e) => setWhatsappApiToken(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                Target Chat/Group/Channel ID
              </label>
              <input 
                type="text" 
                placeholder="e.g. 1203632123456789@g.us (Group) or 919999999999@c.us (Private)" 
                value={whatsappChatId}
                onChange={(e) => setWhatsappChatId(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Flipkart & Sub-Affiliates Panel */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} style={{ color: 'var(--accent-cyan)' }} />
            Flipkart & Sub-Affiliate Parameters
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                Flipkart Affiliate ID (optional)
              </label>
              <input 
                type="text" 
                placeholder="e.g. yourid (direct Flipkart config)" 
                value={flipkartTag}
                onChange={(e) => setFlipkartTag(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                Cuelinks Publisher ID (optional)
              </label>
              <input 
                type="text" 
                placeholder="e.g. 12345 (used for Ajio, Myntra, Meesho, Flipkart)" 
                value={cuelinksPubId}
                onChange={(e) => setCuelinksPubId(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                EarnKaro Referral ID (optional)
              </label>
              <input 
                type="text" 
                placeholder="e.g. 1234567" 
                value={earnkaroRefId}
                onChange={(e) => setEarnKaroRefId(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Feature Flags Panel */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Feature Toggles & Engine Controls</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Queue Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: 600 }}>Enable Publisher Queueing</h5>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Deals are stored in database queue first instead of posting directly. Highly recommended.
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={flags.enable_queue}
                onChange={() => handleFlagChange('enable_queue')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
            </div>

            {/* Telegram Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: 600 }}>Enable Telegram Publications</h5>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Allows the worker to dispatch deals to the configured Telegram channel.
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={flags.enable_telegram}
                onChange={() => handleFlagChange('enable_telegram')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
            </div>

            {/* WhatsApp Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: 600 }}>Enable WhatsApp Publications</h5>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Allows the worker to dispatch deals to the configured WhatsApp group/channel via Green API.
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={flags.enable_whatsapp}
                onChange={() => handleFlagChange('enable_whatsapp')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
            </div>

            {/* Logging Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: 600 }}>Enable Execution Logging</h5>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Logs worker and scraper schedules to Supabase for debugging.
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={flags.enable_logging}
                onChange={() => handleFlagChange('enable_logging')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
            </div>

            {/* AI Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: 600 }}>Enable AI Content Gen (Gemini)</h5>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Leverages Gemini AI to score deals, categorize, and rewrite descriptions.
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={flags.enable_ai}
                onChange={() => handleFlagChange('enable_ai')}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving} className="btn-primary" style={{ minWidth: '180px', justifyContent: 'center' }}>
            <Save size={18} />
            {saving ? 'Saving Configs...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
