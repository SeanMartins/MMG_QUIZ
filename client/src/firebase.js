import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase's client-side config (including apiKey) is not a secret — it
// identifies the project, it ships in every browser's JS bundle regardless,
// and access is actually governed by Firebase Security Rules, not by
// keeping this hidden. It still lives in an env file (not hardcoded here)
// to follow standard practice and avoid noisy secret-scanner false positives.
// See: https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
