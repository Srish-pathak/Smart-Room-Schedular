import { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { authService, UserProfile } from '../services/authService';
import { setSessionToken } from '../lib/api';

export interface AuthUser {
  uid: string;
  fullName: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  profilePhoto: string;
  createdAt?: string;
  lastLogin?: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'student' | 'faculty' | 'admin') => Promise<any>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signInWithSandboxBypass: (targetEmail: string) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [redirectChecking, setRedirectChecking] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const handleRedirectResult = async () => {
      // Check if redirect was pending
      const isRedirectPending = sessionStorage.getItem('auth_redirect_pending') === 'true';
      if (!isRedirectPending) {
        return;
      }

      setRedirectChecking(true);
      setAuthError(null);

      try {
        const result = await getRedirectResult(auth);
        if (result && active) {
          console.info('Successfully completed Google Redirect Authentication:', result.user.email);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const accessToken = credential?.accessToken || undefined;
          if (accessToken) {
            sessionStorage.setItem('google_workspace_access_token', accessToken);
          }
          await authService.processGoogleUser(result.user, accessToken);
        }
      } catch (error: any) {
        if (active) {
          console.error('Redirect sign-in error:', error);
          let friendlyMessage = 'Google Sign In failed.';
          if (error.code === 'auth/popup-blocked') {
            friendlyMessage = 'Popup was blocked by your browser. Please allow popups or open the app in a new tab.';
          } else if (error.code === 'auth/popup-closed-by-user') {
            friendlyMessage = 'Sign-in window was closed before completion.';
          } else if (error.code === 'auth/cancelled-popup-request') {
            friendlyMessage = 'Sign-in request was cancelled.';
          } else if (error.code === 'auth/network-request-failed') {
            friendlyMessage = 'Network error. Please check your internet connection and try again.';
          } else if (error.code === 'auth/unauthorized-domain') {
            friendlyMessage = `This domain ("${window.location.hostname}") is not authorized for Firebase Authentication. Please configure it in your Firebase Console (Auth -> Settings -> Authorized Domains).`;
          } else if (error.code === 'auth/operation-not-allowed') {
            friendlyMessage = 'Google Sign-In is disabled in your Firebase Auth Suite. Please enable Google under Sign-in Methods.';
          } else {
            friendlyMessage = error.message || 'An unexpected authentication error occurred.';
          }
          setAuthError(friendlyMessage);
        }
      } finally {
        sessionStorage.removeItem('auth_redirect_pending');
        if (active) {
          // Keep screen visible slightly longer for success state or let error persist until dismissed
          setTimeout(() => {
            if (active) {
              // If there was no error, clear checking. Otherwise, keep it visible so user can see error.
              if (!authError) {
                setRedirectChecking(false);
              }
            }
          }, 1000);
        }
      }
    };

    handleRedirectResult();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Listen for authentication state change
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        try {
          // Fetch additional details from Firestore
          const docRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(docRef);
          
          let resolvedRole: 'student' | 'faculty' | 'admin' = 'student';
          let resolvedName = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            
            // Sync isVerified in Firestore if it has been updated in Firebase Auth
            if (data.isVerified !== fbUser.emailVerified) {
              await updateDoc(docRef, { isVerified: fbUser.emailVerified });
              data.isVerified = fbUser.emailVerified;
            }

            resolvedRole = data.role || 'student';
            resolvedName = data.fullName || resolvedName;
          } else {
            // Document doesn't exist, create profile fallback
            const fallbackRole = fbUser.email?.toLowerCase().includes('admin') ? 'admin' : (fbUser.email?.toLowerCase().includes('faculty') ? 'faculty' : 'student');
            const fallbackName = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
            
            const userProfile: UserProfile = {
              uid: fbUser.uid,
              fullName: fallbackName,
              email: (fbUser.email || '').toLowerCase(),
              role: fallbackRole,
              profilePhoto: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fallbackName)}`,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              isVerified: fbUser.emailVerified
            };

            await setDoc(docRef, userProfile);

            resolvedRole = fallbackRole;
            resolvedName = fallbackName;
          }

          // Generate client-side local session token for components expecting it
          const localToken = btoa(JSON.stringify({
            uid: fbUser.uid,
            id: fbUser.uid,
            fullName: resolvedName,
            name: resolvedName,
            email: fbUser.email || '',
            role: resolvedRole,
            isVerified: fbUser.emailVerified
          }));
          setSessionToken(localToken, true);

          setUser({
            uid: fbUser.uid,
            fullName: resolvedName,
            email: fbUser.email || '',
            role: resolvedRole,
            profilePhoto: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(resolvedName)}`,
            isVerified: fbUser.emailVerified
          });

        } catch (error: any) {
          const isOffline = error && (error.message?.includes('offline') || error.code === 'unavailable');
          if (isOffline) {
            console.warn('Firebase client is offline/unreachable in AuthProvider. Falling back gracefully to offline user profile.', error);
          } else {
            console.error('Error fetching/setting user profile in AuthProvider:', error);
          }
          const fallbackRole = fbUser.email?.toLowerCase().includes('admin') ? 'admin' : 'student';
          const fallbackName = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';

          const localToken = btoa(JSON.stringify({
            uid: fbUser.uid,
            id: fbUser.uid,
            fullName: fallbackName,
            name: fallbackName,
            email: fbUser.email || '',
            role: fallbackRole,
            isVerified: fbUser.emailVerified
          }));
          setSessionToken(localToken, true);

          setUser({
            uid: fbUser.uid,
            fullName: fallbackName,
            email: fbUser.email || '',
            role: fallbackRole === 'admin' ? 'admin' : 'student',
            profilePhoto: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fbUser.uid)}`,
            isVerified: fbUser.emailVerified
          });
        }
      } else {
        setUser(null);
        setSessionToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: 'student' | 'faculty' | 'admin') => {
    setLoading(true);
    try {
      const result = await authService.signUp(email, password, fullName, role);
      setFirebaseUser(result.firebaseUser);
      setUser({
        uid: result.firebaseUser.uid,
        fullName,
        email,
        role,
        profilePhoto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName)}`,
        isVerified: result.firebaseUser.emailVerified
      });
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    setLoading(true);
    try {
      const result = await authService.signIn(email, password, rememberMe);
      setFirebaseUser(result.firebaseUser);
      setUser({
        uid: result.firebaseUser.uid,
        fullName: result.userProfile.fullName,
        email: result.userProfile.email,
        role: result.userProfile.role,
        profilePhoto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(result.userProfile.fullName)}`,
        isVerified: result.firebaseUser.emailVerified
      });
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      if (result && (result as any).isRedirecting) {
        return result;
      }
      setFirebaseUser(result.firebaseUser);
      setUser({
        uid: result.firebaseUser.uid,
        fullName: result.userProfile.fullName,
        email: result.userProfile.email,
        role: result.userProfile.role,
        profilePhoto: result.firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(result.userProfile.fullName)}`,
        isVerified: result.firebaseUser.emailVerified
      });
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setFirebaseUser(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  const signInWithSandboxBypass = async (targetEmail: string) => {
    setLoading(true);
    try {
      const result = await authService.signInWithSandboxBypass(targetEmail);
      setFirebaseUser(result.firebaseUser);
      setUser({
        uid: result.userProfile.uid,
        fullName: result.userProfile.fullName,
        email: result.userProfile.email,
        role: result.userProfile.role,
        profilePhoto: result.userProfile.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(result.userProfile.fullName)}`,
        isVerified: result.userProfile.isVerified
      });
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    await authService.sendEmailVerification();
  };

  const refreshUser = async () => {
    const fbUser = auth.currentUser;
    if (fbUser) {
      await fbUser.reload();
      setFirebaseUser(fbUser);
      
      const docRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(docRef);
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        setUser({
          uid: fbUser.uid,
          fullName: data.fullName || fbUser.displayName || 'User',
          email: fbUser.email || '',
          role: data.role || 'student',
          profilePhoto: data.profilePhoto || fbUser.photoURL || '',
          isVerified: fbUser.emailVerified
        });
      }
    }
  };

  const value = {
    user,
    firebaseUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithSandboxBypass,
    logout,
    resetPassword,
    sendVerificationEmail,
    refreshUser
  };

  if (redirectChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Abstract Architectural Tech Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
        
        {/* Floating Ambient Glowing Elements */}
        <div className="absolute -top-12 -left-12 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              {authError ? (
                <svg className="w-8 h-8 text-red-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white font-sans">
              {authError ? 'Authentication Notice' : 'Verifying Google Authentication'}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              {authError ? authError : "Securely synchronizing your smart portal session. Please don't close or reload this window."}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/60 space-y-3">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              IIT (BHU) Varanasi Smart Portal
            </div>
            {authError && (
              <button
                onClick={() => {
                  setRedirectChecking(false);
                  setAuthError(null);
                }}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-md hover:shadow-indigo-500/10 cursor-pointer"
              >
                Go back to Sign In
              </button>
            )}
            <button
              onClick={() => {
                // Open app in new tab to completely bypass iframe constraints
                window.open(window.location.origin, '_blank');
              }}
              className="w-full py-2 px-4 border border-slate-800 hover:bg-slate-900/60 text-slate-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer"
            >
              Open in New Tab (Bypasses iframe sandbox)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
