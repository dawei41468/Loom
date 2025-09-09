import React from 'react';
import { Calendar, CheckSquare, Users, Heart, ArrowRight } from 'lucide-react';
import { useTranslation } from '../i18n';

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
      cardBg: 'bg-blue-50 dark:bg-blue-950/40',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40',
      iconColor: 'text-blue-600 dark:text-blue-300',
    },
    {
      icon: CheckSquare,
      title: 'Shared Tasks',
      description: 'Create and manage tasks together. Keep track of household responsibilities and goals.',
      cardBg: 'bg-green-50 dark:bg-green-950/40',
      iconBg: 'bg-green-50 dark:bg-green-950/40',
      iconColor: 'text-green-600 dark:text-green-300',
    },
    {
      icon: Users,
      title: 'Partner Connection',
      description: 'Connect with your partner to share calendars, tasks, and stay coordinated.',
      cardBg: 'bg-purple-50 dark:bg-purple-950/40',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40',
      iconColor: 'text-purple-600 dark:text-purple-300',
    },
    {
      icon: Heart,
      title: 'Quality Time',
      description: 'Find the perfect moments to spend together and never miss special occasions.',
      cardBg: 'bg-pink-50 dark:bg-pink-950/40',
      iconBg: 'bg-pink-50 dark:bg-pink-950/40',
      iconColor: 'text-pink-600 dark:text-pink-300',
    }
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
      <div className="loom-card max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full loom-gradient-hero flex items-center justify-center mb-6">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--loom-text))] mb-2">
            Welcome to Loom
          </h1>
          <p className="text-lg text-[hsl(var(--loom-text-muted))] leading-relaxed">
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
                className={`p-6 rounded-xl ${feature.cardBg} border border-[hsl(var(--loom-border))] dark:border-[hsl(var(--loom-border-strong))] transition-transform hover:scale-105`}
              >
                <div className={`w-12 h-12 rounded-lg ${feature.iconBg} flex items-center justify-center mb-4`}>
                  <IconComponent className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-[hsl(var(--loom-text))] dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-[hsl(var(--loom-text-muted))] dark:text-[hsl(var(--loom-text))/0.85]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-sm text-[hsl(var(--loom-text-muted))] mb-6">
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
