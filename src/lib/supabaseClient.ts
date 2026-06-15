import { createClient } from '@supabase/supabase-js';

// Helper to check if a string is a valid HTTP/HTTPS URL
const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Support both server and client-side env vars, including Vite injected globals and process env fallbacks
const SUPABASE_URL = 
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.SUPABASE_URL ||
  '';

const SUPABASE_ANON_KEY = 
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.SUPABASE_ANON_KEY ||
  '';

const hasConfigValues = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const urlIsValid = isValidUrl(SUPABASE_URL);

export const isSupabaseConfigured = hasConfigValues && urlIsValid;

let supabaseInstance: any = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('🔌 Client-Side Supabase client initialized and connected with URL:', SUPABASE_URL);
  } catch (err) {
    console.error('❌ Failed to initialize client-side Supabase client:', err);
    supabaseInstance = null;
  }
} else {
  console.warn('⚠️ Supabase URL or Anon key is missing or invalid. Dynamic fallback in full-stack Node.js Express proxy active.');
}

export const supabase = supabaseInstance;

type ErrorSubscriber = (message: string) => void;
const errorSubscribers = new Set<ErrorSubscriber>();

export function subscribeToSupabaseErrors(callback: ErrorSubscriber) {
  errorSubscribers.add(callback);
  return () => {
    errorSubscribers.delete(callback);
  };
}

export function reportSupabaseError(error: any, context?: string): Error {
  console.error(`[Supabase Error] Context: ${context || 'General'}:`, error);
  let userFriendlyMessage = 'An unexpected cloud database error occurred.';
  
  if (error) {
    if (typeof error === 'string') {
      userFriendlyMessage = error;
    } else if (error.message) {
      userFriendlyMessage = error.message;
    } else if (error.error_description) {
      userFriendlyMessage = error.error_description;
    } else if (typeof error === 'object') {
      userFriendlyMessage = error.message || JSON.stringify(error);
    }
  }

  let fullMessage = context ? `[Database ${context} Fail] ${userFriendlyMessage}` : userFriendlyMessage;

  errorSubscribers.forEach((cb) => {
    try {
      cb(fullMessage);
    } catch (e) {
      console.error('Error subscriber failed:', e);
    }
  });

  return new Error(userFriendlyMessage);
}


