export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ⚠️ ${message}`, ...args);
  },
  error: (message: string, error?: any, ...args: any[]) => {
    console.error(`[ERROR] ❌ ${message}`, error || '', ...args);
  }
};
