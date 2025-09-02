import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Pages
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Register from './pages/Register';
import Index from './pages/Index';
import Calendar from './pages/Calendar';
import Add from './pages/Add';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import EventDetail from './pages/EventDetail';
import NotFound from './pages/NotFound';

// Components
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import ToastContainer from './components/ToastContainer';

// Contexts & API
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuthState } from './contexts/AuthContext';
import { EventsProvider } from './contexts/EventsContext';
import { TasksProvider } from './contexts/TasksContext';
import { UIProvider } from './contexts/UIContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
};

const AppRoutes = () => {
  const { isAuthenticated, isOnboarded, isLoading } = useAuthState();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />

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

      {/* Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <AuthProvider>
            <EventsProvider>
              <TasksProvider>
                <UIProvider>
                  <BrowserRouter
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true
                    }}
                  >
                    <div className="min-h-screen bg-[hsl(var(--loom-bg))] text-[hsl(var(--loom-text))]">
                      <AppRoutes />
                      <ToastContainer />
                    </div>
                  </BrowserRouter>
                </UIProvider>
              </TasksProvider>
            </EventsProvider>
          </AuthProvider>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
