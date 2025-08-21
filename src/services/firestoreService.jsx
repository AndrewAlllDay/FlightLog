import { db } from '../firebase';
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    arrayUnion,
    arrayRemove,
    getDoc,
    setDoc,
    where,
    getDocs,
    writeBatch // Use writeBatch for atomic operations
} from 'firebase/firestore';

import { appId } from '../firebase';

// This confirms your appId is correct. We can remove this now if you like.
console.log("DEBUG: The appId being used by firestoreService is:", appId);


// Function to get the user-specific courses collection path
const getUserCoursesCollection = (userId) => {
    if (!userId) {
        console.error("Attempted to access Firestore collection without a userId.");
        throw new Error("User not authenticated or userId is missing.");
    }
    return collection(db, `artifacts/${appId}/users/${userId}/courses`);
};

// Function to get the encouragement notes collection path
const getEncouragementNotesCollection = () => {
    return collection(db, `artifacts/${appId}/encouragement_notes`);
};

// Function to get the user profiles collection path
const getUserProfilesCollection = () => {
    return collection(db, `artifacts/${appId}/user_profiles`);
};

// Function to get the teams collection path
const getTeamsCollection = () => {
    return collection(db, `artifacts/${appId}/teams`);
};

// Function to get the user-specific discs collection path
const getUserDiscsCollection = (userId) => {
    if (!userId) {
        console.error("Attempted to access user discs collection without a userId.");
        throw new Error("User not authenticated or userId is missing.");
    }
    return collection(db, `artifacts/${appId}/users/${userId}/discs`);
};

// --- USER PROFILE MANAGEMENT ---

export const setUserProfile = async (userId, profileData) => {
    try {
        if (!userId) {
            throw new Error("Cannot set user profile: User ID is missing.");
        }
        const profileDocRef = doc(getUserProfilesCollection(), userId);
        await setDoc(profileDocRef, profileData, { merge: true });
        console.log(`User profile for ${userId} updated/created successfully.`);
    } catch (e) {
        console.error("Error setting user profile: ", e);
        throw e;
    }
};

export const getUserProfile = async (userId) => {
    try {
        if (!userId) {
            console.warn("Attempted to get user profile without a userId.");
            return null;
        }
        const profileDocRef = doc(getUserProfilesCollection(), userId);
        const docSnap = await getDoc(profileDocRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("DEBUG firestoreService: User profile does not exist for userId:", userId);
            return null;
        }
    } catch (e) {
        console.error("Error getting user profile: ", e);
        throw e;
    }
};

export const subscribeToUserProfile = (userId, callback) => {
    if (!userId) {
        console.warn("Attempted to subscribe to user profile without a userId.");
        callback(null);
        return () => { };
    }
    const profileDocRef = doc(getUserProfilesCollection(), userId);
    const unsubscribe = onSnapshot(profileDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() });
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error subscribing to user profile: ", error);
    });
    return unsubscribe;
};

export const subscribeToAllUserProfiles = (callback) => {
    const q = query(getUserProfilesCollection(), orderBy('displayName', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const profiles = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log("DEBUG firestoreService: Fetched all user profiles (count):", profiles.length, "Profiles:", profiles);
        callback(profiles);
    }, (error) => {
        console.error("DEBUG firestoreService: Error subscribing to all user profiles: ", error);
    });
    return unsubscribe;
};

export const subscribeToAllUserDisplayNames = (callback) => {
    const q = query(getUserProfilesCollection(), orderBy('displayName', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const profiles = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                displayName: data.displayName || 'Unnamed User',
                email: data.email || 'Email not available',
                teamIds: data.teamIds || []
            };
        });
        console.log("DEBUG firestoreService: Fetched all user display names (count):", profiles.length, "Profiles:", profiles);
        callback(profiles);
    }, (error) => {
        console.error("DEBUG firestoreService: Error subscribing to all user display names: ", error);
    });
    return unsubscribe;
};

// --- TEAM MANAGEMENT FUNCTIONS ---

export const addTeam = async (name) => {
    try {
        if (!name || name.trim() === '') {
            throw new Error("Team name cannot be empty.");
        }
        const newTeamData = {
            name: name.trim(),
            memberIds: [],
            createdAt: new Date(),
        };
        const docRef = await addDoc(getTeamsCollection(), newTeamData);
        return { id: docRef.id, ...newTeamData };
    } catch (e) {
        console.error("Error adding team: ", e);
        throw e;
    }
};

export const subscribeToAllTeams = (callback) => {
    const q = query(getTeamsCollection(), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const teams = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(teams);
    }, (error) => {
        console.error("Error subscribing to all teams: ", error);
    });
    return unsubscribe;
};

