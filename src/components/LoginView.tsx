import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  Clock3, 
  Building2, 
  Users, 
  Calendar, 
  CheckCircle, 
  Zap, 
  Video, 
  ShieldCheck, 
  BellRing, 
  Activity,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { Login } from '../auth/Login';
import { Register } from '../auth/Register';
import { ForgotPassword } from '../auth/ForgotPassword';

interface LoginViewProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentTime: string;
  isRegisterMode: boolean;
  setIsRegisterMode: (val: boolean) => void;
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  registerName: string;
  setRegisterName: (val: string) => void;
  registerEmail: string;
  setRegisterEmail: (val: string) => void;
  registerPassword: string;
  setRegisterPassword: (val: string) => void;
  registerRole: 'user' | 'admin';
  setRegisterRole: (val: 'user' | 'admin') => void;
  isLoggingIn: boolean;
  fillPredefinedCredentials: (role: 'admin' | 'user') => void;
  handleCredentialsLogin: (e: React.FormEvent) => void;
  handleCredentialsRegister: (e: React.FormEvent) => void;
  handleGoogleSignIn?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  isDarkMode,
  toggleDarkMode,
  currentTime,
  isRegisterMode,
  setIsRegisterMode,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  registerName,
  setRegisterName,
  registerEmail,
  setRegisterEmail,
  registerPassword,
  setRegisterPassword,
  registerRole,
  setRegisterRole,
  isLoggingIn,
  fillPredefinedCredentials,
  handleCredentialsLogin,
  handleCredentialsRegister,
  handleGoogleSignIn,
}) => {
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>(isRegisterMode ? 'register' : 'login');

  useEffect(() => {
    setAuthView(isRegisterMode ? 'register' : 'login');
  }, [isRegisterMode]);

  return (
    <div className={`min-h-screen ${
      isDarkMode 
        ? 'bg-slate-950 text-white bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_70%)]' 
        : 'bg-slate-50 text-slate-900 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.04),transparent_70%)]'
    } flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans transition-colors duration-300`}>
      
      {/* Abstract Architectural Tech Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      
      {/* Floating Ambient Glowing Elements */}
      <motion.div 
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.2, 0.32, 0.2],
          y: [0, -15, 0]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -top-12 -left-12 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" 
      />
      <motion.div 
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.15, 0.25, 0.15],
          x: [0, 20, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3
        }}
        className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-[160px] pointer-events-none" 
      />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full max-w-7xl mx-auto pt-2 z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-500/20">
            IIT
          </div>
          <div className="text-left">
            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest block font-mono`}>
              Smart Portal
            </span>
            <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              IIT (BHU), Varanasi
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            onClick={toggleDarkMode}
            className={`px-3.5 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              isDarkMode 
                ? 'border-slate-800 bg-slate-900/80 text-yellow-400 hover:bg-slate-800' 
                : 'border-slate-200 bg-white text-indigo-900 hover:bg-slate-50 shadow-sm'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div className={`text-right font-mono text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80`}>
            <Clock3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>BHU Time: {currentTime || 'Loading...'}</span>
          </div>
        </div>
      </div>

      {/* Main Container with 2-Column Split Screen */}
      <div className="w-full max-w-7xl mx-auto my-auto z-10 relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-6 sm:py-10">
        
        {/* Left Column: Premium Login / Sign-Up Card */}
        <div className="lg:col-span-5 w-full flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`w-full max-w-[460px] mx-auto ${
              isDarkMode 
                ? 'bg-slate-900/70 border-slate-800/80 shadow-indigo-950/10' 
                : 'bg-white/95 border-slate-200 shadow-slate-200/50'
            } border rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6 backdrop-blur-xl transition-all duration-300 hover:shadow-indigo-500/5`}
          >
            {/* Quick Tester Helper Cards */}
            <div className={`p-4 rounded-2xl border ${
              isDarkMode 
                ? 'bg-slate-950/60 border-slate-800/40' 
                : 'bg-slate-50/80 border-slate-200/60'
            } space-y-2.5`}>
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className={`text-[10px] font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-650'} uppercase tracking-widest font-mono`}>
                  Quick Access Profiles
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillPredefinedCredentials('admin')}
                  className={`text-[11px] font-bold py-2 px-2.5 rounded-xl transition-all border cursor-pointer text-center ${
                    isDarkMode 
                      ? 'bg-indigo-950/30 hover:bg-indigo-900/40 border-indigo-900/30 text-indigo-300' 
                      : 'bg-indigo-50/80 hover:bg-indigo-100 border-indigo-200/60 text-indigo-700'
                  }`}
                >
                  Prof. Rajeev (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => fillPredefinedCredentials('user')}
                  className={`text-[11px] font-bold py-2 px-2.5 rounded-xl transition-all border cursor-pointer text-center ${
                    isDarkMode 
                      ? 'bg-amber-950/30 hover:bg-amber-900/40 border-amber-900/30 text-amber-300' 
                      : 'bg-amber-50/80 hover:bg-amber-100 border-amber-200/60 text-amber-700'
                  }`}
                >
                  Abishek (Student)
                </button>
              </div>
            </div>

            {/* Custom Interactive Tabs */}
            <div className={`flex border-b ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200/80'}`}>
              <button
                onClick={() => {
                  setIsRegisterMode(false);
                  setAuthView('login');
                }}
                className={`flex-1 text-center pb-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  authView === 'login' || authView === 'forgot'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 font-extrabold' 
                    : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-500')
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsRegisterMode(true);
                  setAuthView('register');
                }}
                className={`flex-1 text-center pb-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  authView === 'register'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 font-extrabold' 
                    : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-500')
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Render sub views */}
            <AnimatePresence mode="wait">
              {authView === 'forgot' ? (
                <motion.div
                  key="forgot-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="py-1"
                >
                  <ForgotPassword
                    onSwitchToLogin={() => {
                      setIsRegisterMode(false);
                      setAuthView('login');
                    }}
                    isDarkMode={isDarkMode}
                  />
                </motion.div>
              ) : authView === 'register' ? (
                <motion.div
                  key="register-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="py-1"
                >
                  <Register
                    onSwitchToLogin={() => {
                      setIsRegisterMode(false);
                      setAuthView('login');
                    }}
                    isDarkMode={isDarkMode}
                    email={registerEmail}
                    setEmail={setRegisterEmail}
                    password={registerPassword}
                    setPassword={setRegisterPassword}
                    fullName={registerName}
                    setFullName={setRegisterName}
                    role={registerRole}
                    setRole={setRegisterRole}
                    handleCredentialsRegister={handleCredentialsRegister}
                    isLoggingIn={isLoggingIn}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="login-view"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="py-1"
                >
                  <Login
                    onSwitchToRegister={() => {
                      setIsRegisterMode(true);
                      setAuthView('register');
                    }}
                    onSwitchToForgotPassword={() => {
                      setAuthView('forgot');
                    }}
                    isDarkMode={isDarkMode}
                    email={loginEmail}
                    setEmail={setLoginEmail}
                    password={loginPassword}
                    setPassword={setLoginPassword}
                    handleCredentialsLogin={handleCredentialsLogin}
                    handleGoogleSignIn={handleGoogleSignIn}
                    isLoggingIn={isLoggingIn}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Right Column: Hero Branding Panel with Mock Scheduler & Stats */}
        <div className="lg:col-span-7 hidden lg:flex flex-col space-y-8 pl-4">
          
          {/* Production Branding */}
          <div className="space-y-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isDarkMode 
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}>
              <GraduationCap className="w-4 h-4" /> Academic Booking Node
            </span>
            <h1 className={`text-4xl xl:text-5xl font-display font-extrabold tracking-tight leading-tight ${
              isDarkMode 
                ? 'text-white' 
                : 'text-slate-900'
            }`}>
              Smart Meeting Room <br />
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 bg-clip-text text-transparent">
                Booking System
              </span>
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} max-w-xl leading-relaxed`}>
              Indian Institute of Technology (BHU), Varanasi. A cohesive, full-stack scheduling engine featuring automated conflict resolution, live calendar syncing, and real-time room availability logs.
            </p>
          </div>

          {/* Interactive Live Calendar Mockup */}
          <div className={`p-5 rounded-2xl border ${
            isDarkMode 
              ? 'bg-slate-900/50 border-slate-850 shadow-indigo-950/15' 
              : 'bg-white border-slate-200/85 shadow-lg shadow-slate-200/40'
          } space-y-4 relative overflow-hidden group`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Live Terminal • CSE Meeting Room 1
                </span>
              </div>
              <span className="text-[10px] font-mono bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-semibold">
                TODAY
              </span>
            </div>

            {/* Mock Schedule Items */}
            <div className="space-y-3.5">
              {/* Meeting Item 1 */}
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-300 hover:scale-[1.01] ${
                isDarkMode 
                  ? 'bg-slate-950/80 border-slate-800' 
                  : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Distributed Systems Colloquium</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Prof. Rajeev Kumar • 10:00 AM - 11:30 AM</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
                  Active
                </span>
              </div>

              {/* Meeting Item 2 */}
              <div className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-300 hover:scale-[1.01] ${
                isDarkMode 
                  ? 'bg-slate-950/80 border-slate-800' 
                  : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">M.Tech AI Lab Hackathon Brief</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Abishek Sharma • 12:00 PM - 01:30 PM</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 px-2.5 py-1 rounded-full shrink-0">
                  Upcoming
                </span>
              </div>

              {/* Available slot */}
              <div className={`p-3 rounded-xl border-2 border-dashed flex items-center justify-between ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-950/30' 
                  : 'border-slate-200 bg-slate-50/40'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border border-dashed border-slate-350 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 font-bold shrink-0">
                    +
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500">Unreserved Academic Interval</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600">Available to reserve • 02:00 PM - 03:30 PM</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                  Secure Slot <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </div>

          {/* Core System Statistics Cards Grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Rooms Available', count: '18', desc: 'Spaces Ready', icon: <Building2 className="w-4 h-4 text-emerald-500" /> },
              { label: 'Faculty Members', count: '350+', desc: 'Active Reservers', icon: <Users className="w-4 h-4 text-indigo-500" /> },
              { label: 'Students Enrolled', count: '5k+', desc: 'Authorized Users', icon: <GraduationCap className="w-4 h-4 text-purple-500" /> },
              { label: 'Total Bookings', count: '1,200+', desc: 'Reservations', icon: <Calendar className="w-4 h-4 text-amber-500" /> },
            ].map((stat, idx) => (
              <div key={idx} className={`p-3.5 rounded-2xl border transition-all duration-300 hover:shadow-md ${
                isDarkMode 
                  ? 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/60' 
                  : 'bg-white border-slate-200/70 hover:bg-slate-50/50 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200/55 dark:border-slate-800 shrink-0">
                    {stat.icon}
                  </div>
                  <span className={`text-[15px] sm:text-lg font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {stat.count}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <h5 className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate tracking-wide uppercase">
                    {stat.label}
                  </h5>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate font-mono">
                    {stat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Elegant Feature Badge Highlights */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/85">
            {[
              { text: 'Instant Booking', icon: <Zap className="w-3.5 h-3.5 text-indigo-500" /> },
              { text: 'Google Meet Syncing', icon: <Video className="w-3.5 h-3.5 text-purple-500" /> },
              { text: 'Conflict Protection', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> },
              { text: 'Email Alerts & QR Codes', icon: <BellRing className="w-3.5 h-3.5 text-amber-500" /> },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                {feature.icon}
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Production Premium Footer */}
      <div className={`text-center font-mono text-[10px] ${
        isDarkMode ? 'text-slate-500' : 'text-slate-400'
      } border-t border-slate-200/40 dark:border-slate-800/40 pt-4 mt-6 z-10 relative space-y-1`}>
        <p className="font-semibold uppercase tracking-widest text-[9px]">
          © 2026 IIT BHU Smart Meeting Room Booking System
        </p>
        <p className="text-[9px] lowercase opacity-80">
          Developed using React • Firebase • Firestore • Node.js • Express
        </p>
      </div>
    </div>
  );
};
