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

// Tree pages
import TreeList from './components/TreeList';
import CreateTree from './components/CreateTree';
import TreeView from './components/TreeView';
import AddMember from './components/AddMember';

// New pages
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

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Routes>
        <Route path="*" element={<div />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Account */}
      <Route path="/account" element={<ProtectedRoute><AccountProfile /></ProtectedRoute>} />

      {/* Notifications */}
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

      {/* Trees */}
      <Route path="/trees" element={<ProtectedRoute><TreeList /></ProtectedRoute>} />
      <Route path="/trees/new" element={<ProtectedRoute><CreateTree /></ProtectedRoute>} />
      <Route path="/trees/:treeId" element={<ProtectedRoute><TreeView /></ProtectedRoute>} />
      <Route path="/trees/:treeId/members/new" element={<ProtectedRoute><AddMember /></ProtectedRoute>} />
      <Route path="/trees/:treeId/settings" element={<ProtectedRoute><TreeSettings /></ProtectedRoute>} />

      {/* Member profile — dedicated full page */}
      <Route path="/members/:memberId" element={<ProtectedRoute><MemberProfile /></ProtectedRoute>} />

      {/* Legacy tree route */}
      <Route path="/tree/:id" element={<ProtectedRoute><TreeView /></ProtectedRoute>} />

      {/* Default redirects */}
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
              {/* NotificationProvider is inside Router (for link navigation) and inside AuthProvider (for auth state) */}
              <NotificationProvider>
                <Header />
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
