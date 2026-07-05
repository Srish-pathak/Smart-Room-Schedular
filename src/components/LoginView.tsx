import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Clock3 } from 'lucide-react';

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
}) => {
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} flex flex-col justify-between p-6 relative overflow-hidden font-sans transition-colors duration-300`}>
      {/* Abstract Architectural Tech Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(13,148,136,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(13,148,136,0.05)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(13,148,136,0.08),transparent_60%)] pointer-events-none" />
      
      {/* Soft Ambient Glow Elements */}
      <motion.div 
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.22, 0.15],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-[130px] pointer-events-none" 
      />
      <motion.div 
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.1, 0.18, 0.1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" 
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full max-w-xl mx-auto pt-2 z-10 relative">
        <button
          onClick={toggleDarkMode}
          className={`self-start sm:self-auto px-3.5 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            isDarkMode 
              ? 'border-slate-800 bg-slate-900/80 text-[#dfb965] hover:bg-slate-800' 
              : 'border-slate-200 bg-white/80 text-[#0a4735] hover:bg-stone-50'
          }`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div className={`self-end sm:self-auto text-right font-mono text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-2`}>
          <Clock3 className="w-3.5 h-3.5 text-indigo-505" />
          <span>BHU Office Clock: {currentTime || 'Loading...'}</span>
        </div>
      </div>

      <div className={`max-w-xl w-full mx-auto my-auto ${
        isDarkMode 
          ? 'bg-slate-900/65 border-slate-800/80 shadow-indigo-950/25' 
          : 'bg-white/95 border-slate-200 shadow-slate-200/50'
      } border rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 backdrop-blur-xl transition-all duration-300`}>
        <div className="text-center space-y-3.5">
          <div className={`text-[10px] font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest font-mono`}>
            Indian Institute of Technology (BHU) Varanasi
          </div>
          <h1 className={`text-3xl sm:text-4xl font-display font-extrabold tracking-tight ${
            isDarkMode 
              ? 'bg-gradient-to-r from-white via-slate-100 to-indigo-300' 
              : 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900'
          } bg-clip-text text-transparent`}>
            IIT BHU Smart Room Scheduler
          </h1>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} max-w-sm mx-auto leading-relaxed`}>
            Full-Stack Room Scheduler with Role-Based Access Control, Persistent PostgreSQL, and optional Google Workspace integrations.
          </p>
        </div>

        {/* Tester Helper Cards */}
        <div className={`p-4 rounded-2xl border ${
          isDarkMode 
            ? 'bg-slate-950/60 border-indigo-950/50' 
            : 'bg-slate-50/80 border-slate-150'
        } space-y-3`}>
          <span className={`text-[9.5px] font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-650'} uppercase tracking-widest block font-mono`}>
            ⚡ Quick Tester Profiles (Click to prefill coordinates):
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillPredefinedCredentials('admin')}
              className={`text-[10px] font-semibold py-2 px-2 rounded-xl transition-all border cursor-pointer ${
                isDarkMode 
                  ? 'bg-indigo-950/30 hover:bg-indigo-900/40 border-indigo-900/30 text-indigo-200' 
                  : 'bg-indigo-50/80 hover:bg-indigo-100 border-indigo-200/60 text-indigo-700'
              }`}
            >
              Prof. Rajeev (Admin)
            </button>
            <button
              type="button"
              onClick={() => fillPredefinedCredentials('user')}
              className={`text-[10px] font-semibold py-2 px-2 rounded-xl transition-all border cursor-pointer ${
                isDarkMode 
                  ? 'bg-amber-950/30 hover:bg-amber-900/40 border-amber-900/30 text-amber-200' 
                  : 'bg-amber-50/80 hover:bg-amber-100 border-amber-200/60 text-amber-700'
              }`}
            >
              Abishek (User)
            </button>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className={`flex border-b ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200/80'}`}>
          <button
            onClick={() => setIsRegisterMode(false)}
            className={`flex-1 text-center py-2.5 text-xs font-bold uppercase transition-all cursor-pointer ${
              !isRegisterMode 
                ? 'text-indigo-500 border-b-2 border-indigo-500' 
                : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-500')
            }`}
          >
            Credentials Sign In
          </button>
          <button
            onClick={() => setIsRegisterMode(true)}
            className={`flex-1 text-center py-2.5 text-xs font-bold uppercase transition-all cursor-pointer ${
              isRegisterMode 
                ? 'text-indigo-500 border-b-2 border-indigo-500' 
                : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-500')
            }`}
          >
            Create Account
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!isRegisterMode ? (
            <motion.form
              key="login-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleCredentialsLogin}
              className="space-y-4"
            >
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1.5`}>
                  Email Coordinates (Any email works to instantly connect!)
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter any email (e.g. resident@gmail.com)"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className={`w-full ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800/80 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
                  } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1.5`}>
                  Account Secret Password (Optional - any password works!)
                </label>
                <input
                  type="password"
                  placeholder="Optional (defaults to password123)"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800/80 text-slate-200 placeholder:text-slate-605 focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
                  } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                {isLoggingIn ? 'Logging you in...' : 'Sign In Now'}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="register-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleCredentialsRegister}
              className="space-y-4"
            >
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1.5`}>Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. A.K. Tripathi"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className={`w-full ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800/80 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-905 placeholder:text-slate-400 focus:border-indigo-500'
                  } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1.5`}>IIT Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. tripathi.cs@iitbhu.ac.in"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className={`w-full ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800/80 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-905 placeholder:text-slate-400 focus:border-indigo-500'
                  } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1.5`}>Create Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className={`w-full ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800/80 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-905 placeholder:text-slate-400 focus:border-indigo-500'
                  } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1.5`}>Desired Status Role</label>
                <select
                  value={registerRole}
                  onChange={(e: any) => setRegisterRole(e.target.value)}
                  className={`w-full ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800/80 text-slate-200 focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-250 text-slate-900 focus:border-indigo-505'
                  } border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none`}
                >
                  <option value="user">User Account (Access to own bookings)</option>
                  <option value="admin">Platform Admin (Full system clearance)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                {isLoggingIn ? 'Registering Account...' : 'Create Account & Log In'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <div className="text-center font-mono text-[9px] text-slate-600 uppercase tracking-widest pt-4">
        <span>IIT BHU Secure Full-Stack Portal • Academic Scheduling Node</span>
      </div>
    </div>
  );
};
