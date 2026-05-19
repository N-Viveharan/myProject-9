import { useState, useEffect, useContext } from 'react';
import { AdminAuthContext } from '../../context/Adminauthcontext.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Analytics.css';

const API = 'http://localhost:5001/api';

export default function Analytics() {
  const { token } = useContext(AdminAuthContext);
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
    usersCount: 0,
    topProducts: [],
    recentUsers: [],
    revenueData: []
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch Dashboard Stats (Revenue, Orders)
        const statsRes = await fetch(`${API}/orders/dashboard`, { headers });
        const statsData = await statsRes.json();
        
        // Fetch All Orders to aggregate top products and revenue by category
        const ordersRes = await fetch(`${API}/orders?limit=1000`, { headers });
        const ordersData = await ordersRes.json();
        
        // Fetch Users (Recent signups & total)
        const usersRes = await fetch(`${API}/users?limit=6&sort=createdAt_desc`, { headers });
        const usersData = await usersRes.json();
        
        // Process Orders for Analytics
        const orders = ordersData.orders || [];
        
        // 1. Top Products
        const productMap = {};
        orders.forEach(o => {
          if (o.status !== 'Cancelled') {
            o.items?.forEach(item => {
              const pId = item.product || item.name;
              if (!productMap[pId]) {
                productMap[pId] = { name: item.name, qty: 0, rev: 0 };
              }
              productMap[pId].qty += item.quantity;
              productMap[pId].rev += (item.price * item.quantity);
            });
          }
        });
        
        const topProducts = Object.values(productMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 6);

        // Max qty for chart scaling
        const maxQty = topProducts.length ? Math.max(...topProducts.map(p => p.qty)) : 1;

        const processedStats = statsData.stats || statsData;
        
        // 2. Revenue over time (Last 7 Days) from MongoDB Backend
        const revenueData = processedStats.recentOrders || [];

        setData({
          stats: {
            totalRevenue: processedStats.totalRevenue || 0,
            totalOrders: processedStats.totalOrders || 0,
            avgOrderValue: processedStats.totalOrders > 0 
              ? (processedStats.totalRevenue / processedStats.totalOrders) 
              : 0
          },
          usersCount: usersData.total || 0,
          recentUsers: usersData.users || [],
          topProducts: topProducts.map(p => ({ ...p, pct: (p.qty / maxQty) * 100 })),
          revenueData
        });

      } catch (err) {
        console.error('Analytics Error:', err);
      } finally {
        setLoading(false);
      }
    }
    
    if (token) fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="an-loader">
          <div className="an-spinner" />
          <p>Compiling insights…</p>
        </div>
      </div>
    );
  }

  const { stats, usersCount, topProducts, recentUsers, revenueData } = data;

  return (
    <div className="analytics-page">
      <header className="an-header">
        <h1 className="an-header__title">Client Analytics</h1>
        <p className="an-header__sub">Insights and metrics on customer behavior and sales performance.</p>
      </header>

      <div className="an-body">
        
        {/* KPI Grid */}
        <div className="an-stats-grid">
          <div className="an-stat-card">
            <div className="an-stat-header">
              <span className="an-stat-title">Gross Revenue</span>
              <div className="an-stat-icon an-stat-icon--rev" aria-hidden="true">💰</div>
            </div>
            <p className="an-stat-val">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>
          
          <div className="an-stat-card">
            <div className="an-stat-header">
              <span className="an-stat-title">Total Orders</span>
              <div className="an-stat-icon an-stat-icon--orders" aria-hidden="true">📦</div>
            </div>
            <p className="an-stat-val">{stats.totalOrders.toLocaleString()}</p>
          </div>
          
          <div className="an-stat-card">
            <div className="an-stat-header">
              <span className="an-stat-title">Customer Base</span>
              <div className="an-stat-icon an-stat-icon--users" aria-hidden="true">👥</div>
            </div>
            <p className="an-stat-val">{usersCount.toLocaleString()}</p>
          </div>
          
          <div className="an-stat-card">
            <div className="an-stat-header">
              <span className="an-stat-title">Avg. Order Value</span>
              <div className="an-stat-icon an-stat-icon--avg" aria-hidden="true">📈</div>
            </div>
            <p className="an-stat-val">₹{Math.round(stats.avgOrderValue).toLocaleString()}</p>
          </div>
        </div>

        <div className="an-main-grid">
          
          {/* Revenue Graph */}
          <div className="an-panel an-panel--full">
            <h2 className="an-panel__title"><span aria-hidden="true">📈</span> Revenue Trend (Last 7 Days)</h2>
            <div style={{ height: 320, width: '100%', marginTop: '1.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f5a623" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#f5a623" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#6e6459" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#6e6459" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1814', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0ebe3', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
                    itemStyle={{ color: '#f5a623', fontWeight: 600 }}
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f5a623" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products Chart */}
          <div className="an-panel">
            <h2 className="an-panel__title"><span aria-hidden="true">🔥</span> Top Selling Products</h2>
            <div className="an-chart">
              {topProducts.length === 0 ? (
                <p style={{ color: 'var(--an-text-muted)' }}>No sales data available.</p>
              ) : (
                topProducts.map((p, i) => (
                  <div key={i} className="an-chart-bar">
                    <div className="an-chart-label" title={p.name}>{p.name}</div>
                    <div className="an-chart-track">
                      <div className="an-chart-fill" style={{ width: `${Math.max(p.pct, 2)}%` }} />
                    </div>
                    <div className="an-chart-val">{p.qty}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Customers */}
          <div className="an-panel">
            <h2 className="an-panel__title"><span aria-hidden="true">🌟</span> New Customers</h2>
            <div className="an-list">
              {recentUsers.length === 0 ? (
                <p style={{ color: 'var(--an-text-muted)' }}>No customers found.</p>
              ) : (
                recentUsers.map((u, i) => (
                  <div key={u._id} className="an-list-item">
                    <div className="an-list-idx">{i + 1}</div>
                    <div className="an-list-info">
                      <p className="an-list-name">{u.name}</p>
                      <p className="an-list-sub">{u.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
