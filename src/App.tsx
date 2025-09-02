import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Pages
import Onboarding from './pages/Onboarding';
import Today from './pages/Today';
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

// Store & API
import { useAuth } from './store';
import { apiClient } from './api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AppRoutes = () => {
  const { isOnboarded, isAuthenticated, setUser, setPartner } = useAuth();

  useEffect(() => {
    // Initialize app data
    const initializeApp = async () => {
      try {
        // Load user data
        const userResponse = await apiClient.getMe();
        setUser(userResponse.data);

        // Load partner data
        const partnerResponse = await apiClient.getPartner();
        setPartner(partnerResponse.data);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [setUser, setPartner]);

  // Show onboarding if not completed
  if (!isOnboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="add" element={<Add />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/event/:id" element={<EventDetail />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-[hsl(var(--loom-bg))] text-[hsl(var(--loom-text))]">
            <AppRoutes />
            <ToastContainer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
