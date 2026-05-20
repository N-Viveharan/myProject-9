import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Zap, ClipboardList, CheckCircle, ChefHat, Bike, PartyPopper, XCircle, RefreshCw, ArrowLeft, Download, AlertTriangle, X
} from 'lucide-react';
import OrderTable from '../../components/OrderTable/OrderTable.jsx';
import './Manageorders.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

/* ── Status tabs ─────────────────────────────────────────────── */
const STATUS_TABS = [
  { value: 'all', label: 'All Orders', icon: <Package size={16} /> },
  { value: 'active', label: 'Active', icon: <Zap size={16} />, pulse: true },
  { value: 'Placed', label: 'Placed', icon: <ClipboardList size={16} /> },
  { value: 'Confirmed', label: 'Confirmed', icon: <CheckCircle size={16} /> },
  { value: 'Preparing', label: 'Preparing', icon: <ChefHat size={16} /> },
  { value: 'Out for Delivery', label: 'Out for Delivery', icon: <Bike size={16} /> },
  { value: 'Delivered', label: 'Delivered', icon: <PartyPopper size={16} /> },
  { value: 'Cancelled', label: 'Cancelled', icon: <XCircle size={16} /> },
];

/* ── Status update confirm modal ─────────────────────────────── */
function StatusConfirmModal({ orderId, newStatus, onConfirm, onClose, loading }) {
  const STATUS_ICONS = {
    'Confirmed': <CheckCircle size={24} />,
    'Preparing': <ChefHat size={24} />,
    'Out for Delivery': <Bike size={24} />,
    'Delivered': <PartyPopper size={24} />,
    'Cancelled': <XCircle size={24} />,
  };

  return (
    <div
      className="mo-status-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm status change"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="mo-status-modal">
        <span className="mo-status-modal__icon" aria-hidden="true">
          {STATUS_ICONS[newStatus] || <RefreshCw size={24} />}
        </span>
        <h2 className="mo-status-modal__title">Update order status?</h2>
        <p className="mo-status-modal__desc">
          Order <strong>#{orderId?.slice(-8).toUpperCase()}</strong> will be
          marked as <strong>{newStatus}</strong>.
          {newStatus === 'Delivered' && ' Payment will be marked as Paid.'}
          {newStatus === 'Cancelled' && ' Stock will be restored.'}
        </p>
        <div className="mo-status-modal__actions">
          <button
            className="mo-status-modal__btn mo-status-modal__btn--cancel"
            onClick={onClose}
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button
            className="mo-status-modal__btn mo-status-modal__btn--confirm"
            onClick={onConfirm}
            disabled={loading}
            type="button"
            aria-busy={loading}
          >
            {loading ? 'Updating…' : `Confirm: ${newStatus}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MANAGE ORDERS PAGE
   ════════════════════════════════════════════════════════════ */

/**
 * ManageOrders
 *
 * Props:
 *   token  {string}  — admin JWT
 *   user   {object}  — admin user
 */
export default function ManageOrders({ token, user }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all');
  const [tabCounts, setTabCounts] = useState({});
  const [tableKey, setTableKey] = useState(0);
  const [alert, setAlert] = useState({ text: '', type: '' });

  /* Status update confirm state */
  const [pendingStatus, setPendingStatus] = useState(null); // { orderId, newStatus }
  const [updating, setUpdating] = useState(false);

  const alertTimer = useRef(null);

  /* ── Dismiss alert after 4s ──────────────────────────────── */
  useEffect(() => {
    if (!alert.text) return;
    clearTimeout(alertTimer.current);
    alertTimer.current = setTimeout(() => setAlert({ text: '', type: '' }), 4000);
    return () => clearTimeout(alertTimer.current);
  }, [alert]);

  /* ── Fetch tab counts ────────────────────────────────────── */
  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/orders?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return;

      const orders = data.orders || [];
      const counts = { all: orders.length };
      const active = ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery'];

      counts.active = orders.filter((o) => active.includes(o.status)).length;
      STATUS_TABS.slice(2).forEach(({ value }) => {
        counts[value] = orders.filter((o) => o.status === value).length;
      });

      setTabCounts(counts);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  /* ── Handle status update (intercepted from OrderTable) ──── */
  const handleStatusUpdateRequest = (orderId, newStatus) => {
    setPendingStatus({ orderId, newStatus });
  };

  const handleStatusConfirm = async () => {
    if (!pendingStatus) return;
    const { orderId, newStatus } = pendingStatus;
    setUpdating(true);
    try {
      const res = await fetch(`${API}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setAlert({ text: `Order #${orderId?.slice(-8).toUpperCase()} → ${newStatus}`, type: 'success' });
      setPendingStatus(null);
      setTableKey((k) => k + 1);
      fetchCounts();
    } catch (err) {
      setAlert({ text: err.message || 'Status update failed.', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  /* ── Export all orders CSV ───────────────────────────────── */
  const handleExportAll = async () => {
    try {
      const res = await fetch(`${API}/orders?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const orders = data.orders || [];
      const headers = ['Order ID', 'Customer', 'Email', 'Items', 'Total', 'Status', 'Payment', 'Date'];
      const rows = orders.map((o) => [
        o._id?.slice(-8).toUpperCase(),
        o.user?.name || 'N/A',
        o.user?.email || '',
        o.items?.map((i) => `${i.name}×${i.quantity}`).join(' | '),
        o.totalPrice,
        o.status,
        o.paymentMethod,
        new Date(o.createdAt).toLocaleDateString('en-IN'),
      ]);
      const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `all-orders-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      setAlert({ text: `Exported ${orders.length} orders to CSV`, type: 'success' });
    } catch {
      setAlert({ text: 'Export failed. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="manage-orders">

      {/* ── Page header ─────────────────────────────────── */}
      <header className="manage-orders__header">
        <div className="manage-orders__header-row">
          <div>
            <h1 className="manage-orders__title">
              <span aria-hidden="true"><Package size={32} /></span> Orders
            </h1>
            <p className="manage-orders__subtitle">
              View, filter and update all customer orders in real time
            </p>
          </div>

          <div className="manage-orders__actions">
            <button className="mo-btn" onClick={() => navigate('/admin')} aria-label="Back to dashboard">
              <span aria-hidden="true"><ArrowLeft size={16} /></span> Dashboard
            </button>
            <button className="mo-btn" onClick={handleExportAll} aria-label="Export all orders">
              <span aria-hidden="true"><Download size={16} /></span> Export All
            </button>
            <button className="mo-btn" onClick={() => { setTableKey((k) => k + 1); fetchCounts(); }} aria-label="Refresh orders">
              <span aria-hidden="true"><RefreshCw size={16} /></span> Refresh
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <nav className="manage-orders__tabs" role="tablist" aria-label="Filter orders by status">
          {STATUS_TABS.map((tab) => {
            const count = tabCounts[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                className={`mo-tab${activeTab === tab.value ? ' mo-tab--active' : ''}`}
                onClick={() => { setActiveTab(tab.value); setTableKey((k) => k + 1); }}
                role="tab"
                aria-selected={activeTab === tab.value}
              >
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
                <span className={`mo-tab__badge${tab.pulse && count > 0 ? ' mo-tab__badge--pulse' : ''}`}
                  aria-label={`${count} orders`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── Alert banner ──────────────────────────────────── */}
      {alert.text && (
        <div className={`mo-alert mo-alert--${alert.type}`} role="status" aria-live="polite">
          <span aria-hidden="true">{alert.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}</span>
          {alert.text}
          <button
            className="mo-alert__close"
            onClick={() => setAlert({ text: '', type: '' })}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Order table ───────────────────────────────────── */}
      <div className="manage-orders__body" role="tabpanel">
        <OrderTable
          key={tableKey}
          token={token}
          defaultStatus={activeTab === 'active' ? undefined : activeTab === 'all' ? undefined : activeTab}
          onStatusChangeRequest={handleStatusUpdateRequest}
        />
      </div>



      {/* ── Status confirm modal ───────────────────────────── */}
      {pendingStatus && (
        <StatusConfirmModal
          orderId={pendingStatus.orderId}
          newStatus={pendingStatus.newStatus}
          onConfirm={handleStatusConfirm}
          onClose={() => !updating && setPendingStatus(null)}
          loading={updating}
        />
      )}
    </div>
  );
}