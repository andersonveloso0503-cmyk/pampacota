import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgk3ii5g5v0sU_-kXwARFr4VXI4tUcEbY",
  authDomain: "fornecedorrs-763b8.firebaseapp.com",
  projectId: "fornecedorrs-763b8",
  storageBucket: "fornecedorrs-763b8.firebasestorage.app",
  messagingSenderId: "567638975781",
  appId: "1:567638975781:web:489f3d3385b59a673e26cc",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
