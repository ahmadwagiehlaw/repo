/**
 * Batch 6.1 — SubscriptionManager
 * Controls feature access based on workspace plan
 * Plans: 'free' | 'pro' | 'team'
 */

const PLAN_FEATURES = {
  free: ['cases','sessions','tasks','judgments','archive','templates','aiAssistant','localAttachments'],
  pro: ['cases','sessions','tasks','judgments','archive','templates','aiAssistant','localAttachments','cloudSync','cloudAttachments','auditLog','exportExcel','prioritySupport'],
  team: ['cases','sessions','tasks','judgments','archive','templates','aiAssistant','localAttachments','cloudSync','cloudAttachments','auditLog','exportExcel','prioritySupport','multiUser','inviteFlow','sharedTemplates','advancedReports'],
};

const PLAN_LIMITS = {
  free:  { maxCases: 100,  maxAttachmentsMB: 0,    maxUsers: 1,  maxTemplates: 10  },
  pro:   { maxCases: -1,   maxAttachmentsMB: 1024,  maxUsers: 1,  maxTemplates: 100 },
  team:  { maxCases: -1,   maxAttachmentsMB: 5120,  maxUsers: 10, maxTemplates: -1  },
};

class SubscriptionManager {
  constructor() {
    this._plan = 'free';
    this._expiresAt = null;
    this._workspaceId = null;
  }

  init(workspaceData) {
    if (!workspaceData) return;
    this._plan = workspaceData.plan || 'free';
    this._expiresAt = workspaceData.subscriptionExpiresAt || null;
    this._workspaceId = workspaceData.id || null;
  }

  get plan() {
    if (this._isExpired()) return 'free';
    return this._plan || 'free';
  }

  _isExpired() {
    if (!this._expiresAt) return false;
    return new Date(this._expiresAt) < new Date();
  }

  hasFeature(featureName) {
    const features = PLAN_FEATURES[this.plan] || PLAN_FEATURES.free;
    return features.includes(featureName);
  }

  getLimit(limitName) {
    const limits = PLAN_LIMITS[this.plan] || PLAN_LIMITS.free;
    return limits[limitName] ?? 0;
  }

  isWithinLimit(limitName, currentValue) {
    const limit = this.getLimit(limitName);
    if (limit === -1) return true;
    return currentValue < limit;
  }

  getUpgradeMessage(featureName) {
    const messages = {
      cloudSync:        'مزامنة السحابة متاحة في الخطة المدفوعة (Pro)',
      cloudAttachments: 'رفع المرفقات للسحابة متاح في الخطة المدفوعة (Pro)',
      auditLog:         'سجل التدقيق متاح في الخطة المدفوعة (Pro)',
      multiUser:        'تعدد المستخدمين متاح في خطة الفريق (Team)',
      inviteFlow:       'دعوة المستخدمين متاحة في خطة الفريق (Team)',
      advancedReports:  'التقارير المتقدمة متاحة في خطة الفريق (Team)',
    };
    return messages[featureName] || 'هذه الميزة غير متاحة في خطتك الحالية';
  }

  getPlanInfo() {
    return {
      plan: this.plan,
      isExpired: this._isExpired(),
      expiresAt: this._expiresAt,
      features: PLAN_FEATURES[this.plan] || [],
      limits: PLAN_LIMITS[this.plan] || PLAN_LIMITS.free,
    };
  }
}

export default new SubscriptionManager();
