import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Code-split page components for better performance
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Index = React.lazy(() => import('./pages/Index'));
const Calendar = React.lazy(() => import('./pages/Calendar'));
const Add = React.lazy(() => import('./pages/Add/AddPage'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Partner = React.lazy(() => import('./pages/Partner'));
const EventDetail = React.lazy(() => import('./pages/EventDetail'));
const EditEvent = React.lazy(() => import('./pages/EditEvent'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Invite = React.lazy(() => import('./pages/Invite'));

// Components
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import ToastContainer from './components/ToastContainer';
import ThemeProvider from './components/ThemeProvider';

// Contexts & API
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuthState } from './contexts/AuthContext';
import { CalendarUIProvider } from './contexts/CalendarUIContext';
import { UIProvider } from './contexts/UIContext';
import { PushNotificationProvider } from './contexts/PushNotificationContext';

// Hooks
import { usePolling } from './hooks/usePolling';
import { usePartnerWebSocket } from './hooks/usePartnerWebSocket';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Scroll to top on route changes
const ScrollToTop = React.memo(() => {
  const { pathname } = useLocation();
  useEffect(() => {
    // Always reset scroll position when route path changes
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
});

ScrollToTop.displayName = 'ScrollToTop';

const ProtectedRoute = React.memo(({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isOnboarded, isLoading } = useAuthState();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isOnboarded) {
    // Allow access to onboarding page if not onboarded
    if (window.location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
});

ProtectedRoute.displayName = 'ProtectedRoute';

// Loading fallback for lazy-loaded components
const PageFallback = React.memo(() => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
));

PageFallback.displayName = 'PageFallback';

const PollingManager = React.memo(() => {
  const { isAuthenticated } = useAuthState();

  // Only poll when user is authenticated
  usePolling(isAuthenticated ? 30000 : 0); // 30 seconds when authenticated, disabled when not

  return null;
});

const PartnerSocketManager = React.memo(() => {
  usePartnerWebSocket();
  return null;
});

const AuthenticatedSocketManager = React.memo(() => {
  const { isAuthenticated, isLoading } = useAuthState();

  // Only render WebSocket manager when user is authenticated and not loading
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return <PartnerSocketManager />;
});

AuthenticatedSocketManager.displayName = 'AuthenticatedSocketManager';

const AppRoutes = React.memo(() => {
  const { isAuthenticated, isOnboarded, isLoading } = useAuthState();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/invite/:token" element={<Invite />} />

        {/* Onboarding route */}
        <Route
          path="/onboarding"
          element={
            isAuthenticated && !isOnboarded ? (
              <Onboarding />
            ) : (
              <Navigate to={isAuthenticated ? "/" : "/login"} replace />
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Index />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="add" element={<Add />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="partner" element={<Partner />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route
          path="/event/:id"
          element={
            <ProtectedRoute>
              <EventDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/event/:id/edit"
          element={
            <ProtectedRoute>
              <EditEvent />
            </ProtectedRoute>
          }
        />

        {/* Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
});

AppRoutes.displayName = 'AppRoutes';

const App = React.memo(() => {
  return (
    <UIProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ToastProvider>
            <AuthProvider>
              <PushNotificationProvider>
                <CalendarUIProvider>
                  <ThemeProvider>
                  <BrowserRouter
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true,
                    }}
                  >
                    <div className="min-h-screen bg-[hsl(var(--loom-bg))] text-[hsl(var(--loom-text))]">
                      <ScrollToTop />
                      <PollingManager />
                      <AuthenticatedSocketManager />
                      <AppRoutes />
                      <ToastContainer />
                    </div>
                  </BrowserRouter>
                </ThemeProvider>
              </CalendarUIProvider>
            </PushNotificationProvider>
          </AuthProvider>
          </ToastProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </UIProvider>
  );
});

App.displayName = 'App';

export default App;
