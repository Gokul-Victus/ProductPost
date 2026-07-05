import { ListOrdered, LayoutDashboard, Send, Settings, Terminal } from 'lucide-react';
import './globals.css';

export const metadata = {
  title: 'Affiliate Automation Platform - Dashboard',
  description: 'Manage automated product sourcing, queueing, and cross-channel publishing.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="dashboard-layout">
          {/* Sidebar Navigation */}
          <aside className="sidebar">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #7f00ff, #e100ff)',
                  boxShadow: '0 0 10px rgba(127, 0, 255, 0.5)'
                }} />
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '18px', tracking: '-0.03em' }}>
                  AFFILIATE<span style={{ color: '#00f0ff' }}>.IO</span>
                </span>
              </div>

              <nav className="nav-links">
                <a href="/" className="nav-item">
                  <LayoutDashboard size={20} />
                  <span>Dashboard</span>
                </a>
                <a href="/manual-post" className="nav-item">
                  <Send size={20} />
                  <span>Manual Post</span>
                </a>
                <a href="/settings" className="nav-item">
                  <Settings size={20} />
                  <span>Settings</span>
                </a>
              </nav>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39ff14', boxShadow: '0 0 6px #39ff14' }} />
                System Engine Active
              </div>
            </div>
          </aside>

          {/* Main Dashboard Panel */}
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
