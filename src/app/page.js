import { supabase } from '@/database/supabase.js';
import TriggerButtons from '@/components/TriggerButtons';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  noStore();
  let stats = {
    totalDeals: 0,
    pendingQueue: 0,
    clicksToday: 0,
    estCommission: 0.00
  };
  
  let jobLogs = [];
  let postedDeals = [];
  let clickLogs = [];
  let isDbConnected = false;
  let connectionError = '';

  try {
    // Basic connection test
    const { count, error: connError } = await supabase
      .from('settings')
      .select('*', { count: 'exact', head: true });

    if (!connError) {
      isDbConnected = true;

      // 1. Fetch counts
      const { count: totalDealsCount } = await supabase
        .from('publisher_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: pendingQueueCount } = await supabase
        .from('publisher_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Clicks today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: clicksTodayCount } = await supabase
        .from('clicks_analytics')
        .select('*', { count: 'exact', head: true })
        .gte('clicked_at', todayStart.toISOString());

      // Est. commission sum
      const { data: commissionRows } = await supabase
        .from('clicks_analytics')
        .select('estimated_commission');

      const sumCommission = commissionRows
        ? commissionRows.reduce((acc, row) => acc + (parseFloat(row.estimated_commission) || 0), 0)
        : 0;

      stats.totalDeals = totalDealsCount || 0;
      stats.pendingQueue = pendingQueueCount || 0;
      stats.clicksToday = clicksTodayCount || 0;
      stats.estCommission = sumCommission;

      // 2. Fetch Job Logs
      const { data: logsData } = await supabase
        .from('job_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);

      jobLogs = logsData || [];

      // 3. Fetch Recent Posted Deals
      const { data: dealsData } = await supabase
        .from('publisher_queue')
        .select(`
          id,
          processed_at,
          channel,
          error_log,
          products (
            title,
            store,
            raw_url,
            rating
          )
        `)
        .eq('status', 'completed')
        .order('processed_at', { ascending: false })
        .limit(5);

      postedDeals = (dealsData || []).map(deal => ({
        id: deal.id,
        posted_at: deal.processed_at,
        channel: deal.channel,
        external_message_id: deal.error_log && deal.error_log.startsWith('Msg ID:')
          ? deal.error_log.replace('Msg ID: ', '')
          : deal.id.substring(0, 8),
        products: deal.products
      }));

      // 4. Fetch Recent Clicks
      const { data: clicksData } = await supabase
        .from('clicks_analytics')
        .select('*')
        .order('clicked_at', { ascending: false })
        .limit(5);

      clickLogs = clicksData || [];
    } else {
      connectionError = connError.message;
    }
  } catch (err) {
    connectionError = err.message;
  }

  // Setup fallbacks if database is not configured
  if (!isDbConnected) {
    stats = {
      totalDeals: 3,
      pendingQueue: 0,
      clicksToday: 18,
      estCommission: 124.50
    };
    jobLogs = [
      { id: '1', job_name: 'fetcher_cron', status: 'success', duration_ms: 180, items_processed: 3, completed_at: new Date(Date.now() - 600000).toISOString() },
      { id: '2', job_name: 'queue_worker', status: 'success', duration_ms: 320, items_processed: 1, completed_at: new Date(Date.now() - 300000).toISOString() }
    ];
    postedDeals = [
      {
        id: '1',
        posted_at: new Date(Date.now() - 300000).toISOString(),
        channel: 'telegram',
        external_message_id: '12',
        products: {
          title: 'Apple iPhone 15 (128 GB) - Black',
          store: 'Amazon',
          raw_url: 'https://www.amazon.in/dp/B0CHX5R4T6',
          rating: 4.6
        }
      }
    ];
    clickLogs = [
      { id: '1', slug: 'xyZ789', store: 'Amazon', channel: 'telegram', clicked_at: new Date(Date.now() - 120000).toISOString(), estimated_commission: 45.20 },
      { id: '2', slug: 'abC123', store: 'Amazon', channel: 'telegram', clicked_at: new Date(Date.now() - 240000).toISOString(), estimated_commission: 0.00 }
    ];
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Platform Control Center
          </span>
          <h1 className="glow-text" style={{ fontSize: '32px', marginTop: '4px' }}>Dashboard Overview</h1>
        </div>

        {/* Database connection badge */}
        <div>
          {isDbConnected ? (
            <span className="badge badge-completed" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Database Online
            </span>
          ) : (
            <span className="badge badge-failed" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'help' }} title={`Database offline: ${connectionError}`}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
              Database Demo Mode
            </span>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <span className="stat-label">Active Queue Jobs</span>
          <span className="stat-value" style={{ color: stats.pendingQueue > 0 ? 'var(--accent-cyan)' : 'inherit' }}>
            {stats.pendingQueue}
          </span>
          <span className="stat-trend trend-up">Pending publication</span>
        </div>

        <div className="glass-panel stat-card">
          <span className="stat-label">Total Deals Published</span>
          <span className="stat-value">{stats.totalDeals}</span>
          <span className="stat-trend trend-up">Across all channels</span>
        </div>

        <div className="glass-panel stat-card">
          <span className="stat-label">Total Clicks Today</span>
          <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{stats.clicksToday}</span>
          <span className="stat-trend trend-up">Through tracking slugs</span>
        </div>

        <div className="glass-panel stat-card">
          <span className="stat-label">Est. Revenue (INR)</span>
          <span className="stat-value" style={{ color: '#34d399' }}>
            ₹{stats.estCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="stat-trend trend-up">Click convert estimates</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', marginBottom: '30px' }}>
        {/* Left column: Quick Actions and Job Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div className="glass-panel">
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Manual Automation Triggers</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Simulate scheduled cron events by manually firing the scraper fetch or the worker queue execution immediately.
            </p>
            <TriggerButtons />
          </div>

          <div className="glass-panel">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>System Logs</h3>
            <div className="data-table-container" style={{ marginTop: '0px' }}>
              {jobLogs.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Job Name</th>
                      <th>Status</th>
                      <th>Processed</th>
                      <th>Duration</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 600 }}>{log.job_name}</td>
                        <td>
                          <span className={`badge badge-${log.status}`}>
                            {log.status}
                          </span>
                        </td>
                        <td>{log.items_processed || 0} items</td>
                        <td>{log.duration_ms}ms</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {new Date(log.completed_at || log.started_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No system logs recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Recent Published Deals */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Recent Published Deals</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {postedDeals.length > 0 ? (
              postedDeals.map((deal) => (
                <div key={deal.id} style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '75%' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {deal.products?.store || 'Store'} • {deal.channel}
                    </span>
                    <a 
                      href={deal.products?.raw_url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {deal.products?.title || 'Unknown Title'}
                    </a>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Rating: {deal.products?.rating || '4.0'} ★
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>ID: {deal.external_message_id}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {new Date(deal.posted_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                No deals published yet. Trigger a fetch and worker run to see deals here!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clicks analytics section */}
      <div className="glass-panel" style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Recent Click Redirect Activity</h3>
        <div className="data-table-container" style={{ marginTop: '0px' }}>
          {clickLogs.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Slug ID</th>
                  <th>Store</th>
                  <th>Channel</th>
                  <th>Est. Commission</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {clickLogs.map((click) => (
                  <tr key={click.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>/go/{click.slug}</td>
                    <td>{click.store}</td>
                    <td style={{ textTransform: 'capitalize' }}>{click.channel}</td>
                    <td style={{ color: click.estimated_commission > 0 ? '#34d399' : 'inherit', fontWeight: click.estimated_commission > 0 ? 600 : 'normal' }}>
                      ₹{parseFloat(click.estimated_commission || 0).toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {new Date(click.clicked_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No click tracking logs registered yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