export const updateTeam = async (teamId, newData) => {
    try {
        if (!teamId) {
            throw new Error("Cannot update team: Team ID is missing.");
        }
        const teamDocRef = doc(getTeamsCollection(), teamId);
        await updateDoc(teamDocRef, newData);
    } catch (e) {
        console.error("Error updating team: ", e);
        throw e;
    }
};

export const deleteTeam = async (teamId) => {
    try {
        if (!teamId) {
            throw new Error("Cannot delete team: Team ID is missing.");
        }
        const teamDocRef = doc(getTeamsCollection(), teamId);
        await deleteDoc(teamDocRef);
    } catch (e) {
        console.error("Error deleting team: ", e);
        throw e;
    }
};

// --- FINAL VERSION USING A BATCH WRITE ---
export const addTeamMember = async (teamId, userId) => {
    try {
        if (!teamId || !userId) {
            throw new Error("Team ID and User ID are required to add a member.");
        }
        // Create a new batch
        const batch = writeBatch(db);

        // Update the team document
        const teamDocRef = doc(getTeamsCollection(), teamId);
        batch.update(teamDocRef, { memberIds: arrayUnion(userId) });

        // Update the user's profile document
        const userProfileDocRef = doc(getUserProfilesCollection(), userId);
        batch.update(userProfileDocRef, { teamIds: arrayUnion(teamId) });

        // Commit both writes at the same time
        await batch.commit();
    } catch (e) {
        console.error("Error adding team member: ", e);
        throw e;
    }
};

// --- FINAL VERSION USING A BATCH WRITE ---
export const removeTeamMember = async (teamId, userId) => {
    try {
        if (!teamId || !userId) {
            throw new Error("Team ID and User ID are required to remove a member.");
        }
        // Create a new batch
        const batch = writeBatch(db);

        // Update the team document
        const teamDocRef = doc(getTeamsCollection(), teamId);
        batch.update(teamDocRef, { memberIds: arrayRemove(userId) });

        // Update the user's profile document
        const userProfileDocRef = doc(getUserProfilesCollection(), userId);
        batch.update(userProfileDocRef, { teamIds: arrayRemove(teamId) });

        // Commit both writes at the same time
        await batch.commit();
    } catch (e) {
        console.error("Error removing team member: ", e);
        throw e;
    }
};

// --- COURSE MANAGEMENT ---
// ... (rest of the file is unchanged)

export const addCourse = async (courseName, tournamentName, classification, userId) => {
    try {
        if (!userId) {
            throw new Error("Cannot add course: User ID is missing.");
        }

        const defaultHoles = Array.from({ length: 18 }, (_, index) => ({
            id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
            number: (index + 1).toString(),
            par: '3',
            note: '',
        }));

        const newCourseData = {
            name: courseName,
            tournamentName: tournamentName,
            averageScore: null, // Add default for new course
            classification: classification,
            holes: defaultHoles,
            createdAt: new Date(),
            userId: userId,
        };

        const docRef = await addDoc(getUserCoursesCollection(userId), newCourseData);
        return { id: docRef.id, ...newCourseData };
    } catch (e) {
        console.error("Error adding course: ", e);
        throw e;
    }
};

export const addCourseWithHoles = async (courseData, holesArray, userId) => {
    try {
        if (!userId) {
            throw new Error("Cannot add course: User ID is missing.");
        }
        if (!courseData.name || !holesArray) {
            throw new Error("Course name and a holes array are required.");
        }

        const newCourse = {
            name: courseData.name,
            tournamentName: courseData.tournamentName || '',
            classification: courseData.classification || 'park_style',
            holes: holesArray,
            createdAt: new Date(),
            userId: userId,
        };

        const docRef = await addDoc(getUserCoursesCollection(userId), newCourse);
        console.log("Course with custom holes added with ID: ", docRef.id);
        return { id: docRef.id, ...newCourse };

    } catch (e) {
        console.error("Error adding course with holes: ", e);
        throw e;
    }
};

export const subscribeToCourses = (userId, callback) => {
    if (!userId) {
        console.warn("Attempted to subscribe to courses without a userId.");
        callback([]);
        return () => { };
    }
    const q = query(getUserCoursesCollection(userId), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const courses = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(courses);
    }, (error) => {
        console.error("Error subscribing to courses: ", error);
    });
    return unsubscribe;
};

