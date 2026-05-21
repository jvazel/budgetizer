import React, { useState, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Categories from './pages/Categories';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import CalendarPage from './pages/CalendarPage';
import ScheduledPage from './pages/ScheduledPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import ChartsPage from './pages/ChartsPage';
import SettingsPage from './pages/SettingsPage';
import SummaryHistory from './pages/SummaryHistory';

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
          path="/summary-history" 
          element={
            <ProtectedRoute>
              <SummaryHistory />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
