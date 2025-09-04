// src/components/SettingsPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, PlusCircle, Trash2, UserPlus, UserMinus, LogOut, Save, Check } from 'lucide-react';
import Papa from 'papaparse';
import {
    setUserProfile,
    addTeam,
    subscribeToAllTeams,
    addTeamMember,
    removeTeamMember,
    deleteTeam,
    addCourseWithHoles,
    getUserCourses,
    addRound,
    addEncouragementNote
} from '../services/firestoreService';
import { getCache, setCache } from '../utilities/cache.js';
import ImportCSVModal from './ImportCSVModal';
import ConfirmationModal from './ConfirmationModal';
import SelectCourseTypeModal from './SelectCourseTypeModal';
import SelectPlayerModal from './SelectPlayerModal';
import AddRoundNotesModal from './AddRoundNotesModal';

function getDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('dgnotes-shared-files', 1);
        request.onerror = event => reject("IndexedDB error: " + event.target.errorCode);
        request.onsuccess = event => resolve(event.target.result);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

async function getFile() {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const allFilesRequest = store.getAll();
        allFilesRequest.onsuccess = () => {
            if (allFilesRequest.result && allFilesRequest.result.length > 0) {
                const sorted = allFilesRequest.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(sorted[0].file);
            } else {
                resolve(null);
            }
        };
        allFilesRequest.onerror = reject;
    });
}

async function clearFiles() {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const request = store.clear();
        request.onsuccess = resolve;
        request.onerror = reject;
    });
}

