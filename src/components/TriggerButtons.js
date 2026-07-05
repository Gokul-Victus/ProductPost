'use client';

import { useState } from 'react';
import { RefreshCw, Play } from 'lucide-react';

export default function TriggerButtons() {
  const [fetching, setFetching] = useState(false);
  const [working, setWorking] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' or 'error'

  const triggerFetch = async () => {
    setFetching(true);
    setStatusText('Running fetch scraper...');
    setStatusType('');
    
    try {
      const res = await fetch('/api/cron/fetch?secret=local-secret-123');
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStatusText(`Scraper completed. Processed: ${data.itemsProcessed || 0}, Enqueued: ${data.itemsEnqueued || 0}`);
        setStatusType('success');
        // Refresh the page data after success
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatusText(`Scraper failed: ${data.error || 'Unknown error'}`);
        setStatusType('error');
      }
    } catch (err) {
      setStatusText(`Connection error: ${err.message}`);
      setStatusType('error');
    } finally {
      setFetching(false);
    }
  };

  const triggerWorker = async () => {
    setWorking(true);
    setStatusText('Running queue worker...');
    setStatusType('');

    try {
      const res = await fetch('/api/cron/worker?secret=local-secret-123');
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusText(data.message || `Worker completed. Processed: ${data.itemsProcessed || 0}, Failed: ${data.itemsFailed || 0}`);
        setStatusType('success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatusText(`Worker failed: ${data.error || 'Unknown error'}`);
        setStatusType('error');
      }
    } catch (err) {
      setStatusText(`Connection error: ${err.message}`);
      setStatusType('error');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={triggerFetch} 
          disabled={fetching || working}
          className="btn-primary"
          style={{ flex: 1, opacity: fetching || working ? 0.7 : 1 }}
        >
          <RefreshCw size={18} className={fetching ? 'animate-spin' : ''} style={{ animation: fetching ? 'spin 1s linear infinite' : 'none' }} />
          {fetching ? 'Fetching Deals...' : 'Trigger Fetch Scraper'}
        </button>
        
        <button 
          onClick={triggerWorker} 
          disabled={fetching || working}
          className="btn-secondary"
          style={{ flex: 1, opacity: fetching || working ? 0.7 : 1 }}
        >
          <Play size={18} className={working ? 'animate-pulse' : ''} />
          {working ? 'Processing Queue...' : 'Run Queue Worker'}
        </button>
      </div>

      {statusText && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '13px',
          background: statusType === 'success' ? 'rgba(16, 185, 129, 0.1)' : statusType === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          color: statusType === 'success' ? '#34d399' : statusType === 'error' ? '#f87171' : '#d1d5db',
          border: `1px solid ${statusType === 'success' ? 'rgba(16, 185, 129, 0.2)' : statusType === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
          transition: 'all 0.3s ease'
        }}>
          {statusText}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