export const getUserCourses = async (userId) => {
    if (!userId) {
        console.warn("Attempted to get courses without a userId.");
        return [];
    }
    try {
        const q = query(getUserCoursesCollection(userId));
        const querySnapshot = await getDocs(q);
        const courses = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return courses;
    } catch (error) {
        console.error("Error getting user courses: ", error);
        throw error;
    }
};

export const updateCourse = async (courseId, newData, userId) => {
    try {
        if (!userId) {
            throw new Error("Cannot update course: User ID is missing.");
        }
        const courseDocRef = doc(getUserCoursesCollection(userId), courseId);
        await updateDoc(courseDocRef, newData);
    } catch (e) {
        console.error("Error updating course: ", e);
        throw e;
    }
};

export const deleteCourse = async (courseId, userId) => {
    try {
        if (!userId) {
            throw new Error("Cannot delete course: User ID is missing.");
        }
        const courseDocRef = doc(getUserCoursesCollection(userId), courseId);
        await deleteDoc(courseDocRef);
    } catch (e) {
        console.error("Error deleting course: ", e);
        throw e;
    }
};

// --- HOLE-SPECIFIC OPERATIONS ---

export const addHoleToCourse = async (courseId, holeData, userId) => {
    try {
        if (!userId) {
            throw new Error("Cannot add hole: User ID is missing.");
        }
        const courseDocRef = doc(getUserCoursesCollection(userId), courseId);
        await updateDoc(courseDocRef, {
            holes: arrayUnion(holeData)
        });
    } catch (e) {
        console.error("Error adding hole to course: ", e);
        throw e;
    }
};

export const updateHoleInCourse = async (courseId, holeId, updatedHoleData, userId) => {
    try {
        if (!userId) {
            throw new Error("Cannot update hole: User ID is missing.");
        }
        const courseDocRef = doc(getUserCoursesCollection(userId), courseId);
        const courseSnapshot = await getDoc(courseDocRef);

        if (courseSnapshot.exists() && courseSnapshot.data().holes) {
            const currentCourse = courseSnapshot.data();
            const updatedHoles = currentCourse.holes.map(hole =>
                hole.id === holeId ? { ...hole, ...updatedHoleData } : hole
            );
            await updateDoc(courseDocRef, { holes: updatedHoles });
        } else {
            console.warn("Course or holes array not found for update:", courseId);
        }
    } catch (e) {
        console.error("Error updating hole in course: ", e);
        throw e;
    }
};

export const deleteHoleFromCourse = async (courseId, holeId, userId) => {
    try {
        if (!userId) {
            throw new Error("Cannot delete hole: User ID is missing.");
        }
        const courseDocRef = doc(getUserCoursesCollection(userId), courseId);
        const courseSnapshot = await getDoc(courseDocRef);

        if (courseSnapshot.exists() && courseSnapshot.data().holes) {
            const currentCourse = courseSnapshot.data();
            const holeToRemove = currentCourse.holes.find(hole => hole.id === holeId);
            if (holeToRemove) {
                await updateDoc(courseDocRef, {
                    holes: arrayRemove(holeToRemove)
                });
            }
        }
    } catch (e) {
        console.error("Error deleting hole from course: ", e);
        throw e;
    }
};

export const reorderHolesInCourse = async (courseId, reorderedHolesArray, userId) => {
    try {
        if (!userId) {
            throw new Error("Cannot reorder holes: User ID is missing.");
        }
        const courseDocRef = doc(getUserCoursesCollection(userId), courseId);
        await updateDoc(courseDocRef, { holes: reorderedHolesArray });
    } catch (e) {
        console.error("Error reordering holes:", e);
        throw e;
    }
};

// --- ENCOURAGEMENT NOTE FUNCTIONS ---

export const addEncouragementNote = async (senderId, receiverId, senderDisplayName, receiverDisplayName, noteText) => {
    try {
        if (!senderId || !receiverId || !noteText) {
            throw new Error("Sender ID, Receiver ID, and Note Text are required.");
        }
        const newNoteData = {
            senderId: senderId,
            receiverId: receiverId,
            senderDisplayName: senderDisplayName || 'Anonymous',
            receiverDisplayName: receiverDisplayName || '',
            noteText: noteText,
            timestamp: new Date(),
            read: false,
        };
        const docRef = await addDoc(getEncouragementNotesCollection(), newNoteData);
        return { id: docRef.id, ...newNoteData };
    } catch (e) {
        console.error("Error adding encouragement note: ", e);
        throw e;
    }
};

export const subscribeToEncouragementNotes = (receiverId, callback) => {
    if (!receiverId) {
        callback([]);
        return () => { };
    }
    const q = query(
        getEncouragementNotesCollection(),
        where('receiverId', '==', receiverId),
        where('read', '==', false),
        orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const notes = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(notes);
    }, (error) => {
        console.error("Error subscribing to encouragement notes: ", error);
    });
    return unsubscribe;
};

