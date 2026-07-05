export const cleanEnvVar = (val: string): string => {
  if (!val) return '';
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (cleaned.startsWith('SUPABASE_URL=')) {
    cleaned = cleaned.slice('SUPABASE_URL='.length).trim();
  }
  if (cleaned.startsWith('SUPABASE_ANON_KEY=')) {
    cleaned = cleaned.slice('SUPABASE_ANON_KEY='.length).trim();
  }
  return cleaned;
};

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'iitbhu-smart-jwt-key-2026',
  
  SUPABASE_URL: cleanEnvVar(process.env.SUPABASE_URL || ''),
  SUPABASE_ANON_KEY: cleanEnvVar(process.env.SUPABASE_ANON_KEY || ''),
  
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || '"IIT BHU Room Booking" <no-reply@iitbhu.ac.in>',
  
  NODE_ENV: process.env.NODE_ENV || 'development'
};
