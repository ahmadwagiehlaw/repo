import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login.jsx';
import AppLayout from '@/components/layout/AppLayout.jsx';
import CasesList from '@/components/cases/CasesList.jsx';
import CaseDetails from '@/pages/Cases/CaseDetails.jsx';
import Sessions from '@/pages/Sessions/index.jsx';
import Archive from '@/pages/Archive.jsx';
import Templates from '@/pages/Templates.jsx';
import Judgments from '@/pages/Judgments.jsx';
import Tasks from '@/pages/Tasks.jsx';
import Dashboard from '@/pages/Dashboard.jsx';
import Settings from '@/pages/Settings.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';

export default function App() {
  const { loading, user } = useAuth();

  return (
    <BrowserRouter>
      <ErrorBoundary>
        {loading ? (
          <div className="dashboard-widget-system">
            <p>جاري التحميل...</p>
          </div>
        ) : !user ? (
          <Login />
        ) : (
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
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        )}
      </ErrorBoundary>
    </BrowserRouter>
  );
}
