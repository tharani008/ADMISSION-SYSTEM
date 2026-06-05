import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBre0-hp2zuEesgla3PEQ62szmtvTN8Q5o",
    authDomain: "lasak-c1db5.firebaseapp.com",
    projectId: "lasak-c1db5",
    storageBucket: "lasak-c1db5.firebasestorage.app",
    messagingSenderId: "297000648833",
    appId: "1:297000648833:web:bf835ca2939a97c1444d80"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
