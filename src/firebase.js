import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, enableIndexedDbPersistence, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useEffect, useState, createContext, useContext, useRef } from 'react';
import { getUserProfile } from './services/firestoreService';

const defaultFirebaseConfig = {
    apiKey: "AIzaSyB66h7I1mfB2Hc3c_Isr1nGiRWM9fUVusY",
    authDomain: "dg-caddy-notes.firebaseapp.com",
    projectId: "dg-caddy-notes",
    storageBucket: "dg-caddy-notes.firebasestorage.app",
    messagingSenderId: "307990631756",
    appId: "1:307990631756:web:240ca7aeeb0f419c7e2be9",
    measurementId: "G-1TD0VQ5CT9"
};

let firebaseConfig = defaultFirebaseConfig;

if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
        const parsedConfig = JSON.parse(__firebase_config);
        if (Object.keys(parsedConfig).length > 0 && parsedConfig.projectId) {
            firebaseConfig = parsedConfig;
            console.log("DEBUG: Using Firebase config from Canvas environment.");
        } else {
            console.warn("DEBUG: Canvas __firebase_config was empty or invalid, falling back to default config.");
        }
    } catch (e) {
        console.error("DEBUG: Failed to parse __firebase_config from Canvas, falling back to default config:", e);
    }
} else {
    console.warn("DEBUG: Canvas __firebase_config not defined or empty, falling back to default config.");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

try {
    enableIndexedDbPersistence(db)
        .then(() => {
            console.log('DEBUG: Firestore offline persistence enabled!');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('DEBUG: Firestore persistence failed: Multiple tabs open or another instance already enabled persistence.');
            } else if (err.code === 'unimplemented') {
                console.warn('DEBUG: Firestore persistence failed: Browser does not support persistence.');
            } else {
                console.error('DEBUG: Firestore persistence failed:', err);
            }
        });
} catch (error) {
    console.warn('DEBUG: Firestore persistence attempt failed (likely already initialized or not supported):', error);
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const useFirebase = (onLoginSuccess, onLogoutSuccess) => {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const isInitialAuthCheckDone = useRef(false);

    useEffect(() => {
        let unsubscribeAuth;

        const setupAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                    console.log("DEBUG useFirebase: Signed in with custom token.");
                }

                unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
                    if (currentUser) {
                        console.log("DEBUG useFirebase: onAuthStateChanged - User UID:", currentUser.uid);

                        const profileData = await getUserProfile(currentUser.uid);

                        // ✨ FIX: Modify the original currentUser object instead of creating a new one.
                        // This preserves all built-in methods like getIdToken().
                        const userWithProfile = currentUser;

                        if (profileData && profileData.displayName) {
                            userWithProfile.displayName = profileData.displayName;
                            console.log("DEBUG useFirebase: Fetched custom display name from profile:", userWithProfile.displayName);
                        } else {
                            console.log("DEBUG useFirebase: User profile not found in Firestore for UID:", currentUser.uid);
                        }

                        userWithProfile.role = profileData?.role || 'non-player';
                        userWithProfile.teamIds = profileData?.teamIds || [];

                        setUser(userWithProfile);

                        if (isInitialAuthCheckDone.current && typeof onLoginSuccess === 'function') {
                            console.log("DEBUG useFirebase: Triggering onLoginSuccess callback.");
                            onLoginSuccess(currentUser.uid);
                        }

                    } else {
                        console.log("DEBUG useFirebase: onAuthStateChanged - User signed out.");
                        setUser(null);
                        if (isInitialAuthCheckDone.current && typeof onLogoutSuccess === 'function') {
                            console.log("DEBUG useFirebase: Triggering onLogoutSuccess callback.");
                            onLogoutSuccess();
                        }
                    }
                    setIsAuthReady(true);
                    isInitialAuthCheckDone.current = true;
                });

            } catch (error) {
                console.error("DEBUG useFirebase: Firebase Auth setup error:", error);
                setIsAuthReady(true);
                isInitialAuthCheckDone.current = true;
            }
        };

        setupAuth();

        return () => {
            if (unsubscribeAuth) {
                unsubscribeAuth();
            }
        };
    }, []);

    const signInWithGoogle = async () => {
        try {
            const userCredential = await signInWithPopup(auth, googleProvider);
            console.log("DEBUG: Signed in with Google successfully!");
            return userCredential;
        } catch (error) {
            console.error("DEBUG: Error signing in with Google:", error);
            throw error;
        }
    };

    const returnedValue = {
        db,
        auth,
        user,
        userId: user ? user.uid : null,
        isAuthReady,
        signInWithEmailAndPassword: (email, password) => signInWithEmailAndPassword(auth, email, password),
        createUserWithEmailAndPassword: (email, password) => createUserWithEmailAndPassword(auth, email, password),
        signOut: () => signOut(auth),
        signInWithGoogle
    };

    return returnedValue;
};

export { db, auth };
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';