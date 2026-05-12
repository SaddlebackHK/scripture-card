import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { firebaseEnv } from '@infrastructure/config/env';

// Single FirebaseApp instance for the process. `getApps()` guard makes this HMR-safe
// and idempotent under tests where modules may be re-evaluated.
const existing = getApps()[0];

export const firebaseApp: FirebaseApp =
  existing ??
  initializeApp({
    apiKey: firebaseEnv.apiKey,
    authDomain: firebaseEnv.authDomain,
    projectId: firebaseEnv.projectId,
    storageBucket: firebaseEnv.storageBucket,
    messagingSenderId: firebaseEnv.messagingSenderId,
    appId: firebaseEnv.appId,
  });
