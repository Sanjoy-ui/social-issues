import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';
import { Citizendashboard } from './component/ui/Citizendashboard.js';
import { Govtdashboard } from './component/ui/Govtdashboard.js';
import { Universitydashboard } from './component/ui/Universitydashboard.js';
import { Industrydashboard } from './component/ui/Industrydashboard.js';
import { ProtectedRoute } from './component/auth/ProtectedRoute.js';
import { useAuthStore } from './store/authStore.js';

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth().catch(() => {});
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/citizen"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN']}>
              <Citizendashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/govt"
          element={
            <ProtectedRoute allowedRoles={['GOVT']}>
              <Govtdashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/university"
          element={
            <ProtectedRoute allowedRoles={['UNIVERSITY']}>
              <Universitydashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/industry"
          element={
            <ProtectedRoute allowedRoles={['INDUSTRY']}>
              <Industrydashboard />
            </ProtectedRoute>
          }
        />
        {/* Catch-all for unhandled routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
