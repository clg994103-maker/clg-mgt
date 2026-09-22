"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, authReady } from "../firebase/config";
import { getCurrentStudent, readStoredStudentProfile, StudentUser } from "./studentApi";
import { syncFirebaseUser } from "./firebaseAuth";

export function useStudentSession() {
  const [student, setStudent] = useState<StudentUser | null>(readStoredStudentProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        if (active) { setStudent(null); setLoading(false); }
        return;
      }
      void authReady.then(() => getCurrentStudent().catch(() => syncFirebaseUser(user))).then((nextStudent) => {
        if (active) { setStudent(nextStudent); setLoading(false); }
      }).catch(() => {
        if (active) { setStudent(null); setLoading(false); }
      });
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  return { student, loading, setStudent };
}