export const markEncouragementNoteAsRead = async (noteId, userId) => {
    try {
        if (!noteId || !userId) {
            throw new Error("Note ID and User ID are required.");
        }
        const noteDocRef = doc(getEncouragementNotesCollection(), noteId);
        await updateDoc(noteDocRef, { read: true });
    } catch (e) {
        console.error("Error marking encouragement note as read: ", e);
        throw e;
    }
};

// --- DISC MANAGEMENT FUNCTIONS ---

export const addDiscToBag = async (userId, discData) => {
    try {
        if (!userId) {
            throw new Error("Cannot add disc: User ID is missing.");
        }
        if (!discData || !discData.name || !discData.manufacturer) {
            throw new Error("Disc name and manufacturer are required.");
        }
        const newDiscData = {
            ...discData,
            isArchived: discData.isArchived !== undefined ? discData.isArchived : false,
            displayOrder: discData.displayOrder !== undefined ? discData.displayOrder : 0,
            createdAt: new Date(),
            userId: userId,
        };
        const docRef = await addDoc(getUserDiscsCollection(userId), newDiscData);
        return { id: docRef.id, ...newDiscData };
    } catch (e) {
        console.error("Error adding disc to bag: ", e);
        throw e;
    }
};

export const updateDiscInBag = async (userId, discId, newData) => {
    try {
        if (!userId || !discId) {
            throw new Error("User ID and Disc ID are required.");
        }
        const discDocRef = doc(getUserDiscsCollection(userId), discId);
        await updateDoc(discDocRef, newData);
    } catch (e) {
        console.error("Error updating disc in bag: ", e);
        throw e;
    }
};

export const subscribeToUserDiscs = (userId, callback) => {
    if (!userId) {
        callback([]);
        return () => { };
    }
    const q = query(
        getUserDiscsCollection(userId),
        where('isArchived', '==', false),
        orderBy('displayOrder', 'asc')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const discs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(discs);
    }, (error) => {
        console.error("Error subscribing to active user discs: ", error);
    });
    return unsubscribe;
};

export const subscribeToArchivedUserDiscs = (userId, callback) => {
    if (!userId) {
        callback([]);
        return () => { };
    }
    const q = query(
        getUserDiscsCollection(userId),
        where('isArchived', '==', true),
        orderBy('displayOrder', 'asc')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const discs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(discs);
    }, (error) => {
        console.error("Error subscribing to archived user discs: ", error);
    });
    return unsubscribe;
};

export const deleteDiscFromBag = async (userId, discId) => {
    try {
        if (!userId || !discId) {
            throw new Error("User ID and Disc ID are required to delete a disc.");
        }
        const discDocRef = doc(getUserDiscsCollection(userId), discId);
        await deleteDoc(discDocRef);
    } catch (e) {
        console.error("Error deleting disc from bag: ", e);
        throw e;
    }
};

// --- ROUND / SCORECARD MANAGEMENT ---

// Function to get the user-specific rounds collection path
const getUserRoundsCollection = (userId) => {
    if (!userId) {
        console.error("Attempted to access rounds collection without a userId.");
        throw new Error("User not authenticated or userId is missing.");
    }
    return collection(db, `artifacts/${appId}/users/${userId}/rounds`);
};

export const subscribeToRounds = (userId, callback) => {
    if (!userId) {
        console.warn("Attempted to subscribe to rounds without a userId.");
        callback([]);
        return () => { };
    }
    // ✅ This now sorts by the actual round date ('date') instead of the import date ('createdAt').
    const q = query(getUserRoundsCollection(userId), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const rounds = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(rounds);
    }, (error) => {
        console.error("Error subscribing to rounds: ", error);
    });
    return unsubscribe;
};

/**
 * Adds a new round/scorecard to a user's collection in Firestore.
 * @param {string} userId - The UID of the user who owns the round.
 * @param {Object} roundData - An object containing the round's details.
 * @param {string} notes - Optional notes about the round.
 * @returns {Promise<Object>} A promise that resolves with the new round's ID and data.
 */
export const addRound = async (userId, roundData, notes) => {
    try {
        if (!userId) {
            throw new Error("Cannot add round: User ID is missing.");
        }
        if (!roundData || !roundData.courseId || !roundData.scores) {
            throw new Error("Round data must include a courseId and scores.");
        }

        const newRoundData = {
            ...roundData,
            userId: userId,
            notes: notes || null, // Add the notes field, defaulting to null
            createdAt: new Date(),
        };

        const docRef = await addDoc(getUserRoundsCollection(userId), newRoundData);
        console.log("Round added with ID: ", docRef.id);
        return { id: docRef.id, ...newRoundData };
    } catch (e) {
        console.error("Error adding round: ", e);
        throw e;
    }
};

