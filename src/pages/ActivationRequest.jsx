/**
 * Batch 15.3 — ActivationRequest Page
 * Shown to non-Pro users who want to upgrade
 * Sends request to Firestore activationRequests collection
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import storage from '@/data/Storage.js';
import subscriptionManager from '@/services/SubscriptionManager.js';

export default function ActivationRequest() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const planInfo = subscriptionManager.getPlanInfo();
  const isPro = planInfo.plan === 'pro' || planInfo.plan === 'team';

  const handleSubmit = async () => {
    if (!phone.trim()) {
      setError('رقم الهاتف مطلوب');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await storage.createActivationRequest({
        userId: user?.uid || '',
        userName: user?.displayName || user?.email || 'مستخدم',
        email: user?.email || '',
        phone: phone.trim(),
        message: message.trim(),
        workspaceId: currentWorkspace?.id || '',
        workspaceName: currentWorkspace?.name || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err) {
      setError('حدث خطأ أثناء الإرسال. حاول مرة أخرى.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (isPro) {
    return (
      <div style={{
        direction: 'rtl', fontFamily: 'Cairo',
        maxWidth: 600, margin: '60px auto', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⭐</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>
          أنت مشترك في الخطة المدفوعة
        </h2>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          خطتك الحالية: <strong style={{ color: '#f59e0b' }}>{planInfo.plan.toUpperCase()}</strong>
          {planInfo.expiresAt && ` — تنتهي ${planInfo.expiresAt.substring(0, 10)}`}
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{
        direction: 'rtl', fontFamily: 'Cairo',
        maxWidth: 600, margin: '60px auto', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', marginBottom: 12 }}>
          تم إرسال طلبك بنجاح
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8 }}>
          سيتواصل معك فريقنا على الرقم الذي أدخلته خلال 24 ساعة.
          <br />
          شكراً لاهتمامك بـ LawBase Pro ⚖️
        </p>
      </div>
    );
  }

  return (
    <div style={{
      direction: 'rtl', fontFamily: 'Cairo',
      maxWidth: 600, margin: '40px auto', padding: 24,
    }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        borderRadius: 16, padding: '32px 28px', marginBottom: 28,
        textAlign: 'center', color: 'white',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px' }}>
          ترقية إلى LawBase Pro
        </h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, lineHeight: 1.8 }}>
          احصل على مزامنة سحابية، رفع ملفات غير محدود،
          <br />سجل تدقيق، وأولوية في الدعم الفني
        </p>
      </div>

      {/* Features */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 10, marginBottom: 28,
      }}>
        {[
          { icon: '☁️', label: 'مزامنة سحابية' },
          { icon: '📁', label: 'رفع ملفات غير محدود' },
          { icon: '🔍', label: 'سجل تدقيق كامل' },
          { icon: '📊', label: 'تقارير متقدمة' },
          { icon: '👥', label: 'تعدد المستخدمين (Team)' },
          { icon: '🚀', label: 'أولوية في الدعم' },
        ].map((f) => (
          <div key={f.label} style={{
            padding: '10px 14px', borderRadius: 10,
            background: '#f8fafc', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          }}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <span style={{ fontWeight: 600 }}>{f.label}</span>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 24,
        border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800 }}>
          📬 طلب التفعيل
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
            رقم الهاتف / واتساب *
          </label>
          <input
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            type="tel"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
            ملاحظات إضافية (اختياري)
          </label>
          <textarea
            className="form-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="أي استفسار أو متطلب خاص..."
            rows={3}
          />
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: '#fee2e2', color: '#dc2626', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: 15, fontWeight: 700 }}
        >
          {saving ? 'جاري الإرسال...' : '🚀 إرسال طلب التفعيل'}
        </button>

        <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
          سيتم التواصل معك خلال 24 ساعة عبر واتساب
        </p>
      </div>
    </div>
  );
}
