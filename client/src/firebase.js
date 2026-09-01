import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDFli8CWon5kvgMd4HwcsJS-nFjqKdabiE',
  authDomain: 'mmg-quiz.firebaseapp.com',
  projectId: 'mmg-quiz',
  storageBucket: 'mmg-quiz.firebasestorage.app',
  messagingSenderId: '766009351166',
  appId: '1:766009351166:web:83721dad327a27ebfdfeaf',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
