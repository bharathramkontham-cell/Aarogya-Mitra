import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { AuthPages } from './pages/AuthPages';
import { Dashboard } from './pages/Dashboard';
import { MedicationsPage } from './pages/MedicationsPage';
import { RefillsPage } from './pages/RefillsPage';
import { RemindersPage } from './pages/RemindersPage';
import { ConsultationsPage } from './pages/ConsultationsPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { ProfilePage } from './pages/ProfilePage';
import { CaregiverMgmtPage } from './pages/CaregiverMgmtPage';
import { CaregiverDashboardPage } from './pages/CaregiverDashboardPage';
import { InfoPage } from './pages/InfoPage';
import { NotFound } from './pages/NotFound';
import { useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Signing in" />
      </div>
    );
  }

  if (!session) {
    return <Landing />;
  }

  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  const { session, loading } = useAuth();

  useEffect(() => {
    // Ensure auth state is loaded before rendering protected content.
    void session;
  }, [session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading Aarogya Mitra" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={session ? <Layout /> : <Landing />}
      />
      <Route
        path="/auth/*"
        element={<AuthPages />}
      />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="medications" element={<MedicationsPage />} />
              <Route path="refills" element={<RefillsPage />} />
              <Route path="reminders" element={<RemindersPage />} />
              <Route path="consultations" element={<ConsultationsPage />} />
              <Route path="providers" element={<ProvidersPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="caregivers" element={<CaregiverMgmtPage />} />
              <Route path="caregiver-dashboard" element={<CaregiverDashboardPage />} />
              <Route path="info/*" element={<InfoPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
