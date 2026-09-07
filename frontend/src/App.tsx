import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import DashboardPage from './pages/DashboardPage';
import NewAuditPage from './pages/NewAuditPage';
import AuditReportPage from './pages/AuditReportPage';
import SettingsPage from './pages/SettingsPage';

export function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/audit/new" element={<NewAuditPage />} />
          <Route path="/audit/:id" element={<AuditReportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
