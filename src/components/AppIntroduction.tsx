import React from 'react';
import { Calendar, CheckSquare, Users, Heart, ArrowRight } from 'lucide-react';
import { useTranslation } from '../i18n';
import LoomLogo from './LoomLogo';

interface AppIntroductionProps {
  onContinue: () => void;
}

const AppIntroduction: React.FC<AppIntroductionProps> = ({ onContinue }) => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Calendar,
      title: 'Smart Calendar',
      description: 'Coordinate schedules with your partner. See overlapping free time and plan events together.',
      variant: 'blue',
    },
    {
      icon: CheckSquare,
      title: 'Shared Tasks',
      description: 'Create and manage tasks together. Keep track of household responsibilities and goals.',
      variant: 'green',
    },
    {
      icon: Users,
      title: 'Partner Connection',
      description: 'Connect with your partner to share calendars, tasks, and stay coordinated.',
      variant: 'purple',
    },
    {
      icon: Heart,
      title: 'Quality Time',
      description: 'Find the perfect moments to spend together and never miss special occasions.',
      variant: 'pink',
    }
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
      <div className="loom-card max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <LoomLogo size="lg" className="mx-auto mb-6 w-20 h-20" />
          <h1 className="loom-heading-2 mb-2 text-3xl">
            Welcome to Loom
          </h1>
          <p className="loom-text-muted text-lg leading-relaxed">
            {t('tagline')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className={`onboarding-feature-card onboarding-feature--${(feature as any).variant}`}
              >
                <div className={`onboarding-icon-wrap--${(feature as any).variant}`}>
                  <IconComponent className={`w-6 h-6 onboarding-icon--${(feature as any).variant}`} />
                </div>
                <h3 className="loom-heading-3 mb-2">
                  {feature.title}
                </h3>
                <p className="loom-text-muted text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <p className="loom-text-muted text-sm mb-6">
            Let's get you set up to start coordinating with your partner!
          </p>
          <button
            onClick={onContinue}
            className="loom-btn-primary flex items-center justify-center space-x-2 mx-auto"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppIntroduction;