const cleanStringForComparison = (str) => {
    if (typeof str !== 'string') return '';
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return str
        .replace(/[‘’`]/g, "'")
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF\u2060\u2061\u2062\u2063\u2064\u206A-\u206F\uFFF9-\uFFFB]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const Accordion = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const toggleAccordion = () => setIsOpen(!isOpen);

    return (
        <div className="bg-white rounded-lg shadow-md max-w-md mx-auto mb-6">
            <button
                className="w-full flex justify-between items-center p-6 text-xl font-semibold text-gray-800 focus:outline-none !bg-white rounded-lg"
                onClick={toggleAccordion}
                aria-expanded={isOpen}
            >
                {title}
                {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
            {isOpen && (
                <div className="px-6 pb-6 pt-6 border-t border-gray-200">
                    {children}
                </div>
            )}
        </div>
    );
};


export default function SettingsPage({ user, allUserProfiles, onSignOut, onNavigate, params = {} }) {
    const userId = user?.uid;

    // Original SettingsPage State
    const [displayNameInput, setDisplayNameInput] = useState('');
    const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
    const [importMessage, setImportMessage] = useState({ type: '', text: '' });
    const [roleSaveMessage, setRoleSaveMessage] = useState({ type: '', text: '' });
    const [teams, setTeams] = useState([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [teamMessage, setTeamMessage] = useState({ type: '', text: '' });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [confirmationState, setConfirmationState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [selectTypeState, setSelectTypeState] = useState({ isOpen: false });
    const [selectPlayerState, setSelectPlayerState] = useState({ isOpen: false, players: [], onSelect: () => { } });
    const [pendingCourse, setPendingCourse] = useState(null);
    const [pendingRoundData, setPendingRoundData] = useState(null);

    // State from SendEncouragement
    const [noteText, setNoteText] = useState('');
    const [recipients, setRecipients] = useState([]);
    const [selectedRecipientId, setSelectedRecipientId] = useState('');
    const [encouragementMessage, setEncouragementMessage] = useState({ type: '', text: '' });
    const [isSendingNote, setIsSendingNote] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const encouragementDropdownRef = useRef(null);

    const APP_VERSION = 'v 0.1.57';

    const proceedToScoreImport = useCallback(async (course, csvResults) => {
        const playerRows = csvResults.data.filter(row => row.PlayerName !== 'Par');
        const userRow = playerRows.find(row => cleanStringForComparison(row.PlayerName) === cleanStringForComparison(user.displayName));
        const openNotesModalWithData = (selectedRow) => {
            setPendingRoundData({
                course: course,
                userRow: selectedRow,
                headers: csvResults.meta.fields,
            });
            setIsNotesModalOpen(true);
        };
        if (userRow) {
            openNotesModalWithData(userRow);
        } else {
            setSelectPlayerState({
                isOpen: true,
                players: playerRows.map(row => row.PlayerName),
                onSelect: (selectedPlayer) => {
                    const selectedRow = playerRows.find(row => row.PlayerName === selectedPlayer);
                    setSelectPlayerState({ isOpen: false, players: [], onSelect: () => { } });
                    openNotesModalWithData(selectedRow);
                }
            });
        }
    }, [user.displayName]);

    const handleCreationConfirmed = useCallback((courseData, holesArray, csvResults) => {
        setPendingCourse({ courseData, holesArray, csvResults });
        setSelectTypeState({ isOpen: true });
        setConfirmationState({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    }, []);

    const handleCourseImport = useCallback(async (csvResults) => {
        setIsImportModalOpen(false);
        setImportMessage({ type: '', text: '' });
        try {
            const csvData = csvResults.data;
            const headers = csvResults.meta.fields;
            const parRow = csvData.find(row => row.PlayerName === 'Par');
            if (!parRow) throw new Error("Could not find 'Par' row in CSV.");
            const rawCourseName = cleanStringForComparison(parRow.CourseName);
            const rawLayoutName = cleanStringForComparison(parRow.LayoutName);
            if (!rawCourseName) throw new Error("CSV is missing 'CourseName'.");
            const courseName = rawCourseName;
            const layoutName = rawLayoutName;
            const existingCourses = await getUserCourses(userId);
            const existingCourse = existingCourses.find(c =>
                cleanStringForComparison(c.name) === courseName &&
                cleanStringForComparison(c.tournamentName) === layoutName
            );
            if (existingCourse) {
                await proceedToScoreImport(existingCourse, csvResults);
            } else {
                const holesArray = [];
                for (const header of headers) {
                    const match = header.match(/^Hole(\w+)$/);
                    if (match) {
                        holesArray.push({
                            id: `${Date.now()}-${match[1]}-${Math.random().toString(36).substring(2, 9)}`,
                            number: match[1],
                            par: parRow[header],
                            note: '',
                        });
                    }
                }
                if (holesArray.length === 0) throw new Error("No 'HoleX' columns found.");
                const courseData = { name: courseName, tournamentName: layoutName };
                setConfirmationState({
                    isOpen: true,
                    title: 'Create New Course?',
                    message: `No course named "${courseName} - ${layoutName}" found. Would you like to create it now?`,
                    onConfirm: () => handleCreationConfirmed(courseData, holesArray, csvResults)
                });
            }
        } catch (error) {
            setImportMessage({ type: 'error', text: `Import failed: ${error.message}` });
            console.error("DEBUG: handleCourseImport error:", error);
        }
    }, [userId, proceedToScoreImport, handleCreationConfirmed]);

    useEffect(() => {
        const processFile = async (fileToProcess) => {
            if (fileToProcess) {
                setImportMessage({ type: 'info', text: 'Processing shared file...' });
                Papa.parse(fileToProcess, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => handleCourseImport(results),
                    error: () => setImportMessage({ type: 'error', text: 'Failed to parse the shared CSV file.' })
                });
                await clearFiles();
            }
        };
        const runImport = async () => {
            if (params.sharedFile) { processFile(params.sharedFile); }
            else if (params.triggerImport) { const file = await getFile(); processFile(file); }
        };
        if (userId) { runImport(); }
    }, [params, userId, handleCourseImport]);

    useEffect(() => {
        if (user) { setDisplayNameInput(user.displayName || ''); }
    }, [user]);

    useEffect(() => {
        let unsubscribeTeams;
        if (user?.role === 'admin') {
            const cachedTeams = getCache('allTeams');
            if (cachedTeams) { setTeams(cachedTeams); }
            unsubscribeTeams = subscribeToAllTeams((fetchedTeams) => {
                setTeams(fetchedTeams);
                setCache('allTeams', fetchedTeams);
            });
        }
        return () => unsubscribeTeams && unsubscribeTeams();
    }, [user?.role]);

    useEffect(() => {
        if (allUserProfiles && user) {
            const currentUserId = user.uid;
            const currentUserTeamIds = user.teamIds || [];
            let filteredRecipients = allUserProfiles.filter(profile => profile.id !== currentUserId);
            if (user.role !== 'admin') {
                filteredRecipients = filteredRecipients.filter(profile => {
                    const recipientTeamIds = profile.teamIds || [];
                    return currentUserTeamIds.some(teamId => recipientTeamIds.includes(teamId));
                });
            }
            setRecipients(filteredRecipients);
            if (filteredRecipients.length > 0 && !filteredRecipients.some(r => r.id === selectedRecipientId)) {
                setSelectedRecipientId(filteredRecipients[0].id);
            } else if (filteredRecipients.length === 0) {
                setSelectedRecipientId('');
            }
        }
    }, [allUserProfiles, user, selectedRecipientId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (encouragementDropdownRef.current && !encouragementDropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (encouragementMessage.text) {
            const timer = setTimeout(() => {
                setEncouragementMessage({ type: '', text: '' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [encouragementMessage]);

    const handleSendNoteSubmit = async (e) => {
        e.preventDefault();
        setEncouragementMessage({ type: '', text: '' });
        if (!user || !user.uid) {
            setEncouragementMessage({ type: 'error', text: 'You must be logged in.' });
            return;
        }
        if (!selectedRecipientId) {
            setEncouragementMessage({ type: 'error', text: 'Please select a recipient.' });
            return;
        }
        if (noteText.trim() === '') {
            setEncouragementMessage({ type: 'error', text: 'Please enter a message.' });
            return;
        }
        setIsSendingNote(true);
        try {
            const recipientDisplayName = recipients.find(r => r.id === selectedRecipientId)?.displayName || 'user';
            const senderDisplayName = user.displayName || 'Anonymous';
            await addEncouragementNote(user.uid, selectedRecipientId, senderDisplayName, recipientDisplayName, noteText.trim());
            setEncouragementMessage({ type: 'success', text: `Note sent to ${recipientDisplayName}!` });
            setNoteText('');
        } catch (error) {
            setEncouragementMessage({ type: 'error', text: `Failed to send note: ${error.message}` });
        } finally {
            setIsSendingNote(false);
        }
    };

    const getSelectedRecipientName = () => {
        const selected = recipients.find(r => r.id === selectedRecipientId);
        return selected ? (selected.displayName || selected.email) : "Select a recipient";
    };

    const handleSelectRecipient = (recipientId) => {
        setSelectedRecipientId(recipientId);
        setIsDropdownOpen(false);
    };

    const handleSaveDisplayName = async () => {
        if (!userId) {
            setSaveMessage({ type: 'error', text: 'You must be logged in.' });
            return;
        }
        if (displayNameInput.trim() === '') {
            setSaveMessage({ type: 'error', text: 'Display Name cannot be empty.' });
            return;
        }
        try {
            await setUserProfile(userId, { displayName: displayNameInput.trim() });
            setSaveMessage({ type: 'success', text: 'Display Name saved!' });
        } catch (error) {
            setSaveMessage({ type: 'error', text: `Failed to save: ${error.message}` });
        } finally {
            setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleFinalizeRoundImport = async (notes) => {
        if (!pendingRoundData) {
            setImportMessage({ type: 'error', text: 'An error occurred. Missing round data.' });
            return;
        }
        const { course, userRow, headers } = pendingRoundData;
        let parsedDate;
        try {
            const dateString = userRow.StartDate;
            const [datePart, timePart] = dateString.split(' ');
            const [year, month, day] = datePart.split('-');
            const hour = timePart.substring(0, 2);
            const minute = timePart.substring(2, 4);
            parsedDate = new Date(year, month - 1, day, hour, minute);
            if (isNaN(parsedDate)) {
                throw new Error('Could not create a valid date from StartDate.');
            }
        } catch (e) {
            console.error("Date parsing failed:", e);
            setImportMessage({ type: 'error', text: 'Import failed: Could not read the date format in the CSV.' });
            setIsNotesModalOpen(false);
            setPendingRoundData(null);
            return;
        }
        const scores = {};
        for (const header of headers) {
            const match = header.match(/^Hole(\w+)$/);
            if (match) {
                const holeNumber = match[1];
                scores[holeNumber] = parseInt(userRow[header], 10);
            }
        }
        const roundData = {
            courseId: course.id,
            courseName: course.name,
            layoutName: course.tournamentName,
            date: parsedDate,
            totalScore: parseInt(userRow.Total),
            scoreToPar: parseInt(userRow['+/-']),
            scores: scores
        };
        try {
            await addRound(userId, roundData, notes);
            setImportMessage({ type: 'success', text: `Your scorecard for ${course.name} has been imported!` });
        } catch (error) {
            setImportMessage({ type: 'error', text: `Failed to save round: ${error.message}` });
        }
        setIsNotesModalOpen(false);
        setPendingRoundData(null);
    };

    const handleCreateFinal = useCallback(async (classification) => {
        if (!pendingCourse) return;
        const { courseData, holesArray, csvResults } = pendingCourse;
        const finalCourseData = { ...courseData, classification };
        try {
            const newCourse = await addCourseWithHoles(finalCourseData, holesArray, userId);
            setSelectTypeState({ isOpen: false });
            setPendingCourse(null);
            await proceedToScoreImport(newCourse, csvResults);
        } catch (error) {
            setImportMessage({ type: 'error', text: `Failed to create course: ${error.message}` });
            setSelectTypeState({ isOpen: false });
            setPendingCourse(null);
        }
    }, [pendingCourse, userId, proceedToScoreImport]);

    const handleAutoSaveRole = async (targetUserId, newRole) => {
        if (!newRole || !targetUserId) return;
        const userProfile = allUserProfiles.find(p => p.id === targetUserId);
        if (userProfile && (userProfile.role || 'player') === newRole) {
            return;
        }
        try {
            await setUserProfile(targetUserId, { role: newRole });
            setRoleSaveMessage({ type: 'success', text: `Role for ${userProfile.displayName || 'user'} updated!` });
        } catch (error) {
            setRoleSaveMessage({ type: 'error', text: `Failed to update role: ${error.message}` });
        } finally {
            setTimeout(() => setRoleSaveMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleAddTeam = async () => {
        if (newTeamName.trim() === '') {
            setTeamMessage({ type: 'error', text: 'Team name cannot be empty.' });
            return;
        }
        try {
            await addTeam(newTeamName.trim());
            setNewTeamName('');
            setTeamMessage({ type: 'success', text: 'Team created!' });
        } catch (error) {
            setTeamMessage({ type: 'error', text: `Failed to create team: ${error.message}` });
        } finally {
            setTimeout(() => setTeamMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleDeleteTeam = async (teamId) => {
        if (window.confirm("Are you sure you want to delete this team?")) {
            try {
                await deleteTeam(teamId);
                setTeamMessage({ type: 'success', text: 'Team deleted!' });
            } catch (error) {
                setTeamMessage({ type: 'error', text: `Failed to delete team: ${error.message}` });
            } finally {
                setTimeout(() => setTeamMessage({ type: '', text: '' }), 3000);
            }
        }
    };

    const handleToggleTeamMembership = async (teamId, memberUserId, isMember) => {
        try {
            if (isMember) {
                await removeTeamMember(teamId, memberUserId);
                setTeamMessage({ type: 'success', text: 'Member removed.' });
            } else {
                await addTeamMember(teamId, memberUserId);
                setTeamMessage({ type: 'success', text: 'Member added.' });
            }
        } catch (error) {
            setTeamMessage({ type: 'error', text: `Failed to update: ${error.message}` });
        } finally {
            setTimeout(() => setTeamMessage({ type: '', text: '' }), 3000);
        }
    };

    const roleOrder = { 'admin': 0, 'player': 1, 'non-player': 2 };
    const sortedUserProfiles = [...(allUserProfiles || [])].sort((a, b) => {
        const roleA = a.role || 'player';
        const roleB = b.role || 'player';
        const orderA = roleOrder[roleA];
        const orderB = roleOrder[roleB];
        if (orderA !== orderB) return orderA - orderB;
        return (a.displayName || 'Unnamed').localeCompare(b.displayName || 'Unnamed');
    });

    if (!user) return <div className="text-center p-4">Please log in to view settings.</div>;

    return (
        <div className="max-h-screen !bg-gray-100 p-4 pb-48">
            <h2 className="text-2xl font-bold mb-6 text-center pt-5">Settings</h2>

            <Accordion title="Your Account">
                <div className="mb-4">
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">Set Your Display Name:</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            id="displayName"
                            className="flex-grow p-2 border border-gray-300 rounded-md !bg-white"
                            value={displayNameInput}
                            onChange={(e) => setDisplayNameInput(e.target.value)}
                            placeholder="e.g., Disc Golf Pro"
                        />
                        <button
                            onClick={handleSaveDisplayName}
                            className="p-2 !bg-green-600 text-white rounded-md hover:!bg-green-700"
                            aria-label="Save Display Name"
                        >
                            <Save size={20} />
                        </button>
                    </div>
                    {saveMessage.text && <p className={`mt-2 text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{saveMessage.text}</p>}
                </div>

                {user.email && <p className="text-gray-600 text-sm mt-3 "><span className="font-semibold">Username:</span> {user.email}</p>}
                <p className="text-gray-600 text-sm"><span className="font-semibold">Your Role:</span> {user.role || 'player'}</p>

                <button onClick={onSignOut} className="w-full flex items-center justify-center gap-2 !bg-red-600 text-white mt-5 p-3 rounded-md font-semibold hover:bg-red-700">
                    <LogOut size={20} />
                    Logout
                </button>
            </Accordion>

            <Accordion title="Send Encouragement">
                {encouragementMessage.text && (
                    <div className={`mb-4 p-3 rounded-md ${encouragementMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {encouragementMessage.text}
                    </div>
                )}
                <form onSubmit={handleSendNoteSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="recipient-select-button" className="block text-sm font-medium text-gray-700 mb-1">Send to:</label>
                        <div className="relative" ref={encouragementDropdownRef}>
                            <button type="button" id="recipient-select-button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 !bg-white flex justify-between items-center text-gray-700 hover:border-gray-400" disabled={isSendingNote || recipients.length === 0}>
                                <span className="truncate">{getSelectedRecipientName()}</span>
                                <ChevronDown size={20} className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
                            </button>
                            {isDropdownOpen && (recipients.length > 0 ? (
                                <ul className="absolute z-10 w-full !bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                                    {recipients.map(recipient => (
                                        <li key={recipient.id} onClick={() => handleSelectRecipient(recipient.id)} className={`p-3 cursor-pointer hover:bg-blue-50 flex justify-between items-center ${recipient.id === selectedRecipientId ? 'bg-blue-100 font-semibold text-blue-700' : 'text-gray-900'}`}>
                                            <span className="truncate">{recipient.displayName || recipient.email}</span>
                                            {recipient.id === selectedRecipientId && <Check size={18} className="text-blue-700" />}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 p-3 text-gray-500">
                                    {user?.role === 'admin' ? "No other users available" : "No teammates found"}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="note-text" className="block text-sm font-medium text-gray-700 mb-1">Your Message:</label>
                        <textarea id="note-text" value={noteText} onChange={(e) => setNoteText(e.target.value)} rows="4" className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y !bg-white" placeholder="Type your encouragement here..." disabled={isSendingNote}></textarea>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 !bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50" disabled={isSendingNote || !selectedRecipientId || noteText.trim() === ''}>
                            {isSendingNote ? 'Sending...' : 'Send Note'}
                        </button>
                    </div>
                </form>
            </Accordion>

            <Accordion title="Manage Scorecards">
                <h3 className="text-lg font-semibold text-gray-800">Import Scorecard</h3>
                <p className="text-sm text-gray-600 mb-2">Upload a scorecard exported from Udisc.</p>
                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="w-full !bg-blue-600 text-white p-2 rounded-md font-semibold hover:bg-blue-700 transition-colors mb-4"
                >
                    Import from CSV
                </button>
                <h3 className="text-lg font-semibold text-gray-800 border-t pt-4 mt-4">View Scores</h3>
                <p className="text-sm text-gray-600 mb-2">View all of your imported scorecards.</p>
                <button
                    onClick={() => onNavigate('scores')}
                    className="w-full !bg-gray-600 text-white p-2 rounded-md font-semibold hover:bg-gray-700 transition-colors"
                >
                    View Imported Scores
                </button>
                {importMessage.text && (
                    <p className={`mt-2 text-sm ${importMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {importMessage.text}
                    </p>
                )}
            </Accordion>

            {user.role === 'admin' && (
                <Accordion title="User Role Management">
                    {roleSaveMessage.text && <p className={`mb-4 text-sm ${roleSaveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{roleSaveMessage.text}</p>}
                    <div className="border rounded-md bg-white">
                        <ul className="divide-y divide-gray-200">
                            {sortedUserProfiles.map(profile => {
                                if (profile.id === user.uid) {
                                    return (
                                        <li key={profile.id} className="p-3 bg-blue-50">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-blue-900">{profile.displayName || 'No Name'}</span>
                                                <span className="text-sm font-semibold text-blue-800 capitalize">{(profile.role || 'player').replace('-', ' ')}</span>
                                            </div>
                                        </li>
                                    );
                                }
                                const currentRole = profile.role || 'player';
                                return (
                                    <li key={profile.id} className="p-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-800">{profile.displayName || 'No Name'}</span>
                                            <select
                                                className="p-1 border rounded-md !bg-white text-sm"
                                                value={currentRole}
                                                onChange={(e) => handleAutoSaveRole(profile.id, e.target.value)}
                                            >
                                                <option value="player">Player</option>
                                                <option value="non-player">Non-Player</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </Accordion>
            )}

            {user.role === 'admin' && (
                <Accordion title="Team Management">
                    {teamMessage.text && <p className={`mb-4 text-sm ${teamMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{teamMessage.text}</p>}
                    <div className="mb-6 border-b pb-4">
                        <h3 className="text-lg font-semibold mb-2">Create New Team</h3>
                        <div className="flex gap-2">
                            <input type="text" className="flex-grow p-2 border rounded-md bg-white" placeholder="New team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                            <button onClick={handleAddTeam} className="p-2 !bg-blue-600 text-white rounded-md"><PlusCircle size={20} /></button>
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-3">Existing Teams</h3>
                    {teams.length > 0 ? (
                        <ul className="space-y-4">
                            {teams.map(team => {
                                const sortedProfiles = [...(allUserProfiles || [])].sort((a, b) => {
                                    const aIsMember = !!team.memberIds?.includes(a.id);
                                    const bIsMember = !!team.memberIds?.includes(b.id);
                                    if (aIsMember === bIsMember) {
                                        return (a.displayName || 'Unnamed').localeCompare(b.displayName || 'Unnamed');
                                    }
                                    return aIsMember ? -1 : 1;
                                });

                                return (
                                    <li key={team.id} className="border p-4 rounded-md shadow-sm bg-gray-50">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="font-semibold">{team.name}</p>
                                            <button onClick={() => handleDeleteTeam(team.id)} className="p-1 text-red-600 hover:text-red-800"><Trash2 size={20} /></button>
                                        </div>
                                        <h4 className="text-md font-medium mt-4 mb-2">Edit Members:</h4>
                                        {allUserProfiles && allUserProfiles.length > 0 ? (
                                            <div className="border rounded-md bg-white">
                                                <ul className="divide-y divide-gray-200">
                                                    {sortedProfiles.map(profile => {
                                                        const isMember = !!team.memberIds?.includes(profile.id);
                                                        return (
                                                            <li key={profile.id} className={`flex justify-between items-center p-2 transition-colors ${isMember ? 'bg-green-50' : 'bg-white'}`}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-gray-800 text-sm">{profile.displayName || 'Unnamed'}</span>
                                                                    {isMember && (
                                                                        <span className="text-xs font-semibold bg-green-200 text-green-800 px-2 py-0.5 rounded-full">Member</span>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => handleToggleTeamMembership(team.id, profile.id, isMember)}
                                                                    className={`p-1 rounded-md transition-colors ${isMember ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                                                    aria-label={isMember ? 'Remove from team' : 'Add to team'}
                                                                >
                                                                    {isMember ? <UserMinus size={16} /> : <UserPlus size={16} />}
                                                                </button>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            </div>
                                        ) : <p className="text-gray-600 text-sm">No users to add.</p>}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : <p className="text-gray-600">No teams created yet.</p>}
                </Accordion>
            )}

            <div className="mt-8 text-center text-sm text-gray-500">
                FlightLog: {APP_VERSION}
            </div>

            <ImportCSVModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleCourseImport} />
            <ConfirmationModal isOpen={confirmationState.isOpen} onClose={() => setConfirmationState({ ...confirmationState, isOpen: false })} onConfirm={confirmationState.onConfirm} title={confirmationState.title} message={confirmationState.message} />
            <SelectCourseTypeModal isOpen={selectTypeState.isOpen} onClose={() => setSelectTypeState({ isOpen: false })} onSubmit={handleCreateFinal} />
            <SelectPlayerModal isOpen={selectPlayerState.isOpen} onClose={() => setSelectPlayerState({ isOpen: false, players: [], onSelect: () => { } })} onSelect={selectPlayerState.onSelect} players={selectPlayerState.players} />
            <AddRoundNotesModal isOpen={isNotesModalOpen} onClose={() => handleFinalizeRoundImport('')} onSubmit={handleFinalizeRoundImport} />
        </div>
    );
}