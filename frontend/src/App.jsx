import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { useAuth } from './hooks/useAuth';

// Core pages
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import LoadingBar from './components/LoadingBar';
import ErrorBoundary from './components/ErrorBoundary';
import LanguageSplashBanner from './components/LanguageSplashBanner';

// Tree pages
import TreeList from './components/TreeList';
import CreateTree from './components/CreateTree';
import TreeView from './components/TreeView';
import AddMember from './components/AddMember';
import EditMember from './components/EditMember';

// Feature pages
import MemberProfile from './components/MemberProfile';
import AccountProfile from './components/AccountProfile';
import Notifications from './components/Notifications';
import TreeSettings from './components/TreeSettings';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

/** Full-page loading skeleton shown while auth state resolves */
function AppLoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      background: 'var(--gray-50, #f9fafb)',
    }}>
      <div style={{
        width: 56,
        height: 56,
        border: '4px solid var(--gray-200, #e5e7eb)',
        borderTopColor: 'var(--primary-green, #16a34a)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--gray-500, #6b7280)', fontSize: '1rem', fontWeight: 500 }}>
        🌳 La Racine
      </p>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen />;
  }

  return (
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* ── Dashboard ── */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* ── Account ── */}
      <Route path="/account" element={<ProtectedRoute><AccountProfile /></ProtectedRoute>} />

      {/* ── Notifications ── */}
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

      {/* ── Trees ── */}
      <Route path="/trees"             element={<ProtectedRoute><TreeList /></ProtectedRoute>} />
      <Route path="/trees/new"         element={<ProtectedRoute><CreateTree /></ProtectedRoute>} />
      <Route path="/trees/:treeId"     element={<ProtectedRoute><TreeView /></ProtectedRoute>} />
      <Route path="/trees/:treeId/members/new" element={<ProtectedRoute><AddMember /></ProtectedRoute>} />
      <Route path="/trees/:treeId/settings"    element={<ProtectedRoute><TreeSettings /></ProtectedRoute>} />

      {/* ── Members ── */}
      <Route path="/members/:memberId"       element={<ProtectedRoute><MemberProfile /></ProtectedRoute>} />
      <Route path="/members/:memberId/edit"  element={<ProtectedRoute><EditMember /></ProtectedRoute>} />

      {/* ── Legacy routes — preserved for backward compatibility ── */}
      {/* Note: passes treeId correctly so TreeView's useParams works */}
      <Route path="/tree/:treeId" element={<ProtectedRoute><TreeView /></ProtectedRoute>} />

      {/* ── Default redirects ── */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <ThemeProvider>
            <Router>
              {/* NotificationProvider inside Router (needs Link navigation) and AuthProvider (needs auth state) */}
              <NotificationProvider>
                <Header />
                <LanguageSplashBanner />
                <LoadingBar />
                <main className="app-main">
                  <AppRoutes />
                </main>
              </NotificationProvider>
            </Router>
          </ThemeProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
