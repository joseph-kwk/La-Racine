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

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">Loading...</p>
        </div>
      </div>
    );
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function AppRoutes() {
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
      <Route path="/tree/:id" element={
        <ProtectedRoute>
          <TreeView />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
