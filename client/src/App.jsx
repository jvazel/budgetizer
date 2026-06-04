import React, { useState, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import OfflineStatus from './components/ui/OfflineStatus';
import WebAuthnPromptModal from './components/ui/WebAuthnPromptModal';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { PwaProvider } from './context/PwaContext';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
const Categories = React.lazy(() => import('./pages/Categories'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const Budgets = React.lazy(() => import('./pages/Budgets'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const ScheduledPage = React.lazy(() => import('./pages/ScheduledPage'));
const SubscriptionsPage = React.lazy(() => import('./pages/SubscriptionsPage'));
const ChartsPage = React.lazy(() => import('./pages/ChartsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const SummaryHistory = React.lazy(() => import('./pages/SummaryHistory'));
const AiInsights = React.lazy(() => import('./pages/AiInsights'));
const SavingsPage = React.lazy(() => import('./pages/SavingsPage'));
const AccountsPage = React.lazy(() => import('./pages/AccountsPage'));
const TransfersPage = React.lazy(() => import('./pages/TransfersPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const MonthlyReportPage = React.lazy(() => import('./pages/MonthlyReportPage'));

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null; // or a loading spinner
  if (!user) return <Navigate to="/login" />;
  return children;
};

// Public Route Wrapper
const PublicRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (user) return <Navigate to="/" />;
  return children;
};

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.preferences && user.preferences.theme) {
      const isLight = user.preferences.theme === 'light';
      document.documentElement.classList.toggle('light', isLight);
      document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
    } else {
      // Par défaut, thème sombre
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [user]);

  if (showSplash) {
    return <Splash onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return null; // keep screen blank or show a simple loader while auth checks
  }

  return (
    <>
      <Toaster position="top-center" />
      <OfflineStatus />
      <WebAuthnPromptModal />
      <React.Suspense fallback={
        <div className="flex justify-center items-center h-[100vh] w-full bg-background">
          <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
        </div>
      }>
        <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } 
        />
        <Route 
          path="/reset-password/:token" 
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/budgets" 
          element={
            <ProtectedRoute>
              <Budgets />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/charts" 
          element={
            <ProtectedRoute>
              <ChartsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/savings" 
          element={
            <ProtectedRoute>
              <SavingsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/scheduled" 
          element={
            <ProtectedRoute>
              <ScheduledPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/subscriptions" 
          element={
            <ProtectedRoute>
              <SubscriptionsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/transactions" 
          element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/categories" 
          element={
            <ProtectedRoute>
              <Categories />
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
        <Route 
          path="/accounts" 
          element={
            <ProtectedRoute>
              <AccountsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/monthly-report" 
          element={
            <ProtectedRoute>
              <MonthlyReportPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/transfers" 
          element={
            <ProtectedRoute>
              <TransfersPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/summary-history" 
          element={
            <ProtectedRoute>
              <SummaryHistory />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/ai-insights" 
          element={
            <ProtectedRoute>
              <AiInsights />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          } 
        />
        </Routes>
      </React.Suspense>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PwaProvider>
          <AppContent />
        </PwaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
