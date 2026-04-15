export const PLAN_OPTIONS = [
  { value: 'free', label: 'مجاني', color: '#64748b' },
  { value: 'pro', label: 'Pro', color: '#f59e0b' },
  { value: 'team', label: 'Team', color: '#8b5cf6' },
];

export const PLAN_LIMITS = {
  free: { maxCases: 100, label: '100 قضية' },
  pro: { maxCases: -1, label: 'غير محدود' },
  team: { maxCases: -1, label: 'غير محدود' },
};

export function resolveMemberUid(member) {
  return String(member?.uid || member?.userId || member?.id || '').trim();
}

export function formatArabicDate(dateValue) {
  if (!dateValue) return '';
  try {
    return new Date(dateValue).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}
