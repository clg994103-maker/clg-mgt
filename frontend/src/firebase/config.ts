import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCR4t2w0prV0BBW5VX0OLuRP_IBRm8VF2Y",
  authDomain: "clg-mgt-e13a8.firebaseapp.com",
  projectId: "clg-mgt-e13a8",
  storageBucket: "clg-mgt-e13a8.firebasestorage.app",
  messagingSenderId: "736518052995",
  appId: "1:736518052995:web:624c99de987617d9884fb6",
  measurementId: "G-12QDNR14MR",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export default app;