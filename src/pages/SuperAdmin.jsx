import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import storage from '@/data/Storage.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSuperAdmin } from '@/hooks/useSuperAdmin.js';
import ActivationRequestsTab from './SuperAdmin/ActivationRequestsTab.jsx';
import WorkspacesTab from './SuperAdmin/WorkspacesTab.jsx';
import { formatArabicDate, resolveMemberUid } from './SuperAdmin/superAdminUtils.js';

const WORKSPACE_SORT_ORDER = { team: 0, pro: 1, free: 2 };
const buildWorkspaceDrafts = (workspaces) => Object.fromEntries((workspaces || []).map((workspace) => [workspace.id, {
  plan: workspace.plan || 'free',
  expiresAt: workspace.subscriptionExpiresAt ? workspace.subscriptionExpiresAt.substring(0, 10) : '',
}]));

export default function SuperAdmin() {
  const { isSuperAdmin } = useSuperAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = String(user?.uid || '').trim();
  const [workspaces, setWorkspaces] = useState([]), [workspaceDrafts, setWorkspaceDrafts] = useState({}), [requests, setRequests] = useState([]);
  const [usageMap, setUsageMap] = useState({}), [membersMap, setMembersMap] = useState({}), [loading, setLoading] = useState(true);
  const [savingWorkspaceId, setSavingWorkspaceId] = useState(''), [deletingWorkspaceId, setDeletingWorkspaceId] = useState('');
  const [removingMemberKey, setRemovingMemberKey] = useState(''), [processingRequestId, setProcessingRequestId] = useState('');
  const [activeTab, setActiveTab] = useState('workspaces'), [expandedWs, setExpandedWs] = useState(null);

  const loadMembers = useCallback(async (workspaceId) => {
    try {
      const members = await storage.listWorkspaceMembers(workspaceId);
      const enrichedMembers = await Promise.all(members.map(async (member) => {
        const memberUid = resolveMemberUid(member);
        if (!memberUid) return member;
        try {
          const userProfile = await storage.getUserProfile(memberUid);
          return { ...member, uid: memberUid, displayName: member.displayName || userProfile?.displayName || '', email: member.email || userProfile?.email || '' };
        } catch {
          return { ...member, uid: memberUid };
        }
      }));
      setMembersMap((prev) => ({ ...prev, [workspaceId]: enrichedMembers }));
    } catch (error) {
      console.error('loadMembers:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [workspaceList, activationRequests] = await Promise.all([storage.listWorkspaces(), storage.listActivationRequests({ limit: 100 })]);
      const usageEntries = await Promise.all(workspaceList.map(async (workspace) => {
        try { return [workspace.id, { cases: await storage.getWorkspaceCaseCount(workspace.id) }]; }
        catch { return [workspace.id, { cases: 0 }]; }
      }));
      setWorkspaces(workspaceList);
      setWorkspaceDrafts(buildWorkspaceDrafts(workspaceList));
      setRequests(activationRequests);
      setUsageMap(Object.fromEntries(usageEntries));
    } catch (error) {
      console.error('SuperAdmin loadData:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!isSuperAdmin) return void navigate('/'); loadData(); }, [isSuperAdmin, loadData, navigate]);

  const toggleExpand = useCallback(async (workspaceId) => {
    if (expandedWs === workspaceId) return void setExpandedWs(null);
    setExpandedWs(workspaceId);
    if (!membersMap[workspaceId]) await loadMembers(workspaceId);
  }, [expandedWs, loadMembers, membersMap]);

  const updateWorkspaceDraft = useCallback((workspaceId, field, value) => {
    const workspace = workspaces.find((item) => item.id === workspaceId);
    setWorkspaceDrafts((prev) => ({ ...prev, [workspaceId]: {
      plan: prev[workspaceId]?.plan || workspace?.plan || 'free',
      expiresAt: prev[workspaceId]?.expiresAt ?? (workspace?.subscriptionExpiresAt || '').substring(0, 10),
      [field]: value,
    } }));
  }, [workspaces]);

  const updatePlan = useCallback(async (workspaceId, plan, expiresAt) => {
    setSavingWorkspaceId(workspaceId);
    try {
      await storage.updateWorkspacePlan(workspaceId, { plan, subscriptionExpiresAt: expiresAt || null });
      setWorkspaces((prev) => prev.map((workspace) => (workspace.id === workspaceId ? { ...workspace, plan, subscriptionExpiresAt: expiresAt || null } : workspace)));
      setWorkspaceDrafts((prev) => ({ ...prev, [workspaceId]: { plan, expiresAt: expiresAt ? new Date(expiresAt).toISOString().substring(0, 10) : '' } }));
    } finally {
      setSavingWorkspaceId('');
    }
  }, []);

  const deleteWorkspace = useCallback(async (workspace) => {
    const workspaceId = String(workspace?.id || '').trim(), workspaceName = String(workspace?.name || workspaceId || 'مساحة العمل').trim();
    if (!workspaceId) return;
    if (workspaceId === currentUserId) return void window.alert('لا يمكن حذف مساحة العمل الخاصة بالمستخدم الحالي.');
    const caseCount = usageMap[workspaceId]?.cases ?? await storage.getWorkspaceCaseCount(workspaceId);
    if (!window.confirm(`هل أنت متأكد من حذف [${workspaceName}]؟ سيتم حذف كل البيانات نهائياً.`)) return;
    if (caseCount > 0 && !window.confirm(`هذه المساحة تحتوي على ${caseCount} قضية. هل أنت متأكد من المتابعة؟`)) return;
    setDeletingWorkspaceId(workspaceId);
    try {
      await storage.deleteWorkspace(workspaceId);
      setWorkspaces((prev) => prev.filter((item) => item.id !== workspaceId));
      setUsageMap((prev) => { const next = { ...prev }; delete next[workspaceId]; return next; });
      setMembersMap((prev) => { const next = { ...prev }; delete next[workspaceId]; return next; });
      setWorkspaceDrafts((prev) => { const next = { ...prev }; delete next[workspaceId]; return next; });
      if (expandedWs === workspaceId) setExpandedWs(null);
    } catch (error) {
      console.error('deleteWorkspace:', error);
      window.alert('حدث خطأ أثناء حذف مساحة العمل.');
    } finally {
      setDeletingWorkspaceId('');
    }
  }, [currentUserId, expandedWs, usageMap]);

  const deleteMember = useCallback(async (workspaceId, member) => {
    const memberUid = resolveMemberUid(member), memberName = String(member?.displayName || member?.email || memberUid || 'العضو').trim();
    if (!workspaceId || !memberUid || !window.confirm(`إزالة [${memberName}] من المساحة؟`)) return;
    setRemovingMemberKey(`${workspaceId}:${memberUid}`);
    try {
      await storage.deleteWorkspaceMember(workspaceId, memberUid);
      setMembersMap((prev) => ({ ...prev, [workspaceId]: (prev[workspaceId] || []).filter((item) => resolveMemberUid(item) !== memberUid) }));
    } catch (error) {
      console.error('deleteMember:', error);
      window.alert('حدث خطأ أثناء إزالة العضو.');
    } finally {
      setRemovingMemberKey('');
    }
  }, []);

  const approveRequest = useCallback(async (request) => {
    setProcessingRequestId(request.id);
    try {
      const approvedAt = new Date().toISOString();
      await updatePlan(request.workspaceId, 'pro', null);
      await storage.updateActivationRequestStatus(request.id, { status: 'approved', approvedAt });
      setRequests((prev) => prev.map((item) => (item.id === request.id ? { ...item, status: 'approved', approvedAt } : item)));
    } finally {
      setProcessingRequestId('');
    }
  }, [updatePlan]);

  const rejectRequest = useCallback(async (request) => {
    setProcessingRequestId(request.id);
    try {
      const rejectedAt = new Date().toISOString();
      await storage.updateActivationRequestStatus(request.id, { status: 'rejected', rejectedAt });
      setRequests((prev) => prev.map((item) => (item.id === request.id ? { ...item, status: 'rejected', rejectedAt } : item)));
    } finally {
      setProcessingRequestId('');
    }
  }, []);

  if (!isSuperAdmin) return null;
  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  const freeCount = workspaces.filter((workspace) => !workspace.plan || workspace.plan === 'free').length;
  const paidCount = workspaces.filter((workspace) => workspace.plan === 'pro' || workspace.plan === 'team').length;
  const sortedWorkspaces = workspaces.slice().sort((left, right) => (WORKSPACE_SORT_ORDER[left.plan] ?? 2) - (WORKSPACE_SORT_ORDER[right.plan] ?? 2));

  return (
    <div className="super-admin-page" style={{ direction: 'rtl', fontFamily: 'Cairo', padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div><h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>لوحة السوبر أدمن</h1><p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{workspaces.length} مساحة عمل - {pendingCount} طلب تفعيل معلق</p></div>
        <button onClick={loadData} className="btn-secondary" style={{ fontSize: 13 }}>تحديث</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[{ label: 'إجمالي المساحات', value: workspaces.length, color: '#3b82f6' }, { label: 'Pro / Team', value: paidCount, color: '#f59e0b' }, { label: 'مجاني', value: freeCount, color: '#64748b' }, { label: 'طلبات معلقة', value: pendingCount, color: '#dc2626' }].map((stat) => <div key={stat.label} style={{ padding: '14px 16px', borderRadius: 12, background: 'white', border: `1px solid ${stat.color}30`, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{stat.label}</div></div>)}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ id: 'workspaces', label: `مساحات العمل (${workspaces.length})` }, { id: 'requests', label: `طلبات التفعيل (${pendingCount})` }].map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: 13 }}>{tab.label}</button>)}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>جارٍ تحميل البيانات...</div>
          <div style={{ marginTop: 8, fontSize: 12 }}>يتم الآن قراءة المساحات والطلبات من التخزين.</div>
        </div>
      ) : activeTab === 'workspaces' ? (
        <WorkspacesTab
          workspaces={sortedWorkspaces} usageMap={usageMap} membersMap={membersMap} expandedWs={expandedWs} savingWorkspaceId={savingWorkspaceId}
          deletingWorkspaceId={deletingWorkspaceId} removingMemberKey={removingMemberKey} currentUserId={currentUserId} workspaceDrafts={workspaceDrafts}
          onToggleExpand={toggleExpand} onWorkspaceDraftChange={updateWorkspaceDraft} onUpdatePlan={updatePlan} onDeleteWorkspace={deleteWorkspace} onDeleteMember={deleteMember}
        />
      ) : (
        <ActivationRequestsTab requests={requests} processingRequestId={processingRequestId} onApprove={approveRequest} onReject={rejectRequest} formatArabicDate={formatArabicDate} />
      )}
    </div>
  );
}
