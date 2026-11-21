import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { DEMO_EMERGENCY_TOKEN } from './shared/constants.ts';

// Public & Auth pages
import { LandingPage } from './pages/LandingPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { WorkerRegisterPage } from './pages/WorkerRegisterPage.tsx';
import { ProviderRegisterPage } from './pages/ProviderRegisterPage.tsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.tsx';
import { EmergencyAccessPage } from './pages/EmergencyAccessPage.tsx';
import { LanguagePage } from './pages/LanguagePage.tsx';

// Worker pages
import { WorkerDashboardPage } from './pages/worker/WorkerDashboardPage.tsx';
import { WorkerProfilePage } from './pages/worker/WorkerProfilePage.tsx';
import { HealthRecordsPage } from './pages/worker/HealthRecordsPage.tsx';
import { HealthRecordDetailPage } from './pages/worker/HealthRecordDetailPage.tsx';
import { HealthRecordFormPage } from './pages/worker/HealthRecordFormPage.tsx';
import { DocumentUploadPage } from './pages/worker/DocumentUploadPage.tsx';
import { OcrResultsPage } from './pages/worker/OcrResultsPage.tsx';
import { AiSummaryPage } from './pages/worker/AiSummaryPage.tsx';
import { ConsentManagementPage } from './pages/worker/ConsentManagementPage.tsx';
import { EmergencyQrPage } from './pages/worker/EmergencyQrPage.tsx';

// Provider pages
import { ProviderDashboardPage } from './pages/provider/ProviderDashboardPage.tsx';
import { WorkerSearchPage } from './pages/provider/WorkerSearchPage.tsx';
import { AccessRequestsPage } from './pages/provider/AccessRequestsPage.tsx';
import { AuthorizedRecordsPage } from './pages/provider/AuthorizedRecordsPage.tsx';

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';
import { UserManagementPage } from './pages/admin/UserManagementPage.tsx';
import { AuditLogsPage } from './pages/admin/AuditLogsPage.tsx';

// Shared authenticated pages
import { NotificationsPage } from './pages/shared/NotificationsPage.tsx';
import { SettingsPage } from './pages/shared/SettingsPage.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer />
        <Routes>
          {/* Public & Auth Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/worker" element={<WorkerRegisterPage />} />
          <Route path="/register/provider" element={<ProviderRegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/emergency"
            element={<Navigate to={`/emergency/${DEMO_EMERGENCY_TOKEN}`} replace />}
          />
          <Route path="/emergency/:token" element={<EmergencyAccessPage />} />
          <Route path="/language" element={<LanguagePage />} />

          {/* Worker Portal Routes */}
          <Route
            path="/worker/dashboard"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/profile"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <WorkerProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/records"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <HealthRecordsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/records/new"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <HealthRecordFormPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/records/:id"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <HealthRecordDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/records/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <HealthRecordFormPage mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/documents/upload"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <DocumentUploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/documents"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <OcrResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/documents/:id/ocr"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <OcrResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/ai-summaries"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <AiSummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/consents"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <ConsentManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/worker/emergency-qr"
            element={
              <ProtectedRoute allowedRoles={['WORKER']}>
                <EmergencyQrPage />
              </ProtectedRoute>
            }
          />

          {/* Healthcare Provider Portal Routes */}
          <Route
            path="/provider/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PROVIDER']}>
                <ProviderDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/search"
            element={
              <ProtectedRoute allowedRoles={['PROVIDER']}>
                <WorkerSearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/requests"
            element={
              <ProtectedRoute allowedRoles={['PROVIDER']}>
                <AccessRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/records"
            element={
              <ProtectedRoute allowedRoles={['PROVIDER']}>
                <AuthorizedRecordsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/workers/:workerId/records"
            element={
              <ProtectedRoute allowedRoles={['PROVIDER']}>
                <AuthorizedRecordsPage />
              </ProtectedRoute>
            }
          />

          {/* Administrator Portal Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Shared Authenticated Routes */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
