export default function WorkspaceCard({
  workspace,
  usage,
  members,
  isExpanded,
  isSaving,
  isDeleting,
  removingMemberKey,
  currentUserId,
  onToggleExpand,
  onUpdatePlan,
  onDeleteWorkspace,
  onDeleteMember,
  PLAN_OPTIONS,
  PLAN_LIMITS,
  formatArabicDate,
  resolveMemberUid,
  planValue,
  expiresAtValue,
  onPlanChange,
  onExpiresAtChange,
}) {
  const planConfig = PLAN_OPTIONS.find((item) => item.value === planValue) || PLAN_OPTIONS[0];
  const limit = PLAN_LIMITS[planValue] || PLAN_LIMITS.free;
  const caseCount = usage.cases || 0;
  const usagePct = limit.maxCases === -1 ? 0 : Math.min(100, Math.round((caseCount / limit.maxCases) * 100));
  const isCurrentUserWorkspace = workspace.id === currentUserId;

  return (
    <div style={{ borderRadius: 12, background: 'white', border: `1px solid ${isExpanded ? `${planConfig.color}60` : '#e2e8f0'}`, overflow: 'hidden', transition: 'all 0.2s' }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button onClick={onToggleExpand} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b', padding: '2px 6px' }}>
          {isExpanded ? '▼' : '▶'}
        </button>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{workspace.name || 'بدون اسم'}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ID: {workspace.id}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>المالك: {workspace.ownerId || '-'}</div>
        </div>

        <div style={{ minWidth: 150 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 3 }}>
            <span>{caseCount} قضية</span>
            <span>{limit.maxCases === -1 ? limit.label : `/ ${limit.maxCases}`}</span>
          </div>
          {limit.maxCases !== -1 && (
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: usagePct > 80 ? '#dc2626' : usagePct > 60 ? '#f59e0b' : '#10b981', width: `${usagePct}%`, transition: 'width 0.3s' }} />
            </div>
          )}
        </div>

        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${planConfig.color}20`, color: planConfig.color }}>
          {planConfig.label}
        </span>

        <select value={planValue} onChange={(event) => onPlanChange(event.target.value)} className="form-input" style={{ width: 110, fontSize: 12 }}>
          {PLAN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        <input
          type="date"
          value={expiresAtValue}
          onChange={(event) => onExpiresAtChange(event.target.value)}
          className="form-input"
          style={{ width: 150, fontSize: 12 }}
        />

        <button
          onClick={() => onUpdatePlan(workspace.id, planValue, expiresAtValue ? new Date(expiresAtValue).toISOString() : null)}
          disabled={isSaving}
          className="btn-primary"
          style={{ fontSize: 12, minWidth: 70 }}
        >
          {isSaving ? '...' : 'حفظ'}
        </button>

        <button
          onClick={() => onDeleteWorkspace(workspace)}
          disabled={isCurrentUserWorkspace || isDeleting}
          title={isCurrentUserWorkspace ? 'لا يمكن حذف مساحة المستخدم الحالي' : 'حذف مساحة العمل'}
          style={{ background: isCurrentUserWorkspace ? '#e2e8f0' : '#fee2e2', border: 'none', borderRadius: 8, color: isCurrentUserWorkspace ? '#94a3b8' : '#dc2626', cursor: isCurrentUserWorkspace ? 'not-allowed' : 'pointer', fontSize: 12, padding: '8px 12px', fontFamily: 'Cairo' }}
        >
          {isDeleting ? 'جارٍ الحذف...' : 'حذف'}
        </button>
      </div>

      {isExpanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 18px', background: '#fafafa' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#475569' }}>
            أعضاء المساحة {members ? `(${members.length})` : ''}
          </div>

          {!members ? (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>جارٍ تحميل الأعضاء...</div>
          ) : members.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>لا يوجد أعضاء.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {members.map((member) => {
                const memberUid = resolveMemberUid(member);
                const memberDeleteKey = `${workspace.id}:${memberUid}`;
                return (
                  <div key={memberUid || member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: 'white', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f620', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                      {(member.displayName || member.email || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{member.displayName || 'بدون اسم'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{member.email || memberUid || '-'}</div>
                    </div>
                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, background: member.role === 'admin' ? '#fef3c7' : '#f1f5f9', color: member.role === 'admin' ? '#d97706' : '#64748b', fontWeight: 600 }}>
                      {member.role || 'عضو'}
                    </span>
                    <button
                      onClick={() => onDeleteMember(workspace.id, member)}
                      disabled={removingMemberKey === memberDeleteKey}
                      style={{ background: '#fee2e2', border: 'none', borderRadius: 6, color: '#dc2626', cursor: 'pointer', fontSize: 11, padding: '4px 10px', fontFamily: 'Cairo' }}
                    >
                      {removingMemberKey === memberDeleteKey ? '...' : 'إزالة العضو'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
