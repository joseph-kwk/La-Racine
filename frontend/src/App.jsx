import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TreeView from './components/TreeView';
import TreeList from './components/TreeList';
import CreateTree from './components/CreateTree';
import AddMember from './components/AddMember';
import Header from './components/Header';
import LoadingBar from './components/LoadingBar';
import Notifications from './components/Notifications';
import ErrorBoundary from './components/ErrorBoundary';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    // Keep route tree minimal while loading; LoadingBar will show
    return (
      <Routes>
        <Route path="*" element={<div />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/trees" element={
        <ProtectedRoute>
          <TreeList />
        </ProtectedRoute>
      } />
      <Route path="/trees/new" element={
        <ProtectedRoute>
          <CreateTree />
        </ProtectedRoute>
      } />
      <Route path="/trees/:treeId" element={
        <ProtectedRoute>
          <TreeView />
        </ProtectedRoute>
      } />
      <Route path="/trees/:treeId/members/new" element={
        <ProtectedRoute>
          <AddMember />
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      } />
      <Route path="/tree/:id" element={
        <ProtectedRoute>
          <TreeView />
        </ProtectedRoute>
      } />
  <Route path="/" element={<Navigate to="/dashboard" />} />
  {/* Catch-all */}
  <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Header />
          <LoadingBar />
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
