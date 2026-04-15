import WorkspaceCard from './WorkspaceCard.jsx';
import {
  PLAN_LIMITS,
  PLAN_OPTIONS,
  formatArabicDate,
  resolveMemberUid,
} from './superAdminUtils.js';

export default function WorkspacesTab({
  workspaces,
  usageMap,
  membersMap,
  expandedWs,
  savingWorkspaceId,
  deletingWorkspaceId,
  removingMemberKey,
  currentUserId,
  workspaceDrafts,
  onToggleExpand,
  onWorkspaceDraftChange,
  onUpdatePlan,
  onDeleteWorkspace,
  onDeleteMember,
}) {
  if (!workspaces.length) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: '#64748b', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>لا توجد مساحات عمل</div>
        <div style={{ marginTop: 8, fontSize: 12 }}>بمجرد إنشاء مساحات جديدة ستظهر هنا.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {workspaces.map((workspace) => {
        const draft = workspaceDrafts[workspace.id] || {
          plan: workspace.plan || 'free',
          expiresAt: workspace.subscriptionExpiresAt ? workspace.subscriptionExpiresAt.substring(0, 10) : '',
        };
        return (
          <WorkspaceCard
            key={workspace.id}
            workspace={workspace}
            usage={usageMap[workspace.id] || {}}
            members={membersMap[workspace.id]}
            isExpanded={expandedWs === workspace.id}
            isSaving={savingWorkspaceId === workspace.id}
            isDeleting={deletingWorkspaceId === workspace.id}
            removingMemberKey={removingMemberKey}
            currentUserId={currentUserId}
            planValue={draft.plan}
            expiresAtValue={draft.expiresAt}
            onToggleExpand={() => onToggleExpand(workspace.id)}
            onPlanChange={(value) => onWorkspaceDraftChange(workspace.id, 'plan', value)}
            onExpiresAtChange={(value) => onWorkspaceDraftChange(workspace.id, 'expiresAt', value)}
            onUpdatePlan={onUpdatePlan}
            onDeleteWorkspace={onDeleteWorkspace}
            onDeleteMember={onDeleteMember}
            PLAN_OPTIONS={PLAN_OPTIONS}
            PLAN_LIMITS={PLAN_LIMITS}
            formatArabicDate={formatArabicDate}
            resolveMemberUid={resolveMemberUid}
          />
        );
      })}
    </div>
  );
}
