import { useNavigate } from 'react-router-dom';
import subscriptionManager from '@/services/SubscriptionManager.js';

export default function FeatureGate({
  feature,
  children,
  fallback = null,
  showUpgrade = true,
}) {
  const navigate = useNavigate();
  const hasAccess = subscriptionManager.hasFeature(feature);

  if (hasAccess) return children;
  if (!showUpgrade) return fallback;

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 10,
      background: '#fffbeb', border: '1px dashed #f59e0b',
      cursor: 'pointer', direction: 'rtl',
    }}
      onClick={() => navigate('/activate')}
      title="اضغط للترقية"
    >
      <span style={{ fontSize: 16 }}>🔒</span>
      <div>
        <div style={{ fontSize: 12, color: '#92400e', fontFamily: 'Cairo', fontWeight: 700 }}>
          {subscriptionManager.getUpgradeMessage(feature)}
        </div>
        <div style={{ fontSize: 11, color: '#d97706', fontFamily: 'Cairo', marginTop: 2 }}>
          اضغط للترقية إلى Pro ←
        </div>
      </div>
    </div>
  );
}
