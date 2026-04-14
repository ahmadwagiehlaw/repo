import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login.jsx';
import AppLayout from '@/components/layout/AppLayout.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';
import SplashScreen from '@/components/SplashScreen.jsx';

// ── Lazy-loaded pages (heavy components load on demand) ──
const Dashboard = lazy(() => import('@/pages/Dashboard.jsx'));
const CasesList = lazy(() => import('@/components/cases/CasesList.jsx'));
const CaseDetails = lazy(() => import('@/pages/Cases/CaseDetails.jsx'));
const Sessions = lazy(() => import('@/pages/Sessions/index.jsx'));
const Archive = lazy(() => import('@/pages/Archive.jsx'));
const Templates = lazy(() => import('@/pages/Templates.jsx'));
const Judgments = lazy(() => import('@/pages/Judgments.jsx'));
const Tasks = lazy(() => import('@/pages/Tasks.jsx'));
const Settings      = lazy(() => import('@/pages/Settings.jsx'));
const SuperAdmin          = lazy(() => import('@/pages/SuperAdmin.jsx'));

const SessionsLog = lazy(() => import('@/pages/SessionsLog/index.jsx'));
const ActivationRequest   = lazy(() => import('@/pages/ActivationRequest.jsx'));

// ── Suspense fallback ────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', direction: 'rtl', fontFamily: 'Cairo',
      color: 'var(--text-muted)', fontSize: 14,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
        <div>جاري التحميل...</div>
      </div>
    </div>
  );
}

export default function App() {
  const { loading, user } = useAuth();
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem('splashShown')
  );

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', '1');
    setShowSplash(false);
  };

  return (
    <BrowserRouter>
      <ErrorBoundary>
        {showSplash ? (
          <SplashScreen onComplete={handleSplashComplete} />
        ) : loading ? (
          <div className="dashboard-widget-system">
            <p>جاري التحميل...</p>
          </div>
        ) : !user ? (
          <Login />
        ) : (
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/cases" element={<CasesList />} />
                <Route path="/cases/:caseId" element={<CaseDetails />} />
                <Route path="/sessions" element={<Sessions />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/judgments" element={<Judgments />} />
                <Route path="/sessions-log" element={<SessionsLog />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/super-admin" element={<SuperAdmin />} />
                <Route path="/activate" element={<ActivationRequest />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        )}
      </ErrorBoundary>
    </BrowserRouter>
  );
}
