import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';
import QueryProvider from './providers/QueryProvider';

// Layout Components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/Common/LoadingSpinner';
import ErrorBoundary from './components/Common/ErrorBoundary';

// Auth Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// Dashboard Components
import Dashboard from './components/Dashboard/Dashboard';
import DocumentUpload from './components/Documents/DocumentUpload';
import ScannedDocumentUpload from './components/ScannedDocumentUpload';
import VirtualizedDocumentList from './components/Documents/VirtualizedDocumentList';
import DocumentDetails from './components/Documents/DocumentDetails';

// User Components
import Profile from './components/User/Profile';
import Subscription from './components/User/Subscription';

// Admin Components
import AdminDashboard from './components/Admin/AdminDashboard';
import UserManagement from './components/Admin/UserManagement';
import Analytics from './components/Admin/Analytics';

// Onboarding
import OnboardingTour from './components/Onboarding/OnboardingTour';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { isAuthenticated, user, loading } = useAuth();
  const { showError } = useNotification();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Handle onboarding
  useEffect(() => {
    if (isAuthenticated && user && !user.onboardingCompleted && process.env.REACT_APP_ENABLE_ONBOARDING === 'true') {
      setShowOnboarding(true);
    }
  }, [isAuthenticated, user]);

  // Global error handler
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      showError('An unexpected error occurred. Please try again.');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [showError]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <QueryProvider>
      <div className="App">
        {showOnboarding && (
          <OnboardingTour 
            onComplete={() => setShowOnboarding(false)}
            onSkip={() => setShowOnboarding(false)}
          />
        )}
        
        <ErrorBoundary>
        <Routes>
          {/* Public Routes */}
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

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Document Routes */}
            <Route path="documents">
              <Route index element={<VirtualizedDocumentList />} />
              <Route path="upload" element={<DocumentUpload />} />
              <Route path="scan" element={<ScannedDocumentUpload />} />
              <Route path=":id" element={<DocumentDetails />} />
            </Route>

            {/* User Routes */}
            <Route path="profile" element={<Profile />} />
            <Route path="subscription" element={<Subscription />} />

            {/* Admin Routes */}
            <Route path="admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="admin/users" element={
              <ProtectedRoute requireAdmin={true}>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="admin/analytics" element={
              <ProtectedRoute requireAdmin={true}>
                <Analytics />
              </ProtectedRoute>
            } />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
        </Routes>
      </ErrorBoundary>
    </div>
    </QueryProvider>
  );
}

export default App;
