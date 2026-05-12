// Validated, typed access to import.meta.env. Fails fast at module load if a required
// var is missing so misconfiguration surfaces immediately instead of as a runtime null.

const env = import.meta.env as Readonly<Record<string, string | undefined>>;

const requireEnv = (key: string): string => {
  const value = env[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Copy .env.example to .env.local and fill in the value.`,
    );
  }
  return value;
};

export interface FirebaseEnv {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly messagingSenderId: string;
  readonly appId: string;
}

export const firebaseEnv: FirebaseEnv = {
  apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('VITE_FIREBASE_APP_ID'),
};
