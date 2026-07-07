import React, { useState } from 'react';
import { useAuth } from './useAuth';
import { User, Mail, Lock, ShieldAlert, Eye, EyeOff, Loader, CheckCircle2, AlertCircle } from 'lucide-react';

interface RegisterProps {
  onSwitchToLogin: () => void;
  isDarkMode: boolean;
  email?: string;
  setEmail?: (val: string) => void;
  password?: string;
  setPassword?: (val: string) => void;
  fullName?: string;
  setFullName?: (val: string) => void;
  role?: 'student' | 'faculty' | 'admin' | 'user';
  setRole?: (val: any) => void;
  handleCredentialsRegister?: (e: React.FormEvent) => void;
  isLoggingIn?: boolean;
}

export function Register({
  onSwitchToLogin,
  isDarkMode,
  email: propEmail,
  setEmail: propSetEmail,
  password: propPassword,
  setPassword: propSetPassword,
  fullName: propFullName,
  setFullName: propSetFullName,
  role: propRole,
  setRole: propSetRole,
  handleCredentialsRegister,
  isLoggingIn = false
}: RegisterProps) {
  const { signUp } = useAuth();
  const [localFullName, setLocalFullName] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [localRole, setLocalRole] = useState<'student' | 'faculty' | 'admin'>('student');

  const fullName = propFullName !== undefined ? propFullName : localFullName;
  const setFullName = propSetFullName !== undefined ? propSetFullName : setLocalFullName;
  const email = propEmail !== undefined ? propEmail : localEmail;
  const setEmail = propSetEmail !== undefined ? propSetEmail : setLocalEmail;
  const password = propPassword !== undefined ? propPassword : localPassword;
  const setPassword = propSetPassword !== undefined ? propSetPassword : setLocalPassword;
  
  // Handle role mapping for 'user' to 'student' if needed
  const mappedRole = (propRole !== undefined ? (propRole === 'user' ? 'student' : propRole) : localRole) as 'student' | 'faculty' | 'admin';
  const setRole = propSetRole !== undefined ? (val: any) => propSetRole(val === 'student' ? 'user' : val) : setLocalRole;

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const activeLoading = loading || isLoggingIn;

  // Strength checks
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(password);
  const strengthText = ['Weak', 'Fair', 'Medium', 'Strong', 'Excellent'][strengthScore - 1] || 'None';
  const strengthColor = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-emerald-500',
    'bg-teal-500'
  ][strengthScore - 1] || 'bg-slate-200 dark:bg-slate-700';

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!fullName.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!email) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Email formatting is invalid (e.g. name@iitbhu.ac.in).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (strengthScore < 3) {
      setError('Please use a stronger password (must combine uppercase, lowercase, numbers, or symbols).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Confirmation password does not match.');
      return;
    }

    if (handleCredentialsRegister) {
      try {
        await handleCredentialsRegister(e);
        setSuccess(true);
      } catch (err: any) {
        setError(err.message || 'Registration failed. Please make sure the email is not already registered.');
      }
    } else {
      setLoading(true);
      try {
        await signUp(email, password, fullName, mappedRole);
        setSuccess(true);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Registration failed. Please make sure the email is not already registered.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-1 font-sans">
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create Account
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Join IIT BHU Smart Room Booking portal.
        </p>
      </div>

      {success ? (
        <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/30 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400 mb-5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Account Created!</h4>
            <p className="text-xs text-emerald-700/90 dark:text-emerald-400/80 mt-1">
              A secure verification link has been sent to <strong>{email}</strong>. Please check your email to authorize your booking rights.
            </p>
            <button
              onClick={onSwitchToLogin}
              className="mt-3.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors duration-150"
            >
              Sign In Now
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-red-100 dark:border-red-950/30 bg-red-50/50 dark:bg-red-950/10 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                required
                disabled={activeLoading}
                className="block w-full pl-10 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ramesh.kumar@iitbhu.ac.in"
                required
                disabled={activeLoading}
                className="block w-full pl-10 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Portal Account Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['student', 'faculty', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  disabled={activeLoading}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border capitalize transition-all duration-150 ${
                    mappedRole === r
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                disabled={activeLoading}
                className="block w-full pl-10 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength visualization */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                  <span>Password Strength</span>
                  <span className="capitalize">{strengthText}</span>
                </div>
                <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strengthColor} transition-all duration-300`}
                    style={{ width: `${(strengthScore / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                disabled={activeLoading}
                className="block w-full pl-10 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={activeLoading}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-600/60 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2"
          >
            {activeLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Creating Profile...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>
      )}

      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Already registered?{' '}
          <button
            onClick={onSwitchToLogin}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-150"
          >
            Sign In here
          </button>
        </p>
      </div>
    </div>
  );
}
