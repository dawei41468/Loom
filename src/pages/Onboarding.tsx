// Onboarding Flow
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users, QrCode, Check } from 'lucide-react';
import { useAuth, useUI } from '../store';
import { MOCK_USER } from '../api/client';

const steps = [
  { id: 'welcome', title: 'Welcome to Loom' },
  { id: 'profile', title: 'Set up your profile' },
  { id: 'partner', title: 'Connect with your partner' },
  { id: 'complete', title: 'All set!' },
];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [colorPreference, setColorPreference] = useState<'user' | 'partner'>('user');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  const navigate = useNavigate();
  const { setUser, setOnboarded } = useAuth();
  const { addToast } = useUI();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    // Set up mock user with onboarding data
    const user = {
      ...MOCK_USER,
      display_name: displayName || 'You',
      color_preference: colorPreference,
      timezone,
    };
    
    setUser(user);
    setOnboarded(true);
    
    addToast({
      type: 'success',
      title: 'Welcome to Loom!',
      description: 'Your account is all set up.',
    });
    
    navigate('/');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full loom-gradient-hero flex items-center justify-center mb-8">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-semibold text-[hsl(var(--loom-text))]">
              Welcome to Loom
            </h1>
            <p className="text-lg text-[hsl(var(--loom-text-muted))] leading-relaxed">
              <em>weave your days together</em>
            </p>
            <p className="text-[hsl(var(--loom-text-muted))]">
              The couples calendar that helps you coordinate, connect, and create shared moments.
            </p>
            <button
              onClick={handleNext}
              className="loom-btn-primary w-full flex items-center justify-center space-x-2"
            >
              <span>Get Started</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Set up your profile</h2>
              <p className="text-[hsl(var(--loom-text-muted))]">
                How would you like to appear in your shared calendar?
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color Preference</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setColorPreference('user')}
                    className={`p-4 rounded-[var(--loom-radius-md)] border transition-all ${
                      colorPreference === 'user'
                        ? 'border-[hsl(var(--loom-user))] bg-[hsl(var(--loom-user)/0.1)]'
                        : 'border-[hsl(var(--loom-border))]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-[hsl(var(--loom-user))] mx-auto mb-2" />
                    <span className="text-sm">Teal</span>
                  </button>
                  <button
                    onClick={() => setColorPreference('partner')}
                    className={`p-4 rounded-[var(--loom-radius-md)] border transition-all ${
                      colorPreference === 'partner'
                        ? 'border-[hsl(var(--loom-partner))] bg-[hsl(var(--loom-partner)/0.1)]'
                        : 'border-[hsl(var(--loom-border))]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-[hsl(var(--loom-partner))] mx-auto mb-2" />
                    <span className="text-sm">Orange</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Shanghai">Shanghai</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!displayName.trim()}
              className="loom-btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>Continue</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        );

      case 2:
        return (
          <div className="text-center space-y-6">
            <QrCode className="w-16 h-16 mx-auto text-[hsl(var(--loom-primary))]" />
            <h2 className="text-2xl font-semibold">Connect with your partner</h2>
            <p className="text-[hsl(var(--loom-text-muted))]">
              Share this invite link or QR code with your partner to get started together.
            </p>
            
            <div className="loom-card bg-[hsl(var(--loom-primary)/0.1)] border-[hsl(var(--loom-primary)/0.2)]">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-white rounded-lg flex items-center justify-center">
                  <div className="text-xs text-gray-800">QR Code</div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Invite Link</p>
                  <code className="text-xs bg-[hsl(var(--loom-surface))] px-3 py-2 rounded block">
                    https://loom.app/join/abc123
                  </code>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleNext}
                className="loom-btn-primary w-full"
              >
                Skip for now
              </button>
              <p className="text-xs text-[hsl(var(--loom-text-muted))]">
                You can add your partner later in Settings
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-[hsl(var(--loom-success))] flex items-center justify-center">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold">All set!</h2>
            <p className="text-[hsl(var(--loom-text-muted))]">
              Welcome to Loom, {displayName}! Start by adding your first event or exploring the calendar.
            </p>
            <button
              onClick={handleComplete}
              className="loom-btn-primary w-full"
            >
              Start using Loom
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] flex flex-col safe-area-top">
      {/* Progress indicator */}
      <div className="px-6 py-4">
        <div className="flex space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-1 rounded-full transition-colors ${
                index <= currentStep
                  ? 'bg-[hsl(var(--loom-primary))]'
                  : 'bg-[hsl(var(--loom-border))]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 flex items-center">
        <div className="w-full max-w-md mx-auto">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;