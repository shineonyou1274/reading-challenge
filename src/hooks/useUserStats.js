import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getLevelFromXP, getTitleForLevel } from '../utils/rpg';

export function useUserStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // MOCK MODE: If Firebase keys are not set, provide a demo user for UI testing
        if (import.meta.env.VITE_FIREBASE_API_KEY === "YOUR_API_KEY" || !import.meta.env.VITE_FIREBASE_API_KEY) {
            console.warn("Firebase config missing. Running in MOCK MODE for UI demonstration.");
            setTimeout(() => {
                setStats({
                    uid: 'mock_user_123',
                    displayName: 'Imperial Prospect',
                    totalXp: 1250,
                    gold: 450,
                    streak: 3,
                    level: 2,
                    currentXp: 250,
                    xpLimit: 1200,
                    title: 'Novice Archivist',
                    onboardingCompleted: false, // Testing coronation
                });
                setLoading(false);
            }, 1500);
            return;
        }

        const unsubscribeAuth = auth.onAuthStateChanged(user => {
            if (!user) {
                setStats(null);
                setLoading(false);
                return;
            }

            const userRef = doc(db, 'users', user.uid);
            const unsubStats = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const { level, currentXp, xpLimit } = getLevelFromXP(data.totalXp || 0);
                    setStats({
                        ...data,
                        level,
                        currentXp,
                        xpLimit,
                        title: getTitleForLevel(level)
                    });
                } else {
                    // Initialize user if not exists
                    const initialData = {
                        uid: user.uid,
                        displayName: `New Scholar`,
                        totalXp: 0,
                        gold: 0,
                        streak: 0,
                        lastRead: null,
                        joinedAt: serverTimestamp(),
                        classId: 'scholar', // default
                    };
                    setDoc(userRef, initialData);
                }
                setLoading(false);
            });

            return () => unsubStats();
        });

        return () => unsubscribeAuth();
    }, []);

    const refresh = () => {
        if (stats?.uid === 'mock_user_123' || stats?.uid === 'demo') {
            setStats(prev => ({ ...prev, onboardingCompleted: true }));
        }
    };

    return { stats, loading, refresh };
}
