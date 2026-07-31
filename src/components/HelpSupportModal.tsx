import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Calendar, 
  Video, 
  Building2, 
  Mail, 
  RotateCcw, 
  CheckCircle, 
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartTour: () => void;
  isDarkMode?: boolean;
}

interface FAQItem {
  question: string;
  answer: string;
  category: 'Booking' | 'Google Calendar' | 'Google Meet' | 'Admin & Support';
}

const FAQ_LIST: FAQItem[] = [
  {
    category: 'Booking',
    question: 'How do I book a meeting room, seminar hall, or lecture theatre?',
    answer: 'Navigate to the Room Directory or Calendar tab, choose your desired room or vacant time slot, enter the event details (Title, Date, Start/End Time, Attendees), and confirm. You will receive instant confirmation and an automated Google Calendar event.'
  },
  {
    category: 'Booking',
    question: 'How far in advance can academic spaces be reserved?',
    answer: 'General faculty and students can book up to 30 days in advance. Institute Senate halls and central auditoriums like Swatantrata Bhavan may require departmental approval depending on administrative settings.'
  },
  {
    category: 'Google Calendar',
    question: 'How do I connect and sync with my Google Calendar?',
    answer: 'In the top navbar or Profile tab, click "Connect Google Workspace". Grant permission to access Google Calendar. Once connected, all approved room bookings will automatically populate in your Google Calendar.'
  },
  {
    category: 'Google Meet',
    question: 'How do I generate a Google Meet link for a hybrid session?',
    answer: 'When filling out the room booking form, check the option "Generate Google Meet Link". The platform will automatically attach a unique video conference URL to your reservation and invite notifications.'
  },
  {
    category: 'Booking',
    question: 'How do I cancel or modify an existing booking?',
    answer: 'Go to your Profile or Calendar view, locate your reservation under "My Bookings", and click "Cancel Booking". Cancelled slots instantly release the room back into the vacant pool for other department members.'
  },
  {
    category: 'Google Meet',
    question: 'How do I join a Google Meet session for a room booking?',
    answer: 'Click on any scheduled event block in your Calendar or Dashboard. If a Google Meet link was attached, click the "Join Google Meet" button to open the call directly in your browser.'
  }
];

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose,
  onRestartTour,
  isDarkMode = true
}) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'guides' | 'contact'>('faq');
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const toggleFAQ = (index: number) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden text-left flex flex-col max-h-[85vh] ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-white' 
              : 'bg-white border-slate-200 text-slate-900 shadow-xl'
          }`}
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white border-b border-indigo-900/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/30 border border-indigo-500/40 rounded-2xl">
                <HelpCircle className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Help & Support Knowledgebase</h3>
                <p className="text-xs text-indigo-300">IIT (BHU) Smart Room Scheduler User Guides & FAQs</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Bar */}
          <div className={`flex border-b px-6 pt-3 gap-2 shrink-0 ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            {[
              { id: 'faq', label: 'Frequently Asked Questions', icon: <HelpCircle className="w-4 h-4" /> },
              { id: 'guides', label: 'Step-by-Step Guides', icon: <BookOpen className="w-4 h-4" /> },
              { id: 'contact', label: 'Support & Contact', icon: <Mail className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
                  activeTab === tab.id
                    ? (isDarkMode ? 'border-indigo-400 text-indigo-400 bg-slate-900' : 'border-indigo-600 text-indigo-600 bg-white')
                    : (isDarkMode ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-900')
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {activeTab === 'faq' && (
              <div className="space-y-3">
                {FAQ_LIST.map((faq, idx) => {
                  const isOpen = openFAQIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border transition-all ${
                        isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => toggleFAQ(idx)}
                        className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                            {faq.category}
                          </span>
                          <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {faq.question}
                          </span>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>

                      {isOpen && (
                        <div className={`p-4 pt-0 text-xs leading-relaxed border-t border-dashed ${
                          isDarkMode ? 'text-slate-300 border-slate-800' : 'text-slate-600 border-slate-200'
                        }`}>
                          <p className="mt-3">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'guides' && (
              <div className="space-y-4">
                {[
                  {
                    title: 'How to Book a Room',
                    icon: <Building2 className="w-5 h-5 text-indigo-400" />,
                    steps: [
                      'Click on "Room Directory" or "Calendar" in the navigation bar.',
                      'Use search or department filters to find a suitable space.',
                      'Click "Book Room" on your chosen facility.',
                      'Fill in Date, Time, Title, and optional Attendees.',
                      'Click "Confirm Booking" to finalize.'
                    ]
                  },
                  {
                    title: 'How to Connect Google Calendar',
                    icon: <Calendar className="w-5 h-5 text-emerald-400" />,
                    steps: [
                      'Click "Connect Google Workspace" in the top bar.',
                      'Accept the OAuth popup prompt with your IIT (BHU) account.',
                      'Once connected, all room reservations automatically sync to your personal Google Calendar.'
                    ]
                  },
                  {
                    title: 'How to Join a Google Meet',
                    icon: <Video className="w-5 h-5 text-rose-400" />,
                    steps: [
                      'Locate your event block in the Weekly Calendar or Dashboard.',
                      'Click on the event to expand details.',
                      'Click "Join Google Meet" to open the video call in a new tab.'
                    ]
                  }
                ].map((guide, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      {guide.icon}
                      <h4 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {guide.title}
                      </h4>
                    </div>
                    <ol className="space-y-2 pl-2">
                      {guide.steps.map((st, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{st}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl border text-center space-y-3 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <Mail className="w-8 h-8 text-indigo-400 mx-auto" />
                  <div>
                    <h4 className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      IIT (BHU) Academic Space Desk
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      For special auditorium reservations, VIP dignitary visits, or administrative room additions.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href="mailto:academic.space@iitbhu.ac.in"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                    >
                      <span>Email Academic Desk</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className={`p-4 px-6 border-t flex items-center justify-between shrink-0 ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={() => {
                onClose();
                onRestartTour();
              }}
              className="px-3.5 py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Restart Guided Onboarding Tour</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-extrabold bg-slate-800 hover:bg-slate-700 text-white transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
