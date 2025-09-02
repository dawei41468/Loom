// Fallback Index - redirects to Today page
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // This should redirect to the main app
    navigate('/', { replace: true });
  }, [navigate]);

  return <LoadingScreen />;
};

export default Index;
