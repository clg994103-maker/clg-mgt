import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAdminAuth() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson))
    : process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
      ? cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") })
      : null;
  if (!credential) throw new Error("Firebase Admin is not configured. Provide FIREBASE_SERVICE_ACCOUNT_JSON or Firebase credential variables.");
  const app = getApps()[0] ?? initializeApp({
    credential,
  });
  return getAuth(app);
}

export async function verifyFirebaseIdToken(idToken: string) {
  return getFirebaseAdminAuth().verifyIdToken(idToken);
}