// firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAPnJV25tIN1A9NU5vRWGnbxnZeEfCcmNo",
  authDomain: "sambag2-8663a.firebaseapp.com",
  databaseURL: "https://sambag2-8663a-default-rtdb.firebaseio.com",
  projectId: "sambag2-8663a",
  storageBucket: "sambag2-8663a.appspot.com",
  messagingSenderId: "991681556862",
  appId: "1:991681556862:web:2c4ac416abc2f9b388432f",
  measurementId: "G-PS7C8Y9EQ4"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);
export const auth = getAuth(app);
export const functions = getFunctions(app); 