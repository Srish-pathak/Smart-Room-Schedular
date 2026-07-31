import { 
  signInWithPopup, 
  signInWithRedirect,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase/firebase';
export { auth };

const provider = new GoogleAuthProvider();

// Add all requested Workspace scopes
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
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
      console.warn("Firebase Auth in an iframe. Redirecting...");
      sessionStorage.setItem('auth_redirect_pending', 'true');
      await signInWithRedirect(auth, provider);
      return null;
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

    if (result.user) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase/firebase');
        await setDoc(doc(db, 'users', result.user.uid), {
          googleAccessToken: cachedAccessToken,
          googleTokenTimestamp: Date.now(),
          googleConnected: true,
          calendarConnected: true,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fErr) {
        console.warn('Failed to persist Google token to Firestore:', fErr);
      }
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const isStandardSandboxBlock = 
      error.code === 'auth/popup-blocked' || 
      error.code === 'auth/cancelled-popup-request' || 
      error.code === 'auth/popup-closed-by-user' ||
      (error.message && (
        error.message.toLowerCase().includes('timeout') || 
        error.message.toLowerCase().includes('timed out') ||
        error.message.toLowerCase().includes('popup')
      ));

    if (isStandardSandboxBlock) {
      console.warn('Sandbox Sign in Notice:', error.message || error);
    } else {
      console.warn('Sign in unexpected error:', error);
    }
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
  let token = sessionStorage.getItem('google_workspace_access_token');
  if (!token && auth.currentUser) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase/firebase');
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(docRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data && data.googleAccessToken) {
          token = data.googleAccessToken;
          sessionStorage.setItem('google_workspace_access_token', token);
        }
      }
    } catch (err) {
      console.warn('Failed to retrieve Google Access Token from Firestore:', err);
    }
  }
  return token;
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
  sessionStorage.removeItem('google_workspace_access_token');
};

export const logout = async () => {
  await auth.signOut();
  clearAccessToken();
};

export const firebaseRegisterWithEmailAndPassword = async (email: string, name: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: name });
    return user;
  } catch (error: any) {
    console.warn('Firebase Email/Password Signup Notice:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already registered in Firebase.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('The email address is invalid.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('The password is too weak. Please use at least 6 characters.');
    }
    throw new Error(error.message || 'Firebase email/password signup failed.');
  }
};

export const firebaseSignInWithEmailAndPassword = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.warn('Firebase Email/Password Signin Notice:', error);
    
    // Auto-onboard/register if the user does not exist or if we get invalid-credential
    const lowerEmail = email.toLowerCase();
    if (
      lowerEmail === 'admin@iitbhu.ac.in' || 
      lowerEmail === 'student@iitbhu.ac.in' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-credential' ||
      error.message?.includes('user-not-found') ||
      error.message?.includes('invalid-credential')
    ) {
      try {
        console.info('Attempting seamless auto-registration for testing:', email);
        const name = lowerEmail.includes('admin') ? 'Prof. Rajeev (Admin)' : 'Abishek (User)';
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        return user;
      } catch (signUpError: any) {
        // If they already exist, then the original signin failed because of a wrong password
        if (signUpError.code === 'auth/email-already-in-use') {
          throw new Error('Invalid password for this registered email.');
        }
        // Otherwise, propagate the signup error
        throw signUpError;
      }
    }

    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password credentials. Please register or double check password.');
    }
    throw new Error(error.message || 'Firebase email/password signin failed.');
  }
};
