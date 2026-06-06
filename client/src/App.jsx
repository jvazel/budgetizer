import React, { useState, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import OfflineStatus from './components/ui/OfflineStatus';
import WebAuthnPromptModal from './components/ui/WebAuthnPromptModal';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { PwaProvider } from './context/PwaContext';
import AppShell from './components/layout/AppShell';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
const Home = React.lazy(() => import('./pages/Home'));
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
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route path="/scheduled" element={<ScheduledPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/monthly-report" element={<MonthlyReportPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/summary-history" element={<SummaryHistory />} />
            <Route path="/ai-insights" element={<AiInsights />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
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
