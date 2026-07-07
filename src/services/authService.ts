import { 
  createUserWithEmailAndPassword as fbCreateUser,
  signInWithEmailAndPassword as fbSignIn,
  signOut as fbSignOut,
  sendPasswordResetEmail as fbSendReset,
  sendEmailVerification as fbSendVerification,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { setSessionToken } from '../lib/api';

export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  profilePhoto: string;
  createdAt: any;
  lastLogin: any;
  isVerified: boolean;
}

export const authService = {
  /**
   * Registers a user with Firebase Auth and creates their profile in Firestore.
   */
  async signUp(email: string, password: string, fullName: string, role: 'student' | 'faculty' | 'admin') {
    try {
      // 1. Create User in Firebase Auth
      const userCredential = await fbCreateUser(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth display name
      await updateProfile(user, { displayName: fullName });

      // 2. Create User Profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        fullName,
        email: email.toLowerCase(),
        role,
        profilePhoto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName)}`,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isVerified: user.emailVerified
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);

      // 3. Send email verification
      try {
        await fbSendVerification(user);
      } catch (verifyErr) {
        console.warn('Failed to send verification email:', verifyErr);
      }

      // Generate a client-side session token representing the user
      const localToken = btoa(JSON.stringify({
        uid: user.uid,
        id: user.uid,
        fullName,
        name: fullName,
        email: email.toLowerCase(),
        role,
        isVerified: user.emailVerified
      }));
      setSessionToken(localToken, true);

      return {
        firebaseUser: user,
        userProfile,
        syncResponse: { token: localToken, user: userProfile }
      };
    } catch (error: any) {
      console.error('Sign Up Error in authService:', error);
      throw error;
    }
  },

  /**
   * Signs in a user with Firebase Auth and updates their last login in Firestore.
   */
  async signIn(email: string, password: string, rememberMe: boolean = false) {
    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await fbSignIn(auth, email, password);
      const user = userCredential.user;
      let fullName = user.displayName || email.split('@')[0];
      let role: 'student' | 'faculty' | 'admin' = 'student';

      // 2. Load and Update profile in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      let userProfile: UserProfile;

      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile;
        role = profileData.role || 'student';
        fullName = profileData.fullName || fullName;

        userProfile = {
          ...profileData,
          lastLogin: new Date().toISOString(),
          isVerified: user.emailVerified
        };

        // Update lastLogin and isVerified
        await updateDoc(userDocRef, {
          lastLogin: userProfile.lastLogin,
          isVerified: userProfile.isVerified
        });
      } else {
        // Auto-onboard into Firestore if profile is missing
        role = email.toLowerCase().includes('admin') ? 'admin' : (email.toLowerCase().includes('faculty') ? 'faculty' : 'student');
        userProfile = {
          uid: user.uid,
          fullName,
          email: email.toLowerCase(),
          role,
          profilePhoto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName)}`,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isVerified: user.emailVerified
        };
        await setDoc(userDocRef, userProfile);
      }

      // Generate a client-side session token representing the user
      const localToken = btoa(JSON.stringify({
        uid: user.uid,
        id: user.uid,
        fullName: userProfile.fullName,
        name: userProfile.fullName,
        email: userProfile.email,
        role: userProfile.role,
        isVerified: userProfile.isVerified
      }));
      setSessionToken(localToken, rememberMe);

      return {
        firebaseUser: user,
        userProfile,
        syncResponse: { token: localToken, user: userProfile }
      };
    } catch (error: any) {
      console.error('Sign In Error in authService:', error);
      throw error;
    }
  },

  /**
   * Processes a Google User credential to sync/onboard them in Firestore and set session tokens.
   */
  async processGoogleUser(user: FirebaseUser) {
    let role: 'student' | 'faculty' | 'admin' = 'student';
    let fullName = user.displayName || user.email?.split('@')[0] || 'Google User';
    const email = user.email || '';

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    let userProfile: UserProfile;

    if (userDoc.exists()) {
      const profileData = userDoc.data() as UserProfile;
      role = profileData.role || 'student';
      fullName = profileData.fullName || fullName;

      userProfile = {
        ...profileData,
        lastLogin: new Date().toISOString(),
        isVerified: user.emailVerified
      };

      await updateDoc(userDocRef, {
        lastLogin: userProfile.lastLogin,
        isVerified: userProfile.isVerified,
        googleConnected: true,
        calendarConnected: true
      });
    } else {
      // Setup default role for Google users
      role = email.toLowerCase().includes('admin') ? 'admin' : (email.toLowerCase().includes('faculty') ? 'faculty' : 'student');
      userProfile = {
        uid: user.uid,
        fullName,
        email: email.toLowerCase(),
        role,
        profilePhoto: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName)}`,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isVerified: user.emailVerified
      };
      await setDoc(userDocRef, userProfile);
    }

    // Generate a client-side session token representing the user
    const localToken = btoa(JSON.stringify({
      uid: user.uid,
      id: user.uid,
      fullName: userProfile.fullName,
      name: userProfile.fullName,
      email: userProfile.email,
      role: userProfile.role,
      isVerified: userProfile.isVerified
    }));
    setSessionToken(localToken, true);

    return {
      firebaseUser: user,
      userProfile,
      syncResponse: { token: localToken, user: userProfile }
    };
  },

  /**
   * Authenticates with Google and provisions/updates user profile in Firestore.
   */
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      if (isRunningInIframe()) {
        sessionStorage.setItem('auth_redirect_pending', 'true');
        await signInWithRedirect(auth, provider);
        // Direct flow to signInWithRedirect redirects the window, return dynamic pending state
        return { isRedirecting: true } as any;
      } else {
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;
        return await this.processGoogleUser(user);
      }
    } catch (error: any) {
      console.error('Google Sign In Error in authService:', error);
      throw error;
    }
  },

  /**
   * Logs out from Firebase and clears local tokens.
   */
  async logout() {
    try {
      await fbSignOut(auth);
      setSessionToken(null);
    } catch (error) {
      console.error('Logout error in authService:', error);
      throw error;
    }
  },

  /**
   * Triggers Password Reset email from Firebase.
   */
  async resetPassword(email: string) {
    try {
      await fbSendReset(auth, email);
    } catch (error) {
      console.error('Password reset error in authService:', error);
      throw error;
    }
  },

  /**
   * Resends email verification to the currently active user.
   */
  async sendEmailVerification() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user is currently signed in.');
      }
      await fbSendVerification(user);
    } catch (error) {
      console.error('Email verification error in authService:', error);
      throw error;
    }
  },

  /**
   * Fetches user profile from Firestore.
   */
  async getProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error: any) {
      const isOffline = error && (error.message?.includes('offline') || error.code === 'unavailable');
      if (isOffline) {
        console.warn('Get profile failed because Firebase is offline in authService.', error);
      } else {
        console.error('Get profile error in authService:', error);
      }
      return null;
    }
  }
};
