import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// Add all requested Workspace scopes
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/forms.body');
provider.addScope('https://www.googleapis.com/auth/chat.spaces.readonly');
provider.addScope('https://www.googleapis.com/auth/chat.messages.create');

// Force consent prompt so the user can verify and approve the newly registered Workspace scopes
provider.setCustomParameters({
  prompt: 'consent'
});

let isSigningIn = false;
let lastSignInTime = 0;
let cachedAccessToken: string | null = sessionStorage.getItem('google_workspace_access_token');

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = sessionStorage.getItem('google_workspace_access_token');
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('google_workspace_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Reset function if needed
export const resetGoogleSignInLock = () => {
  isSigningIn = false;
  lastSignInTime = 0;
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  const now = Date.now();
  if (isSigningIn && (now - lastSignInTime < 4000)) {
    throw new Error('A Google authentication request is already in progress. Please check if a popup window has already opened, or allow popups and try again.');
  }
  
  try {
    isSigningIn = true;
    lastSignInTime = now;
    
    // Check if running in an iframe context
    const isIframe = window.self !== window.top;
    if (isIframe) {
      console.warn("Firebase Auth in an iframe may trigger popup blockers. Recommend 'Open in New Tab' flow.");
    }

    const signInPromise = signInWithPopup(auth, provider);
    const timeoutPromise = new Promise<never>((_, reject) => {
      const err: any = new Error('Firebase Auth operation timed out. If you are taking standard steps to select an account, please try again. If the popup didn\'t open at all, ensure popups are permitted or click the "Open in New Tab" button in the upper right.');
      err.code = 'auth/popup-blocked';
      setTimeout(() => reject(err), 120000); // Expanded timeout to 120 seconds
    });

    const result = await Promise.race([signInPromise, timeoutPromise]);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('google_workspace_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('The login popup was closed or cancelled. To bypass Google AI Studio iframe sandbox rules, please open the app in a new tab.');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('The login popup was closed before completion. If you are inside the Google AI Studio sandbox iframe, please choose Dynamic Demo Mode, or click "Open in New Tab" in the top right.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('The Google login popup was blocked by your browser. Please click the "Open in New Tab" button in the top right to link your account or choose Demo Mode.');
    } else if (error.code === 'auth/internal-error') {
      throw new Error('Internal Firebase authentication error within the sandbox. Try logging in after opening the app in its own tab, or check Firebase settings.');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error(`Unauthorized Domain: The current domain "${window.location.hostname}" is not authorized in your Firebase console. Please add it under: Firebase Auth -> Settings -> Authorized Domains.`);
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Operation Not Allowed: Google Sign-index Provider is disabled in your Firebase Auth suite. Please enable Google under Authentication -> Sign-in Method.');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = sessionStorage.getItem('google_workspace_access_token');
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  sessionStorage.removeItem('google_workspace_access_token');
};
