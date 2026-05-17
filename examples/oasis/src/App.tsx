import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import LoadingScreen from './components/LoadingScreen';
import { useAuthStore } from '@/stores/authStore';

// Lazy load pages for code splitting
const LauncherPage = lazy(() => import('./pages/LauncherPage'));
const WorldBrowserPage = lazy(() => import('./pages/WorldBrowserPage'));
const SocialPage = lazy(() => import('./pages/SocialPage'));
const CreatorPage = lazy(() => import('./pages/CreatorPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const CentralPage = lazy(() => import('./pages/CentralPage'));
const WorldPage = lazy(() => import('./pages/WorldPage'));
const VRBuilderPage = lazy(() => import('./pages/VRBuilderPage'));

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
        </Route>

        {/* Main app routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<LauncherPage />} />
          <Route path="/browse" element={<WorldBrowserPage />} />
          <Route path="/social" element={<SocialPage />} />
          <Route path="/create" element={<CreatorPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Immersive world routes (no sidebar) */}
        <Route path="/central" element={<CentralPage />} />
        <Route path="/central/:zoneId" element={<CentralPage />} />
        <Route path="/world/:worldId" element={<WorldPage />} />
        <Route
          path="/vr-builder"
          element={
            <ProtectedRoute>
              <VRBuilderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/build"
          element={
            <ProtectedRoute>
              <VRBuilderPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