/**
 * Deletes a specific round/scorecard from a user's collection in Firestore.
 * @param {string} userId - The UID of the user who owns the round.
 * @param {string} roundId - The ID of the round document to delete.
 * @returns {Promise<void>} A promise that resolves when the document is deleted.
 */
export const deleteRound = async (userId, roundId) => {
    try {
        if (!userId || !roundId) {
            throw new Error("Cannot delete round: User ID and Round ID are required.");
        }
        const roundDocRef = doc(getUserRoundsCollection(userId), roundId);
        await deleteDoc(roundDocRef);
        console.log(`Round ${roundId} deleted successfully for user ${userId}.`);
    } catch (e) {
        console.error("Error deleting round: ", e);
        throw e;
    }
};


// --- NEW FUNCTION TO UPDATE A ROUND'S RATING ---
/**
 * Updates the rating for a specific round.
 * @param {string} userId - The ID of the current user.
 * @param {string} roundId - The ID of the round document to update.
 * @param {number|string} rating - The new rating to set for the round.
 */
export const updateRoundRating = async (userId, roundId, rating) => {
    if (!userId || !roundId) {
        throw new Error("User ID and Round ID must be provided to update a rating.");
    }

    // Ensure the rating is a number before saving. Allow empty string to clear the rating.
    const ratingValue = rating === '' ? null : Number(rating);
    if (rating !== '' && isNaN(ratingValue)) {
        throw new Error("Rating must be a valid number.");
    }

    const roundDocRef = doc(getUserRoundsCollection(userId), roundId);
    try {
        // updateDoc efficiently updates fields on an existing document
        await updateDoc(roundDocRef, {
            rating: ratingValue
        });
    } catch (error) {
        console.error("Error updating round rating in Firestore: ", error);
        throw new Error("Failed to save the new rating.");
    }
};

// --- NEW FUNCTION TO UPDATE A ROUND'S TOURNAMENT NAME ---
/**
 * Updates the tournament name for a specific round.
 * @param {string} userId - The ID of the current user.
 * @param {string} roundId - The ID of the round document to update.
 * @param {string} tournamentName - The new tournament name to set for the round. Can be an empty string to clear it.
 */
export const updateRoundTournament = async (userId, roundId, tournamentName) => {
    if (!userId || !roundId) {
        throw new Error("User ID and Round ID must be provided to update the tournament name.");
    }
    const roundDocRef = doc(getUserRoundsCollection(userId), roundId);
    try {
        await updateDoc(roundDocRef, {
            tournamentName: tournamentName,
        });
    } catch (error) {
        console.error("Error updating tournament name in Firestore: ", error);
        throw new Error("Could not update tournament name in the database.");
    }
};

// --- NEW FUNCTION TO UPDATE A ROUND'S NOTES ---
/**
 * Updates the notes for a specific round.
 * @param {string} userId - The ID of the current user.
 * @param {string} roundId - The ID of the round document to update.
 * @param {string} notes - The new notes to set for the round.
 */
export const updateRoundNotes = async (userId, roundId, notes) => {
    if (!userId || !roundId) {
        throw new Error("User ID and Round ID must be provided to update notes.");
    }

    const roundDocRef = doc(getUserRoundsCollection(userId), roundId);
    try {
        await updateDoc(roundDocRef, {
            notes: notes,
        });
    } catch (error) {
        console.error("Error updating round notes in Firestore: ", error);
        throw new Error("Failed to save the new notes.");
    }
};

/**
 * Updates the type for a specific round (e.g., 'tournament', 'league').
 * @param {string} userId - The ID of the current user.
 * @param {string} roundId - The ID of the round document to update.
 * @param {string} roundType - The new type to set for the round. Can be 'tournament', 'league', or an empty string.
 */
export const updateRoundType = async (userId, roundId, roundType) => {
    if (!userId || !roundId) {
        throw new Error("User ID and Round ID must be provided to update the round type.");
    }
    const roundDocRef = doc(db, `artifacts/${appId}/users/${userId}/rounds`, roundId);
    try {
        await updateDoc(roundDocRef, {
            roundType: roundType,
        });
    } catch (error) {
        console.error("Error updating round type in Firestore: ", error);
        throw new Error("Failed to save the new round type.");
    }
};