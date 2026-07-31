import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Sparkles, 
  LayoutDashboard, 
  Building2, 
  Calendar, 
  PlusCircle, 
  Search, 
  Filter, 
  CalendarCheck, 
  User, 
  HelpCircle,
  Video,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'rooms' | 'calendar' | 'profile' | 'admin') => void;
  isDarkMode?: boolean;
}

interface TourStep {
  title: string;
  category: string;
  icon: React.ReactNode;
  tabKey?: 'dashboard' | 'rooms' | 'calendar' | 'profile' | 'admin';
  description: string;
  keyPoints: string[];
  tips: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to IIT (BHU) Smart Room Scheduler',
    category: 'Getting Started',
    icon: <Sparkles className="w-7 h-7 text-indigo-400" />,
    tabKey: 'dashboard',
    description: 'Manage, reserve, and synchronize academic spaces across IIT (BHU) Varanasi with real-time availability, interactive map overlays, and Google Workspace integration.',
    keyPoints: [
      'Verified database of auditoriums, lecture halls, and laboratories',
      'Real-time status tracking (Available, Reserved, Occupied)',
      '1-click Google Calendar & Google Meet sync'
    ],
    tips: 'You can restart this tour anytime from the Help & Support menu.'
  },
  {
    title: 'Executive Dashboard',
    category: 'Dashboard',
    icon: <LayoutDashboard className="w-7 h-7 text-emerald-400" />,
    tabKey: 'dashboard',
    description: 'Your command center for campus scheduling. View your upcoming reservations, real-time room availability, today\'s lectures, and recent bookings at a glance.',
    keyPoints: [
      'My Upcoming Reservation highlights your next confirmed slot',
      'Live metric cards showing vacant rooms right now',
      'Quick action buttons to jump directly into room booking'
    ],
    tips: 'Click on any available room card to start a quick booking.'
  },
  {
    title: 'Room Directory & Advanced Filters',
    category: 'Room Directory',
    icon: <Building2 className="w-7 h-7 text-sky-400" />,
    tabKey: 'rooms',
    description: 'Browse the complete dataset of IIT (BHU) Varanasi meeting rooms, seminar halls, lecture theatres, and computer labs.',
    keyPoints: [
      'Filter by Department, Building/Zone, Seating Capacity, and Room Type',
      'Search instantly by room code, building name, or facility',
      'View verified amenities (Smart Board, AC, Video Conferencing, Wi-Fi)'
    ],
    tips: 'Use the amenity toggle chips to find rooms equipped with specific tech like 4K Projectors or GPU workstations.'
  },
  {
    title: 'Interactive Weekly Calendar & Grid',
    category: 'Calendar',
    icon: <Calendar className="w-7 h-7 text-purple-400" />,
    tabKey: 'calendar',
    description: 'A Google Calendar and Outlook style visual timetable. Easily drag or tap time slots to check room availability and resolve slot conflicts.',
    keyPoints: [
      'Switch between Day, Week, and Month scheduling views',
      'Color-coded event blocks showing status (Approved, Pending, Conflict)',
      'Direct sync status indicator with Google Calendar'
    ],
    tips: 'Click directly on any empty calendar slot to pre-fill date and time for booking.'
  },
  {
    title: '7-Step Seamless Booking Flow',
    category: 'Bookings',
    icon: <PlusCircle className="w-7 h-7 text-indigo-400" />,
    tabKey: 'rooms',
    description: 'Reserving a room takes under a minute with our step-by-step guided booking modal.',
    keyPoints: [
      'Step 1-3: Choose Room, Date, & Time Slot with conflict prevention',
      'Step 4-5: Add Title, Purpose, & Attendee Email Invites',
      'Step 6-7: Enable Google Meet Link generation & Confirm'
    ],
    tips: 'Automatic buffer time is reserved between consecutive sessions to prevent overlap.'
  },
  {
    title: 'Google Workspace & Google Meet Integration',
    category: 'Integrations',
    icon: <Video className="w-7 h-7 text-rose-400" />,
    tabKey: 'profile',
    description: 'Connect your Google account to automatically push approved room reservations directly to your personal Google Calendar and generate instant Google Meet links.',
    keyPoints: [
      'Auto-creates Google Calendar events with room location details',
      'Generates secure Google Meet links for hybrid meetings',
      'Sends email calendar invites to all added attendees'
    ],
    tips: 'Manage your OAuth Google connection under Profile -> Integrations.'
  },
  {
    title: 'Profile, Role & Preferences',
    category: 'Profile & Settings',
    icon: <User className="w-7 h-7 text-amber-400" />,
    tabKey: 'profile',
    description: 'Customize your academic profile, view your personal booking history, toggle dark/light mode, or switch between Academic Member and Platform Admin views.',
    keyPoints: [
      'Track your total booked hours and approval stats',
      'Export detailed booking reports in CSV or PDF format',
      'Access Help & Support, FAQs, and Guided Tour controls'
    ],
    tips: 'Admins can reseed the verified IIT (BHU) room dataset anytime in 1-click.'
  }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  isDarkMode = true
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      if (onNavigateTab && TOUR_STEPS[nextIndex].tabKey) {
        onNavigateTab(TOUR_STEPS[nextIndex].tabKey!);
      }
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      if (onNavigateTab && TOUR_STEPS[prevIndex].tabKey) {
        onNavigateTab(TOUR_STEPS[prevIndex].tabKey!);
      }
    }
  };

  const handleComplete = () => {
    localStorage.setItem('iitbhu_has_completed_tour', 'true');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden text-left ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-white' 
              : 'bg-white border-slate-200 text-slate-900 shadow-xl'
          }`}
        >
          {/* Header Banner */}
          <div className="relative p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white border-b border-indigo-900/40">
            <button
              onClick={handleComplete}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition-all cursor-pointer"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-600/30 border border-indigo-500/40 rounded-2xl shrink-0">
                {currentStep.icon}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-mono">
                  Step {currentStepIndex + 1} of {TOUR_STEPS.length} • {currentStep.category}
                </span>
                <h3 className="text-lg font-black tracking-tight">{currentStep.title}</h3>
              </div>
            </div>

            {/* Step Progress Bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-4 overflow-hidden flex gap-1">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-full flex-1 transition-all duration-300 rounded-full ${
                    idx <= currentStepIndex ? 'bg-indigo-400' : 'bg-slate-700/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-5">
            <p className={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {currentStep.description}
            </p>

            <div className={`p-4 rounded-2xl border space-y-2.5 ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                Key Features
              </span>
              <ul className="space-y-2">
                {currentStep.keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {currentStep.tips && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-xl flex items-center gap-2.5 text-xs text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-[11px] font-medium">{currentStep.tips}</span>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className={`p-4 px-6 border-t flex items-center justify-between ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={handleComplete}
              className={`text-xs font-bold transition-all hover:underline ${
                isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md cursor-pointer"
              >
                <span>{isLastStep ? 'Get Started' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
