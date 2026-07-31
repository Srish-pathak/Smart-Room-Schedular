import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { isRunningInIframe } from './authService';

export const GoogleAuthService = {
  // Scopes required for calendar events sync
  scopes: [
    'https://www.googleapis.com/auth/calendar.events'
  ],

  /**
   * Retrieves the access token from sessionStorage or Firestore if needed.
   * Silently refreshes/re-loads the token when necessary.
   */
  async getAccessToken(): Promise<string | null> {
    // 1. Check session storage first (fastest)
    let token = sessionStorage.getItem('google_workspace_access_token');
    
    // 2. Check Firestore if not found in session storage
    if ((!token || token === 'mock_google_workspace_token') && auth.currentUser) {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data && data.googleAccessToken) {
            token = data.googleAccessToken;
            sessionStorage.setItem('google_workspace_access_token', token);
          }
        }
      } catch (err) {
        console.warn('[GoogleAuthService] Failed to load token from Firestore:', err);
      }
    }

    return token;
  },

  /**
   * Checks if Google connection is active.
   */
  async isConnected(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token && token !== 'mock_google_workspace_token';
  },

  /**
   * Removes Google OAuth credentials from user session and Firestore.
   */
  async disconnect(): Promise<void> {
    sessionStorage.removeItem('google_workspace_access_token');
    if (auth.currentUser) {
      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, {
          googleAccessToken: null,
          googleTokenTimestamp: null,
          googleConnected: false,
          calendarConnected: false
        });
      } catch (err) {
        console.warn('[GoogleAuthService] Failed to clear Firestore google tokens:', err);
      }
    }
    // Dispatch a custom event to notify components
    window.dispatchEvent(new CustomEvent('google-token-invalid'));
  },

  /**
   * Triggers the Google Sign-In / Scope authorization popup or redirect flow.
   */
  async authorize(customPrompt = 'consent'): Promise<string | null> {
    const provider = new GoogleAuthProvider();
    this.scopes.forEach(scope => provider.addScope(scope));
    provider.setCustomParameters({ prompt: customPrompt });

    try {
      if (isRunningInIframe()) {
        sessionStorage.setItem('auth_redirect_pending', 'true');
        await signInWithRedirect(auth, provider);
        return null;
      } else {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken || null;
        if (accessToken) {
          sessionStorage.setItem('google_workspace_access_token', accessToken);
          if (auth.currentUser) {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userDocRef, {
              googleAccessToken: accessToken,
              googleTokenTimestamp: Date.now(),
              googleConnected: true,
              calendarConnected: true
            });
          }
        }
        return accessToken;
      }
    } catch (error) {
      console.error('[GoogleAuthService] Scope authorization failed:', error);
      throw error;
    }
  },

  /**
   * Process results after a redirect sign-in.
   */
  async handleRedirectResult(): Promise<string | null> {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken || null;
        if (accessToken) {
          sessionStorage.setItem('google_workspace_access_token', accessToken);
          if (auth.currentUser) {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userDocRef, {
              googleAccessToken: accessToken,
              googleTokenTimestamp: Date.now(),
              googleConnected: true,
              calendarConnected: true
            });
          }
          return accessToken;
        }
      }
    } catch (error) {
      console.error('[GoogleAuthService] Handle redirect failed:', error);
    }
    return null;
  }
};
