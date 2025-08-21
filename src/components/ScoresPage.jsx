import React, { useState, useEffect, useMemo } from 'react';
import { db, appId, auth } from '../firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import {
    subscribeToRounds,
    deleteRound,
    updateRoundRating,
    updateRoundTournament,
    updateRoundNotes,
    updateRoundType
} from '../services/firestoreService.jsx';
import { getCache, setCache } from '../utilities/cache.js';
import { format } from 'date-fns';
import { FaTrash, FaSave, FaTimes, FaEdit, FaTrophy, FaUsers, FaUndo } from 'react-icons/fa';
import { toast } from 'react-toastify';
import DeleteConfirmationModal from './DeleteConfirmationModal';

// --- Centralized Configuration for Round Types ---
const ROUND_TYPE_CONFIG = {
    tournament: {
        label: 'Tournament',
        icon: <FaTrophy size={14} />,
        styles: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    },
    league: {
        label: 'League',
        icon: <FaUsers size={14} />,
        styles: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    }
};

const ALL_FILTER_TYPES = Object.keys(ROUND_TYPE_CONFIG);

// --- NEW ---
// Safely converts Firestore Timestamps or date strings from cache into JS Date objects.
const normalizeDate = (dateValue) => {
    if (!dateValue) return null;
    // Handles Firestore Timestamps
    if (typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
    }
    // Handles ISO strings from cache
    const date = new Date(dateValue);
    // Check for invalid dates
    if (!isNaN(date.getTime())) {
        return date;
    }
    return null;
};

const ScorecardHeader = ({ type, rating }) => {
    // Render nothing only if there's no type AND no rating to display.
    if (!type && typeof rating !== 'number') {
        return null;
    }

    const config = type ? ROUND_TYPE_CONFIG[type] : null;

    const baseClasses = 'flex items-center justify-between gap-4 px-4 py-2 text-sm';

    const colorClasses = config
        ? `${config.styles} font-semibold`
        : 'bg-transparent';

    return (
        <div className={`${baseClasses} ${colorClasses}`}>
            <div className="flex items-center gap-2">
                {config?.icon}
                {config && <span>{config.label} Round</span>}
            </div>

            {typeof rating === 'number' && (
                <span className={!config ? 'text-xs text-gray-500 dark:text-gray-400 font-semibold spec-sec' : ''}>
                    {rating} Rated
                </span>
            )}
        </div>
    );
};

