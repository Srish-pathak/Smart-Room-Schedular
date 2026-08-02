import React, { useState } from 'react';
import { useAuth } from './useAuth';
import { Mail, Lock, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';

interface LoginProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
  isDarkMode: boolean;
  email?: string;
  setEmail?: (val: string) => void;
  password?: string;
  setPassword?: (val: string) => void;
  handleCredentialsLogin?: (e: React.FormEvent) => void;
  handleGoogleSignIn?: () => void;
  isLoggingIn?: boolean;
}

export function Login({
  onSwitchToRegister,
  onSwitchToForgotPassword,
  isDarkMode,
  email: propEmail,
  setEmail: propSetEmail,
  password: propPassword,
  setPassword: propSetPassword,
  handleCredentialsLogin,
  handleGoogleSignIn: propGoogleSignIn,
  isLoggingIn = false
}: LoginProps) {
  const { signIn, signInWithGoogle } = useAuth();
  const [localEmail, setLocalEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');

  const email = propEmail !== undefined ? propEmail : localEmail;
  const setEmail = propSetEmail !== undefined ? propSetEmail : setLocalEmail;
  const password = propPassword !== undefined ? propPassword : localPassword;
  const setPassword = propSetPassword !== undefined ? propSetPassword : setLocalPassword;

  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('rememberedEmail'));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeLoading = loading || isLoggingIn;

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('❌ Please provide your email address.');
      return;
    }
    if (!validateEmail(email)) {
      setError('❌ Email formatting is incorrect (e.g. name@iitbhu.ac.in).');
      return;
    }
    if (!password) {
      setError('❌ Please provide your account password.');
      return;
    }

    // Persist or clear email for Remember Me
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    if (handleCredentialsLogin) {
      try {
        await handleCredentialsLogin(e);
      } catch (err: any) {
        const errMsg = err.message || '';
        if (errMsg.includes('user-not-found') || errMsg.includes('auth/user-not-found') || errMsg.toLowerCase().includes('exist')) {
          setError('❌ This account doesn\'t exist. Would you like to create one? Click "Create Account" above.');
        } else {
          setError('❌ Email or password is incorrect. Please try again.');
        }
      }
    } else {
      setLoading(true);
      try {
        await signIn(email, password, rememberMe);
      } catch (err: any) {
        console.error(err);
        const errMsg = err.message || '';
        if (errMsg.includes('user-not-found') || errMsg.includes('auth/user-not-found') || errMsg.toLowerCase().includes('exist')) {
          setError('❌ This account doesn\'t exist. Would you like to create one? Click "Create Account" above.');
        } else {
          setError('❌ Email or password is incorrect. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignInClick = async () => {
    setError(null);
    if (propGoogleSignIn) {
      try {
        await propGoogleSignIn();
      } catch (err: any) {
        setError(err.message || 'Google Sign In failed.');
      }
    } else {
      setLoading(true);
      try {
        await signInWithGoogle();
      } catch (err: any) {
        console.error(err);
        if (err.code === 'auth/popup-blocked' || err.message?.includes('popup')) {
          setError('Google login popup was blocked. Please authorize popups or open the app in a new browser tab.');
        } else {
          setError(err.message || 'Google authentication was cancelled or failed.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-1 font-sans">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign In
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Enter credentials to access smart bookings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg border border-red-100 dark:border-red-950/30 bg-red-50/50 dark:bg-red-950/10 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Email Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
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
              placeholder="e.g. student@iitbhu.ac.in"
              required
              disabled={activeLoading}
              className="block w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={activeLoading}
              className="block w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="remember-me" className="ml-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Remember me on this browser
          </label>
        </div>

        <button
          type="submit"
          disabled={activeLoading}
          className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-600/60 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2"
        >
          {activeLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Checking Credentials...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>

        {/* Google Account Login Option directly after Sign In */}
        <div className="pt-2">
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              or continue with
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignInClick}
            disabled={activeLoading}
            className="w-full mt-1.5 py-2.5 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 active:bg-slate-200 dark:active:bg-slate-950 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 mr-1 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google Account</span>
          </button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          New to the portal?{' '}
          <button
            onClick={onSwitchToRegister}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-150"
          >
            Create account here
          </button>
        </p>
      </div>
    </div>
  );
}
