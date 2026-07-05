import { supabase } from '@/database/supabase.js';

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  // 1. Fetch queue status counts
  const { data: queueData } = await supabase
    .from('publisher_queue')
    .select('status');
  
  const counts = { pending: 0, processing: 0, completed: 0, failed: 0 };
  if (queueData) {
    queueData.forEach(item => {
      if (counts[item.status] !== undefined) {
        counts[item.status]++;
      }
    });
  }

  // 2. Fetch Green API daily usage details
  const { data: usageData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'whatsapp_usage')
    .maybeSingle();
  const waUsage = usageData?.value || { date: 'N/A', count: 0 };

  // 3. Fetch MacroDroid Heartcheck details
  const { data: hbData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'macrodroid_heartbeat')
    .maybeSingle();
  const hbTime = hbData?.value?.timestamp ? new Date(hbData.value.timestamp).toLocaleString('en-IN') : 'N/A';

  // 4. Fetch last 20 cron executions logs
  const { data: logsData } = await supabase
    .from('job_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20);

  // Simple clean inline styles for premium dark dashboard
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#0a0a0c',
    color: '#e5e7eb',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '40px 20px',
    boxSizing: 'border-box'
  };

  const headerStyle = {
    maxWidth: '1200px',
    margin: '0 auto 32px auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto 40px auto'
  };

  const cardStyle = {
    backgroundColor: '#111115',
    border: '1px solid #222227',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)'
  };

  const tableContainerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#111115',
    border: '1px solid #222227',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
    fontSize: '14px'
  };

  const thStyle = {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid #222227',
    color: '#9ca3af',
    fontWeight: '600'
  };

  const tdStyle = {
    padding: '16px',
    borderBottom: '1px solid #1c1c22',
    color: '#e5e7eb'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', margin: 0 }}>LootSyncs Console</h1>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: '4px 0 0 0' }}>Real-time automated status dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#10b981' }}>System Live</span>
        </div>
      </div>

      {/* Grid Summary Cards */}
      <div style={gridStyle}>
        {/* Queue Card */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#9ca3af', marginTop: 0, marginBottom: '16px' }}>Publisher Queue</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ backgroundColor: '#18181c', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb' }}>{counts.pending}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Pending</div>
            </div>
            <div style={{ backgroundColor: '#18181c', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>{counts.processing}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Processing</div>
            </div>
            <div style={{ backgroundColor: '#18181c', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{counts.completed}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Completed</div>
            </div>
            <div style={{ backgroundColor: '#18181c', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>{counts.failed}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Failed</div>
            </div>
          </div>
        </div>

        {/* WhatsApp Limits Card */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#9ca3af', marginTop: 0, marginBottom: '16px' }}>WhatsApp Gateway (Green API)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1c1c22' }}>
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>Daily Sent Quota</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: waUsage.count >= 90 ? '#ef4444' : '#10b981' }}>
                {waUsage.count} / 100
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1c1c22' }}>
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>Date (UTC)</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{waUsage.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>Instance Tier</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6' }}>Developer (Free)</span>
            </div>
          </div>
        </div>

        {/* MacroDroid Health Card */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#9ca3af', marginTop: 0, marginBottom: '16px' }}>WhatsApp Channel Heartcheck</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1c1c22' }}>
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>Last Phone Ping</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{hbTime}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1c1c22' }}>
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>Direct Signal Status</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: hbTime !== 'N/A' ? '#10b981' : '#ef4444' }}>
                {hbTime !== 'N/A' ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>Target Channel JID</span>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#3b82f6' }}>120363428607609767@newsletter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cron Job Logs Table */}
      <div style={tableContainerStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 16px 0' }}>Recent Executed Cron Logs</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Job Name</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Items</th>
                <th style={thStyle}>Started At</th>
                <th style={thStyle}>Logs / Errors</th>
              </tr>
            </thead>
            <tbody>
              {logsData && logsData.length > 0 ? (
                logsData.map((log) => {
                  const startedTime = new Date(log.started_at).toLocaleString('en-IN');
                  const durationSec = (log.duration_ms / 1000).toFixed(2);
                  const isSuccess = log.status === 'success';
                  
                  return (
                    <tr key={log.id}>
                      <td style={{ ...tdStyle, fontWeight: '700' }}>{log.job_name}</td>
                      <td style={tdStyle}>
                        <span style={{
                          backgroundColor: isSuccess ? '#132d21' : (log.status === 'warning' ? '#3d2e15' : '#3f1a1a'),
                          color: isSuccess ? '#52c41a' : (log.status === 'warning' ? '#f59e0b' : '#f5222d'),
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={tdStyle}>{durationSec}s</td>
                      <td style={tdStyle}>{log.items_processed || 0}</td>
                      <td style={tdStyle}>{startedTime}</td>
                      <td style={{ ...tdStyle, fontSize: '12px', fontFamily: 'monospace', color: isSuccess ? '#9ca3af' : '#fca5a5', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.error_message}>
                        {log.error_message || 'OK'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af' }}>No logs recorded in database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
