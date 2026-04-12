import { useState, useEffect } from 'react';
import { getDerivedCaseSessionType } from '@/utils/caseCanonical.js';

const DEFAULT_FIELDS = [
  { id: 'status', label: 'الحالة', icon: '✓', key: 'status' },
  { id: 'roleCapacity', label: 'الصفة القانونية', icon: '👤', key: 'roleCapacity' },
  { id: 'plaintiff', label: 'المدعي', icon: '⚖️', key: 'plaintiffName', sensitive: true },
  { id: 'defendant', label: 'المدعى عليه', icon: '👥', key: 'defendantName', sensitive: true },
  { id: 'client', label: 'الموكل', icon: '👨‍⚖️', key: 'clientName', sensitive: true },
  { id: 'court', label: 'المحكمة', icon: '🏛️', key: 'court' },
  { id: 'circuit', label: 'الدائرة', icon: '🏢', key: 'circuit' },
  { id: 'procedureTrack', label: 'درجة التقاضي', icon: '📜', key: 'procedureTrack' },
  { id: 'sessionType', label: 'نوع الجلسة', icon: '📅', key: 'sessionType' },
  { id: 'litigationStage', label: 'مرحلة التقاضي', icon: '📊', key: 'litigationStage' },
  { id: 'fileLocation', label: 'مكان الملف', icon: '📁', key: 'fileLocation' },
  { id: 'joinedCases', label: 'دعاوى منضمة', icon: '🔗', key: 'joinedCases' },
  { id: 'firstInstanceNumber', label: 'رقم أول درجة', icon: '⏮️', key: 'firstInstanceNumber' },
  { id: 'firstInstanceCourt', label: 'محكمة أول درجة', icon: '🏛️', key: 'firstInstanceCourt' },
  { id: 'firstInstanceDate', label: 'تاريخ حكم أول درجة', icon: '📅', key: 'firstInstanceDate' },
  { id: 'notes', label: 'ملاحظات', icon: '📝', key: 'notes' },
];

function InfoCard({ icon, label, value, blurred = false }) {
  return (
    <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', filter: blurred ? 'blur(4px)' : 'none', userSelect: blurred ? 'none' : 'text' }}>
        {value || '—'}
      </div>
    </div>
  );
}

export default function CaseInfo({ caseData, statusLabels, sensitiveHidden = false }) {
  const storageKey = 'lb_caseinfo_layout';
  const [layout, setLayout] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [tempLayout, setTempLayout] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = parsed.map(p => {
          const def = DEFAULT_FIELDS.find(d => d.id === p.id);
          return def ? { ...def, visible: p.visible } : null;
        }).filter(Boolean);
        DEFAULT_FIELDS.forEach(d => {
          if (!merged.find(m => m.id === d.id)) merged.push({ ...d, visible: true });
        });
        setLayout(merged);
      } catch {
        setLayout(DEFAULT_FIELDS.map(f => ({ ...f, visible: true })));
      }
    } else {
      setLayout(DEFAULT_FIELDS.map(f => ({ ...f, visible: true })));
    }
  }, []);

  const openModal = () => {
    setTempLayout([...layout]);
    setShowModal(true);
  };

  const saveLayout = () => {
    setLayout(tempLayout);
    localStorage.setItem(storageKey, JSON.stringify(tempLayout.map(f => ({ id: f.id, visible: f.visible }))));
    setShowModal(false);
  };

  const resetLayout = () => {
    const defaultLayout = DEFAULT_FIELDS.map(f => ({ ...f, visible: true }));
    setLayout(defaultLayout);
    localStorage.removeItem(storageKey);
    setShowModal(false);
  };

  const moveItem = (index, direction) => {
    const newLayout = [...tempLayout];
    if (direction === 'up' && index > 0) {
      [newLayout[index - 1], newLayout[index]] = [newLayout[index], newLayout[index - 1]];
    } else if (direction === 'down' && index < newLayout.length - 1) {
      [newLayout[index + 1], newLayout[index]] = [newLayout[index], newLayout[index + 1]];
    }
    setTempLayout(newLayout);
  };

  const toggleVisibility = (index) => {
    const newLayout = [...tempLayout];
    newLayout[index].visible = !newLayout[index].visible;
    setTempLayout(newLayout);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={openModal} title="تخصيص العرض" style={{ position: 'absolute', top: '-46px', left: '0', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', padding: '6px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        ⚙️ تخصيص
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {layout.filter(f => f.visible).map(field => {
          const val = field.id === 'status'
            ? (statusLabels[caseData.status] || caseData.status)
            : field.id === 'sessionType'
              ? getDerivedCaseSessionType(caseData)
              : caseData[field.key];
          const blurred = field.sensitive ? sensitiveHidden : false;
          return <InfoCard key={field.id} icon={field.icon} label={field.label} value={val} blurred={blurred} />;
        })}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '420px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', fontSize: '16px' }}>⚙️ تخصيص عرض الحقول</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {tempLayout.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: item.visible ? '#f8fafc' : '#f1f5f9', border: `1px solid ${item.visible ? '#cbd5e1' : '#e2e8f0'}`, borderRadius: '10px', opacity: item.visible ? 1 : 0.6, transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => toggleVisibility(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} title={item.visible ? 'إخفاء' : 'إظهار'}>
                      {item.visible ? '👁️' : '🙈'}
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{item.icon} {item.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1, padding: '4px' }}>⬆️</button>
                    <button onClick={() => moveItem(idx, 'down')} disabled={idx === tempLayout.length - 1} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: idx === tempLayout.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === tempLayout.length - 1 ? 0.3 : 1, padding: '4px' }}>⬇️</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={saveLayout} className="btn-primary" style={{ padding: '8px 20px' }}>حفظ</button>
                <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '8px 16px' }}>إلغاء</button>
              </div>
              <button onClick={resetLayout} style={{ background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>إعادة للافتراضي</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
