import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { AgentsPage } from './pages/AgentsPage';
import { AllocationPage } from './pages/AllocationPage';
import { LeakInvestigationPage } from './pages/LeakInvestigationPage';
import { OverlapAnalysisPage } from './pages/OverlapAnalysisPage';
import { ExperimentsPage } from './pages/ExperimentsPage';
import { ReportPage } from './pages/ReportPage';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center text-sky-400 font-mono text-sm">
        Initializing Console...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0F17]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedLayout>
                <DashboardPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/datasets"
            element={
              <ProtectedLayout>
                <DatasetsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedLayout>
                <AgentsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/allocation"
            element={
              <ProtectedLayout>
                <AllocationPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/investigate"
            element={
              <ProtectedLayout>
                <LeakInvestigationPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/overlap"
            element={
              <ProtectedLayout>
                <OverlapAnalysisPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/experiments"
            element={
              <ProtectedLayout>
                <ExperimentsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedLayout>
                <ReportPage />
              </ProtectedLayout>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
