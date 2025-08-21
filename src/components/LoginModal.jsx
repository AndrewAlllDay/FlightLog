// src/components/LoginModal.jsx
import React, { useState, useEffect } from 'react';
import { useFirebase } from '../firebase';
import { setUserProfile, getUserProfile } from '../services/firestoreService';
import GoogleLogoUrl from '../assets/google-logo.svg';
import * as Dialog from '@radix-ui/react-dialog';

function LoginModal({ isOpen, onClose }) {
    const {
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signInWithGoogle,
        user,
        isAuthReady,
        auth
    } = useFirebase();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayNameInput, setDisplayNameInput] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [appMessage, setAppMessage] = useState({ type: '', text: '' });

    const showLocalAppMessage = (type, text) => {
        setAppMessage({ type, text });
        setTimeout(() => {
            setAppMessage({ type: '', text: '' });
        }, 5000);
    };

    const isFormValid = email.trim() !== '' && password.trim() !== '';

    // Removed the useEffect that caused a 1-second delay in closing the modal.
    // The modal will now close immediately when the user state updates in App.jsx
    // and App.jsx calls onClose.

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        showLocalAppMessage('', ''); // Clear previous messages

        if (!isFormValid || (isRegistering && displayNameInput.trim() === '')) {
            setError('Please fill in all required fields.');
            return;
        }

        console.log("DEBUG LoginModal handleAuth: Calling auth functions with:", {
            authInstance: auth,
            signInFunc: signInWithEmailAndPassword,
            createFunc: createUserWithEmailAndPassword
        });

        try {
            if (isRegistering) {
                const userCredential = await createUserWithEmailAndPassword(email, password);
                const uid = userCredential.user.uid;
                await setUserProfile(uid, {
                    displayName: displayNameInput.trim(),
                    email: email.trim(),
                    role: 'player' // Default role for new registrations
                });
                showLocalAppMessage('success', 'Registration successful! You are now logged in.');
                console.log("DEBUG LoginModal: Registered and created profile for UID:", uid);

            } else {
                await signInWithEmailAndPassword(email, password);
                showLocalAppMessage('success', 'Login successful!');
                console.log("DEBUG LoginModal: User logged in.");
            }
        } catch (err) {
            console.error("DEBUG LoginModal: Authentication error:", err.code, err.message, err);
            switch (err.code) {
                case 'auth/user-not-found':
                    setError('No user found with this email.');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password.');
                    break;
                case 'auth/invalid-email':
                    setError('Invalid email address.');
                    break;
                case 'auth/email-already-in-use':
                    setError('This email is already registered.');
                    break;
                case 'auth/weak-password':
                    setError('Password should be at least 6 characters.');
                    break;
                default:
                    setError(`Authentication failed: ${err.message || 'Please try again.'}`);
                    break;
            }
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        showLocalAppMessage('', ''); // Clear previous messages
        try {
            const userCredential = await signInWithGoogle();
            const user = userCredential.user;
            console.log("DEBUG LoginModal: Google Sign-In successful for UID:", user.uid);

            const existingProfile = await getUserProfile(user.uid);

            if (!existingProfile) {
                await setUserProfile(userCredential.user.uid, {
                    displayName: userCredential.user.displayName || 'New User',
                    email: user.email,
                    role: 'player' // Default role for new Google sign-ins
                });
                console.log("DEBUG LoginModal: Created new Google user profile for UID:", user.uid);
            } else {
                // Optionally update existing profile details like display name or email if they change via Google
                await setUserProfile(user.uid, {
                    displayName: user.displayName,
                    email: user.email
                });
                console.log("DEBUG LoginModal: Updated existing Google user profile for UID:", user.uid);
            }
            showLocalAppMessage('success', 'Signed in with Google successfully!');

        } catch (err) {
            console.error("DEBUG LoginModal: Error during Google Sign-In:", err.code, err.message, err);
            setError('Google Sign-In failed. Please try again.');
        }
    };

    // This block handles the "loading authentication" state before Firebase knows if a user is logged in
    if (!isAuthReady) {
        return (
            <Dialog.Root open={isOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay
                        // Removed animation classes
                        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
                    >
                        <Dialog.Content
                            // Removed animation classes
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                     bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm text-center text-700 dark:text-gray-300" // Changed max-w-md to max-w-sm
                        >
                            {/* Radix UI recommends a DialogTitle even for loading states for accessibility */}
                            <Dialog.Title asChild>
                                <h2 className="text-xl font-semibold mb-4">Authentication Loading</h2>
                            </Dialog.Title>
                            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
                            <p>Loading authentication status...</p>
                        </Dialog.Content>
                    </Dialog.Overlay>
                </Dialog.Portal>
            </Dialog.Root>
        );
    }


    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                {/* Overlay without animations */}
                <Dialog.Overlay
                    className="fixed inset-0 z-50 bg-black/70 flex items-center justify-content"
                >
                    {/* Content without animations */}
                    <Dialog.Content
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                     bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-sm text-gray-900 dark:text-gray-100" // Changed max-w-md to max-w-sm
                    >
                        <Dialog.Close asChild>
                            <button
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                aria-label="Close"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </Dialog.Close>

                        {/* Dialog.Title for accessibility */}
                        <Dialog.Title asChild>
                            <h2 className="text-2xl font-bold mb-6 text-center">
                                {isRegistering ? 'Register' : 'Login'}
                            </h2>
                        </Dialog.Title>

                        {appMessage.text && (
                            <div className={`mb-4 p-3 rounded text-center ${appMessage.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>
                                {appMessage.text}
                            </div>
                        )}
                        {error && (
                            <div className="mb-4 p-3 rounded bg-red-100 text-red-700 text-center dark:bg-red-900 dark:text-red-200">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleAuth} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2" htmlFor="email">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2" htmlFor="password">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-700 dark:text-gray-200 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {isRegistering && (
                                <div>
                                    <label className="block text-sm font-bold mb-2" htmlFor="displayName">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        id="displayName"
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline"
                                        value={displayNameInput}
                                        onChange={(e) => setDisplayNameInput(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                            <button
                                type="submit"
                                className="!bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                                disabled={!isFormValid || (isRegistering && displayNameInput.trim() === '')}
                            >
                                {isRegistering ? 'Register Account' : 'Sign In'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="text-blue-500 hover:text-blue-800 text-sm dark:text-blue-400 dark:hover:text-blue-600"
                            >
                                {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
                            </button>
                        </div>

                        <div className="relative flex items-center justify-center my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                            </div>
                            <div className="relative bg-white dark:bg-gray-800 px-4 text-sm text-gray-500 dark:text-gray-400">
                                OR
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleSignIn}
                            className="flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 font-bold py-2 px-4 rounded w-full hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:shadow-outline"
                        >
                            <img src={GoogleLogoUrl} alt="Google logo" className="w-5 h-5 mr-2" />
                            Sign in with Google
                        </button>
                    </Dialog.Content>
                </Dialog.Overlay>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default LoginModal;