const FilterControls = ({ activeFilters, onRemoveFilter, onResetFilters }) => {
    const allFiltersActive = activeFilters.length === ALL_FILTER_TYPES.length;

    return (
        <div className="flex justify-center items-center gap-3 mb-6 max-w-2xl mx-auto min-h-[34px]">
            <div className="flex flex-wrap justify-center gap-2">
                {activeFilters.map(filterKey => {
                    const config = ROUND_TYPE_CONFIG[filterKey];
                    return (
                        <span
                            key={filterKey}
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-all duration-300 ${config.styles}`}
                        >
                            {config.label}
                            <button
                                onClick={() => onRemoveFilter(filterKey)}
                                className="p-0.5 -mr-1 rounded-full !bg-transparent focus:outline-none"
                                aria-label={`Remove ${config.label} filter`}
                            >
                                <FaTimes size={12} />
                            </button>
                        </span>
                    );
                })}
            </div>

            {!allFiltersActive && (
                <button
                    onClick={onResetFilters}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Reset filters"
                    title="Reset filters"
                >
                    <FaUndo size={14} />
                </button>
            )}
        </div>
    );
};


export default function ScoresPage({ user }) {
    const { uid: userId } = user;
    const [rounds, setRounds] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRoundId, setExpandedRoundId] = useState(null);
    const [courseHoles, setCourseHoles] = useState([]);
    const [isHolesLoading, setIsHolesLoading] = useState(false);
    const [editingRoundId, setEditingRoundId] = useState(null);
    const [roundFormData, setRoundFormData] = useState({});
    const [geminiPrompt, setGeminiPrompt] = useState('');
    const [geminiResponse, setGeminiResponse] = useState('');
    const [isGeminiLoading, setIsGeminiLoading] = useState(false);
    const [geminiError, setGeminiError] = useState(null);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [roundToDelete, setRoundToDelete] = useState(null);
    const [activeFilters, setActiveFilters] = useState(ALL_FILTER_TYPES);

    const BACKEND_API_URL = 'https://us-central1-disc-golf-notes.cloudfunctions.net/gemini-proxy-backend/api/gemini-insight';

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            setRounds([]);
            return;
        }
        const cacheKey = `userRounds-${userId}`;
        const cachedRounds = getCache(cacheKey);
        if (cachedRounds) {
            setRounds(cachedRounds);
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }
        const unsubscribe = subscribeToRounds(userId, (fetchedRounds) => {
            const uniqueRoundsMap = new Map();
            fetchedRounds.forEach(round => {
                const roundDate = normalizeDate(round.date);
                const key = round.id || `${round.courseName}-${roundDate?.getTime()}`;
                if (!uniqueRoundsMap.has(key)) {
                    uniqueRoundsMap.set(key, round);
                }
            });
            const deduplicatedRounds = Array.from(uniqueRoundsMap.values());
            // --- FIX --- Use the robust normalizeDate function for sorting
            deduplicatedRounds.sort((a, b) => {
                const dateB = normalizeDate(b.date)?.getTime() || 0;
                const dateA = normalizeDate(a.date)?.getTime() || 0;
                return dateB - dateA;
            });
            setRounds(deduplicatedRounds);
            setCache(cacheKey, deduplicatedRounds);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const averageRatingThisYear = useMemo(() => {
        const currentYear = new Date().getFullYear();

        const ratedRoundsThisYear = rounds.filter(round => {
            // --- FIX --- Use the robust normalizeDate function
            const roundDate = normalizeDate(round.date);
            return typeof round.rating === 'number' &&
                roundDate &&
                roundDate.getFullYear() === currentYear;
        });

        if (ratedRoundsThisYear.length === 0) {
            return null;
        }

        const totalRating = ratedRoundsThisYear.reduce((sum, round) => sum + round.rating, 0);
        return Math.round(totalRating / ratedRoundsThisYear.length);
    }, [rounds]);

    const handleRemoveFilter = (filterToRemove) => {
        setActiveFilters(prevFilters => prevFilters.filter(f => f !== filterToRemove));
    };
    const handleResetFilters = () => {
        setActiveFilters(ALL_FILTER_TYPES);
    };

    const filteredRounds = useMemo(() => {
        return rounds.filter(round => {
            if (!round.roundType) {
                return true;
            }
            return activeFilters.includes(round.roundType);
        });
    }, [rounds, activeFilters]);


    const handleToggleExpand = async (roundId) => {
        if (expandedRoundId === roundId) {
            setExpandedRoundId(null); setEditingRoundId(null); return;
        }
        const round = rounds.find(r => r.id === roundId);
        if (!round || !round.courseId) {
            toast.error("Could not find course data for this round."); return;
        }
        setIsHolesLoading(true); setExpandedRoundId(roundId);
        try {
            const courseDocRef = doc(db, `artifacts/${appId}/users/${userId}/courses`, round.courseId);
            const courseSnap = await getDoc(courseDocRef);
            if (courseSnap.exists()) {
                setCourseHoles(courseSnap.data().holes || []);
            } else {
                toast.error("Course details not found."); setCourseHoles([]);
            }
        } catch (error) {
            console.error("Error fetching course details:", error);
            toast.error("Failed to load hole details.");
        } finally {
            setIsHolesLoading(false);
        }
    };
    const handleEditClick = (e, round) => {
        e.stopPropagation();
        setEditingRoundId(round.id);
        setRoundFormData({
            tournamentName: round.tournamentName || '',
            rating: round.rating || '',
            notes: round.notes || '',
            roundType: round.roundType || ''
        });
    };
    const handleCancelEdit = (e) => {
        e.stopPropagation(); setEditingRoundId(null); setRoundFormData({});
    };
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setRoundFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleSaveChanges = async (e) => {
        e.stopPropagation();
        if (!editingRoundId) return;
        const originalRound = rounds.find(r => r.id === editingRoundId);
        const updatePromises = [];
        if (originalRound.tournamentName !== roundFormData.tournamentName) {
            updatePromises.push(updateRoundTournament(userId, editingRoundId, roundFormData.tournamentName));
        }
        if (Number(originalRound.rating) !== Number(roundFormData.rating)) {
            updatePromises.push(updateRoundRating(userId, editingRoundId, roundFormData.rating));
        }
        if (originalRound.notes !== roundFormData.notes) {
            updatePromises.push(updateRoundNotes(userId, editingRoundId, roundFormData.notes));
        }
        if (originalRound.roundType !== roundFormData.roundType) {
            updatePromises.push(updateRoundType(userId, editingRoundId, roundFormData.roundType));
        }
        if (updatePromises.length === 0) {
            toast.info("No changes were made.");
            setEditingRoundId(null);
            setExpandedRoundId(null);
            return;
        }
        try {
            await Promise.all(updatePromises);
            toast.success("Round details updated successfully!");
            setEditingRoundId(null);
            setExpandedRoundId(null);
        } catch (error) {
            toast.error(`Failed to save changes: ${error.message}`);
        }
    };
    const formatScoreToPar = (score) => {
        if (score === 0) return 'E'; if (score > 0) return `+${score}`; return score;
    };
    const getScoreColor = (score, par) => {
        if (par === null || score === null) return 'text-gray-800 dark:text-gray-100';
        const difference = score - par;
        if (difference < 0) return 'text-green-500'; if (difference > 0) return 'text-red-500';
        return 'text-gray-500 dark:text-gray-400';
    };
    const handleDeleteRound = (e, roundId, courseName, layoutName) => {
        e.stopPropagation();
        setRoundToDelete({ id: roundId, courseName, layoutName });
        setShowDeleteConfirmModal(true);
    };
    const confirmDelete = async () => {
        if (!roundToDelete || !userId) return;
        setShowDeleteConfirmModal(false);
        try {
            await deleteRound(userId, roundToDelete.id);
            toast.success(`Scorecard for ${roundToDelete.courseName} deleted successfully!`);
        } catch (error) {
            toast.error(`Failed to delete scorecard: ${error.message}`);
        }
        setRoundToDelete(null);
    };
    const cancelDelete = () => {
        setShowDeleteConfirmModal(false); setRoundToDelete(null);
    };

    const runGeminiAnalysis = async () => {
        if (!geminiPrompt.trim()) {
            toast.error("Please enter a question or prompt for Gemini.");
            return;
        }

        setIsGeminiLoading(true);
        setGeminiError(null);
        setGeminiResponse('');

        try {
            if (!user) {
                throw new Error("User is not authenticated.");
            }
            const idToken = await user.getIdToken();

            const enhancedRounds = await Promise.all(rounds.map(async (round) => {
                if (!round.courseId) {
                    return { ...round, courseDetails: null };
                }
                try {
                    const courseDocRef = doc(db, `artifacts/${appId}/users/${userId}/courses`, round.courseId);
                    const courseSnap = await getDoc(courseDocRef);
                    if (courseSnap.exists()) {
                        return { ...round, courseDetails: courseSnap.data() };
                    }
                } catch (error) {
                    console.error(`Error fetching course for round ${round.id}:`, error);
                }
                return { ...round, courseDetails: null };
            }));

            const response = await fetch(BACKEND_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    userId: userId,
                    prompt: geminiPrompt,
                    rounds: enhancedRounds
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'The server responded with an error.');
            }

            const data = await response.json();

            setGeminiResponse(data.response);

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            setGeminiError(error.message || "An unexpected error occurred.");
        } finally {
            setIsGeminiLoading(false);
        }
    };

    if (isLoading && rounds.length === 0) {
        return <div className="text-center p-8">Loading scores...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-black p-4 pb-36">
            <div>
                <h2 className="text-2xl font-bold mb-4 text-center pt-5 text-gray-800 dark:text-gray-100">My Scores</h2>
                <p className="text-md text-gray-600 dark:text-gray-400 text-center mb-4">Click a scorecard for more round details.</p>

                {averageRatingThisYear !== null && (
                    <div className="text-center mb-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date().getFullYear()} Average Rating:
                            <span className="font-bold text-lg text-gray-700 dark:text-gray-200 ml-2">{averageRatingThisYear}</span>
                        </p>
                    </div>
                )}

                <FilterControls
                    activeFilters={activeFilters}
                    onRemoveFilter={handleRemoveFilter}
                    onResetFilters={handleResetFilters}
                />

                {filteredRounds.length === 0 && !isLoading ? (
                    <div className="text-center text-gray-600 dark:text-gray-400 mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-md mx-auto">
                        <p>No scores match the selected filters.</p>
                        <p className="text-sm mt-2">Try clicking the reset icon to see all your rounds.</p>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto space-y-4">
                        {filteredRounds.map(round => {
                            const isExpanded = expandedRoundId === round.id;
                            const isEditing = editingRoundId === round.id;
                            const sortedHoles = round.scores ? Object.keys(round.scores).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)) : [];
                            return (
                                <div key={round.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300 border ${isEditing ? 'border-blue-500' : 'border-transparent'}`}>
                                    <ScorecardHeader type={round.roundType} rating={round.rating} />

                                    <div className="p-4">
                                        <div onClick={() => handleToggleExpand(round.id)} className="cursor-pointer">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {round.tournamentName && (
                                                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 leading-none mb-1.5">{round.tournamentName}</p>
                                                    )}
                                                    <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-none">{round.courseName}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                        {(() => {
                                                            // --- FIX --- Use the robust normalizeDate function for display
                                                            const displayDate = normalizeDate(round.date);
                                                            return displayDate ? format(displayDate, 'MMMM d, yyyy') : 'N/A Date';
                                                        })()}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0 w-20 flex flex-col items-end">
                                                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{round.totalScore}</p>
                                                    <p className={`text-lg font-semibold ${getScoreColor(round.scoreToPar, 0)}`}>{formatScoreToPar(round.scoreToPar)}</p>
                                                    {isExpanded && !isEditing && (
                                                        <button onClick={(e) => handleEditClick(e, round)} className="mt-2 p-2 !bg-transparent text-blue-600 dark:text-blue-400 hover:text-blue-800 button-p-0 dark:hover:text-blue-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10 relative" title="Edit Details">
                                                            <FaEdit size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                {isEditing ? (
                                                    <div className="space-y-4" onClick={e => e.stopPropagation()}>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Round Type</label>
                                                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                                                                <div className="flex items-center">
                                                                    <input type="radio" id={`roundTypeNone-${round.id}`} name="roundType" value="" checked={roundFormData.roundType === ''} onChange={handleFormChange} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                                                    <label htmlFor={`roundTypeNone-${round.id}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Casual</label>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <input type="radio" id={`roundTypeTournament-${round.id}`} name="roundType" value="tournament" checked={roundFormData.roundType === 'tournament'} onChange={handleFormChange} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                                                    <label htmlFor={`roundTypeTournament-${round.id}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Tournament</label>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <input type="radio" id={`roundTypeLeague-${round.id}`} name="roundType" value="league" checked={roundFormData.roundType === 'league'} onChange={handleFormChange} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                                                    <label htmlFor={`roundTypeLeague-${round.id}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">League</label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label htmlFor="tournamentName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tournament Name</label>
                                                            <input type="text" name="tournamentName" value={roundFormData.tournamentName} onChange={handleFormChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Round Rating</label>
                                                            <input type="number" name="rating" value={roundFormData.rating} onChange={handleFormChange} placeholder="e.g., 950" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Round Notes</label>
                                                            <textarea name="notes" value={roundFormData.notes} onChange={handleFormChange} rows="4" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                                                        </div>
                                                        <div className="flex items-center justify-between mt-4">
                                                            <div className="flex items-center space-x-2">
                                                                <button onClick={handleSaveChanges} className="flex items-center gap-2 text-sm !bg-green-600 text-white px-3 py-1 rounded-md hover:!bg-green-700"><FaSave size={14} /> Save</button>
                                                                <button onClick={handleCancelEdit} className="flex items-center gap-2 text-sm !bg-gray-500 text-white px-3 py-1 rounded-md hover:!bg-gray-600"><FaTimes size={14} /> Cancel</button>
                                                            </div>
                                                            <button onClick={(e) => handleDeleteRound(e, round.id, round.courseName, round.layoutName)} className="flex items-center gap-2 text-sm !bg-red-600 text-white px-3 py-1 rounded-md hover:!bg-red-700"><FaTrash size={14} /> Delete</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        {round.notes && (
                                                            <div className="mb-6">
                                                                <h4 className="font-semibold text-md mb-2 text-gray-700 dark:text-gray-300">Round Notes</h4>
                                                                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded-md">{round.notes}</p>
                                                            </div>
                                                        )}
                                                        <h4 className="font-semibold text-md text-gray-700 dark:text-gray-300">Hole Breakdown</h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{round.layoutName}</p>
                                                        {isHolesLoading ? <p className="text-center text-gray-500">Loading hole details...</p> : (
                                                            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2 text-center">
                                                                {sortedHoles.map(holeNumber => {
                                                                    const score = round.scores[holeNumber];
                                                                    const holeDetail = courseHoles.find(h => h.number.toString() === holeNumber);
                                                                    const par = holeDetail ? parseInt(holeDetail.par, 10) : null;
                                                                    return (
                                                                        <div key={holeNumber} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                                                                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Hole {holeNumber}</div>
                                                                            <div className={`text-xl font-bold ${getScoreColor(score, par)}`}>{score}</div>
                                                                            {par !== null && <div className="text-xs text-gray-500 dark:text-gray-400">Par {par}</div>}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div className="max-w-2xl mx-auto mt-8 mb-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Ask Gemini about your scores</h3>
                    <textarea value={geminiPrompt} onChange={(e) => setGeminiPrompt(e.target.value)} placeholder="E.g., 'What was my best round?' or 'Summarize my performance.'" rows="3" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500" disabled={isGeminiLoading} />
                    <button onClick={runGeminiAnalysis} className="mt-3 w-full !bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50" disabled={isGeminiLoading || !userId}>
                        {isGeminiLoading ? 'Analyzing...' : 'Get Score Insights from Gemini'}
                    </button>
                    {geminiError && (<p className="text-red-500 text-sm mt-3">Error: {geminiError}</p>)}
                    {geminiResponse && (
                        <div className="mt-5 p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Gemini's Insights:</h4>
                            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{geminiResponse}</p>
                        </div>
                    )}
                </div>
                {roundToDelete && (<DeleteConfirmationModal key={roundToDelete.id} isOpen={showDeleteConfirmModal} onClose={cancelDelete} onConfirm={confirmDelete} message={`Are you sure you want to delete the scorecard for ${roundToDelete.courseName} (${roundToDelete.layoutName})? This cannot be undone.`} />)}
            </div>
        </div>
    );
}