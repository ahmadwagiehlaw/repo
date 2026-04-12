import { useEffect, useState } from 'react';

/**
 * Batch 2.5 — PWA Splash Screen
 * Shows on first load for 2 seconds then fades out
 */
export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 100);
    const t2 = setTimeout(() => setPhase('exit'), 1800);
    const t3 = setTimeout(onComplete, 2200);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0f172a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: phase === 'exit' ? 0 : 1,
      transition: 'opacity 0.4s ease',
      fontFamily: "'Cairo', sans-serif",
      direction: 'rtl',
    }}>
      <div style={{
        transform: phase === 'visible' ? 'scale(1)' : 'scale(0.85)',
        opacity: phase === 'visible' ? 1 : 0,
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚖️</div>
        <h1 style={{
          color: '#f1f5f9', fontSize: '28px', fontWeight: '700',
          margin: 0, letterSpacing: '-0.5px',
        }}>
          LawBase
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '8px 0 0' }}>
          نظام إدارة القضايا القانونية
        </p>
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
        background: '#1e293b',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          width: phase === 'exit' ? '100%' : phase === 'visible' ? '70%' : '10%',
          transition: 'width 1.6s ease',
        }} />
      </div>
    </div>
  );
}
