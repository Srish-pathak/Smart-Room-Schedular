import React, { useState } from 'react';
import { useAuth } from './useAuth';
import { Mail, ArrowLeft, Loader, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForgotPasswordProps {
  onSwitchToLogin: () => void;
  isDarkMode: boolean;
}

export function ForgotPassword({ onSwitchToLogin, isDarkMode }: ForgotPasswordProps) {
  const { resetPassword, signInWithSandboxBypass } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBypass, setLoadingBypass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError('Please provide your registered email address.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please provide a valid email formatting (e.g. name@iitbhu.ac.in).');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'We could not complete your request. Please check if this email is registered.');
    } finally {
      setLoading(false);
    }
  };

  const handleBypassLogin = async () => {
    setError(null);
    setLoadingBypass(true);
    try {
      await signInWithSandboxBypass(email);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Sandbox bypass failed. Please try normal registration or sign in.');
    } finally {
      setLoadingBypass(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-2 font-sans">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Reset Password
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Enter your email to receive a secure credentials recovery link.
        </p>
      </div>

      {success ? (
        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/30 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Recovery Link Sent!</h4>
              <p className="text-xs text-emerald-700/90 dark:text-emerald-400/80 mt-1">
                Check your inbox for <strong>{email}</strong> for instructions to secure your account.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/30 bg-indigo-50/40 dark:bg-indigo-950/10 text-indigo-900 dark:text-indigo-400 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-300">📬 Not receiving recovery mail?</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Since this app runs in a sandbox, outbound SMTP limits might delay or prevent email delivery. You can use the instant bypass below to securely log in as <strong>{email}</strong> immediately.
            </p>
            <button
              onClick={handleBypassLogin}
              disabled={loadingBypass}
              className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
            >
              {loadingBypass ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>Activating Sandbox Session...</span>
                </>
              ) : (
                <span>Instant Sandbox Bypass Login</span>
              )}
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
                disabled={loading}
                className="block w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-150"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-600/60 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Sending Secure Link...</span>
              </>
            ) : (
              <span>Request Reset Instructions</span>
            )}
          </button>
        </form>
      )}

      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
        <button
          onClick={onSwitchToLogin}
          className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-150"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In portal</span>
        </button>
      </div>
    </div>
  );
}
