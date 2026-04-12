/**
 * Batch 16.1 — SuperAdmin Page (Enhanced)
 * - Workspace details + member list + usage stats
 * - Delete workspace members
 * - Activation requests management
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin.js';
import { db } from '@/config/firebase.js';

const PLAN_OPTIONS = [
  { value: 'free',  label: '🆓 مجاني',  color: '#64748b' },
  { value: 'pro',   label: '⭐ Pro',    color: '#f59e0b' },
  { value: 'team',  label: '👥 Team',   color: '#8b5cf6' },
];

const PLAN_LIMITS = {
  free:  { maxCases: 100,  label: '100 قضية' },
  pro:   { maxCases: -1,   label: 'غير محدود' },
  team:  { maxCases: -1,   label: 'غير محدود' },
};

export default function SuperAdmin() {
  const { isSuperAdmin } = useSuperAdmin();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [requests, setRequests] = useState([]);
  const [usageMap, setUsageMap] = useState({});
  const [membersMap, setMembersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [activeTab, setActiveTab] = useState('workspaces');
  const [expandedWs, setExpandedWs] = useState(null);

  useEffect(() => {
    if (!isSuperAdmin) { navigate('/'); return; }
    loadData();
  }, [isSuperAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wsSnap, reqSnap] = await Promise.all([
        db.collection('workspaces').get(),
        db.collection('activationRequests').orderBy('createdAt', 'desc').limit(100).get(),
      ]);

      const ws = wsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWorkspaces(ws);
      setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load usage (case counts) for each workspace
      const usage = {};
      await Promise.all(ws.map(async (w) => {
        try {
          const casesSnap = await db.collection('workspaces').doc(w.id)
            .collection('cases').get();
          usage[w.id] = { cases: casesSnap.size };
        } catch { usage[w.id] = { cases: 0 }; }
      }));
      setUsageMap(usage);

    } catch (err) {
      console.error('SuperAdmin loadData:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (workspaceId) => {
    try {
      const snap = await db.collection('workspaces').doc(workspaceId)
        .collection('members').get();
      const members = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Enrich with user emails from users collection
      const enriched = await Promise.all(members.map(async (m) => {
        try {
          const userDoc = await db.collection('users').doc(m.userId || m.id).get();
          return { ...m, email: userDoc.data()?.email || '', displayName: userDoc.data()?.displayName || '' };
        } catch { return m; }
      }));
      setMembersMap(prev => ({ ...prev, [workspaceId]: enriched }));
    } catch (err) {
      console.error('loadMembers:', err);
    }
  };

  const toggleExpand = async (wsId) => {
    if (expandedWs === wsId) { setExpandedWs(null); return; }
    setExpandedWs(wsId);
    if (!membersMap[wsId]) await loadMembers(wsId);
  };

  const updatePlan = async (workspaceId, plan, expiresAt) => {
    setSaving(workspaceId);
    try {
      await db.collection('workspaces').doc(workspaceId).set(
        { plan, subscriptionExpiresAt: expiresAt || null }, { merge: true }
      );
      setWorkspaces(prev => prev.map(w =>
        w.id === workspaceId ? { ...w, plan, subscriptionExpiresAt: expiresAt || null } : w
      ));
    } finally { setSaving(''); }
  };

  const deleteMember = async (workspaceId, memberId) => {
    if (!window.confirm('حذف هذا العضو من مساحة العمل؟')) return;
    try {
      await db.collection('workspaces').doc(workspaceId)
        .collection('members').doc(memberId).delete();
      setMembersMap(prev => ({
        ...prev,
        [workspaceId]: (prev[workspaceId] || []).filter(m => m.id !== memberId),
      }));
    } catch (err) { alert('خطأ في الحذف'); }
  };

  const approveRequest = async (req) => {
    setSaving(req.id);
    try {
      await updatePlan(req.workspaceId, 'pro', null);
      await db.collection('activationRequests').doc(req.id).set(
        { status: 'approved', approvedAt: new Date().toISOString() }, { merge: true }
      );
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
    } finally { setSaving(''); }
  };

  const rejectRequest = async (req) => {
    setSaving(req.id);
    try {
      await db.collection('activationRequests').doc(req.id).set(
        { status: 'rejected', rejectedAt: new Date().toISOString() }, { merge: true }
      );
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
    } finally { setSaving(''); }
  };

  if (!isSuperAdmin) return null;

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo', padding: 24, maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>👑 لوحة الأدمن</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {workspaces.length} مساحة عمل · {pendingCount} طلب معلق
          </p>
        </div>
        <button onClick={loadData} className="btn-secondary" style={{ fontSize: 13 }}>🔄 تحديث</button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'إجمالي المساحات', value: workspaces.length, color: '#3b82f6', icon: '🏢' },
          { label: 'Pro/Team', value: workspaces.filter(w => w.plan === 'pro' || w.plan === 'team').length, color: '#f59e0b', icon: '⭐' },
          { label: 'مجاني', value: workspaces.filter(w => !w.plan || w.plan === 'free').length, color: '#64748b', icon: '🆓' },
          { label: 'طلبات معلقة', value: pendingCount, color: '#dc2626', icon: '📬' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '14px 16px', borderRadius: 12, background: 'white',
            border: `1px solid ${stat.color}30`, textAlign: 'center',
          }}>
            <div style={{ fontSize: 24 }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'workspaces', label: `🏢 مساحات العمل (${workspaces.length})` },
          { id: 'requests', label: `📬 الطلبات (${pendingCount} معلق)` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: 13 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <div style={{ fontSize: 32 }}>⟳</div>
          <div style={{ marginTop: 8 }}>جاري تحميل البيانات...</div>
        </div>
      ) : activeTab === 'workspaces' ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {workspaces.sort((a, b) => {
            const order = { team: 0, pro: 1, free: 2 };
            return (order[a.plan] ?? 2) - (order[b.plan] ?? 2);
          }).map(ws => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              usage={usageMap[ws.id] || {}}
              members={membersMap[ws.id]}
              expanded={expandedWs === ws.id}
              saving={saving === ws.id}
              onToggle={() => toggleExpand(ws.id)}
              onSave={updatePlan}
              onDeleteMember={deleteMember}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <div style={{ fontSize: 32 }}>📬</div>
              <div style={{ marginTop: 8 }}>لا توجد طلبات</div>
            </div>
          ) : requests.map(req => (
            <RequestRow
              key={req.id}
              request={req}
              saving={saving === req.id}
              onApprove={approveRequest}
              onReject={rejectRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceCard({ workspace, usage, members, expanded, saving, onToggle, onSave, onDeleteMember }) {
  const [plan, setPlan] = useState(workspace.plan || 'free');
  const [expiresAt, setExpiresAt] = useState(
    workspace.subscriptionExpiresAt ? workspace.subscriptionExpiresAt.substring(0, 10) : ''
  );
  const planConfig = PLAN_OPTIONS.find(p => p.value === plan) || PLAN_OPTIONS[0];
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const caseCount = usage.cases || 0;
  const usagePct = limit.maxCases === -1 ? 0 : Math.min(100, Math.round((caseCount / limit.maxCases) * 100));

  return (
    <div style={{
      borderRadius: 12, background: 'white',
      border: `1px solid ${expanded ? planConfig.color + '60' : '#e2e8f0'}`,
      overflow: 'hidden', transition: 'all 0.2s',
    }}>
      {/* Main row */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>

        {/* Expand toggle */}
        <button onClick={onToggle} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 16, color: '#64748b', padding: '2px 6px',
        }}>
          {expanded ? '▼' : '▶'}
        </button>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{workspace.name || 'بدون اسم'}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{workspace.id}</div>
        </div>

        {/* Usage bar */}
        <div style={{ minWidth: 140 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 3 }}>
            <span>📁 {caseCount} قضية</span>
            <span>{limit.maxCases === -1 ? '∞' : `/ ${limit.maxCases}`}</span>
          </div>
          {limit.maxCases !== -1 && (
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: usagePct > 80 ? '#dc2626' : usagePct > 60 ? '#f59e0b' : '#10b981',
                width: `${usagePct}%`, transition: 'width 0.3s',
              }} />
            </div>
          )}
        </div>

        {/* Plan badge */}
        <span style={{
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: `${planConfig.color}20`, color: planConfig.color,
        }}>
          {planConfig.label}
        </span>

        {/* Plan selector */}
        <select value={plan} onChange={e => setPlan(e.target.value)}
          className="form-input" style={{ width: 110, fontSize: 12 }}>
          {PLAN_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {/* Expiry */}
        <input type="date" value={expiresAt}
          onChange={e => setExpiresAt(e.target.value)}
          className="form-input" style={{ width: 150, fontSize: 12 }}
        />

        {/* Save */}
        <button onClick={() => onSave(workspace.id, plan, expiresAt ? new Date(expiresAt).toISOString() : null)}
          disabled={saving} className="btn-primary" style={{ fontSize: 12, minWidth: 70 }}>
          {saving ? '...' : '💾 حفظ'}
        </button>
      </div>

      {/* Expanded: members */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 18px', background: '#fafafa' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#475569' }}>
            👥 الأعضاء {members ? `(${members.length})` : ''}
          </div>
          {!members ? (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>⟳ جاري التحميل...</div>
          ) : members.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>لا يوجد أعضاء</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {members.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px', borderRadius: 8,
                  background: 'white', border: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#3b82f620', color: '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                  }}>
                    {(m.displayName || m.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {m.displayName || 'بدون اسم'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {m.email || m.userId || m.id}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 10px', borderRadius: 20, fontSize: 11,
                    background: m.role === 'admin' ? '#fef3c7' : '#f1f5f9',
                    color: m.role === 'admin' ? '#d97706' : '#64748b',
                    fontWeight: 600,
                  }}>
                    {m.role || 'عضو'}
                  </span>
                  <button
                    onClick={() => onDeleteMember(workspace.id, m.id)}
                    style={{
                      background: '#fee2e2', border: 'none', borderRadius: 6,
                      color: '#dc2626', cursor: 'pointer', fontSize: 11,
                      padding: '4px 10px', fontFamily: 'Cairo',
                    }}
                  >
                    🗑 حذف
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RequestRow({ request, saving, onApprove, onReject }) {
  const statusConfig = {
    pending:  { bg: '#fef3c7', color: '#d97706', label: '⏳ منتظر' },
    approved: { bg: '#dcfce7', color: '#16a34a', label: '✅ موافق' },
    rejected: { bg: '#fee2e2', color: '#dc2626', label: '❌ مرفوض' },
  };
  const status = statusConfig[request.status] || statusConfig.pending;

  return (
    <div style={{
      padding: '14px 18px', borderRadius: 12,
      background: 'white', border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{request.userName || 'مستخدم'}</span>
            <span style={{
              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: status.bg, color: status.color,
            }}>{status.label}</span>
          </div>
          <div style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {request.phone && <span>📞 {request.phone}</span>}
            {request.email && <span>✉️ {request.email}</span>}
            {request.workspaceName && <span>🏢 {request.workspaceName}</span>}
            {request.message && (
              <span style={{ color: '#64748b' }}>💬 {request.message}</span>
            )}
            {request.createdAt && (
              <span>🕐 {new Date(request.createdAt).toLocaleDateString('ar-EG', {
                year: 'numeric', month: 'short', day: 'numeric'
              })}</span>
            )}
          </div>
        </div>
        {request.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => onApprove(request)} disabled={saving}
              className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>
              {saving ? '...' : '✅ موافقة Pro'}
            </button>
            <button onClick={() => onReject(request)} disabled={saving}
              style={{
                background: '#fee2e2', border: 'none', borderRadius: 8,
                color: '#dc2626', cursor: 'pointer', fontSize: 12,
                padding: '6px 14px', fontFamily: 'Cairo',
              }}>
              ❌ رفض
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
