import React, { useState, useEffect, useRef } from 'react';
import CourseList from '../components/CourseList';
import HoleList from '../components/HoleList';
import AddCourseModal from '../components/AddCourseModal';
import AddHoleModal from '../components/AddHoleModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

import {
    subscribeToCourses,
    addCourse,
    deleteCourse,
    addHoleToCourse,
    updateHoleInCourse,
    deleteHoleFromCourse,
    reorderHolesInCourse,
    subscribeToUserDiscs,
} from '../services/firestoreService.jsx';

import { getCache, setCache } from '../utilities/cache.js';

export default function Courses({ user }) {
    const { uid: userId } = user;

    // Component State
    const [courses, setCourses] = useState([]);
    const [discs, setDiscs] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [editingHoleData, setEditingHoleData] = useState({});

    // UI State
    const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
    const [newCourseName, setNewCourseName] = useState('');
    const [newCourseTournamentName, setNewCourseTournamentName] = useState('');
    const [newCourseClassification, setNewCourseClassification] = useState('');
    const [swipedCourseId, setSwipedCourseId] = useState(null);
    const [isAddHoleModalOpen, setIsAddHoleModalOpen] = useState(false);
    const [isDeleteConfirmationModalOpen, setIsDeleteConfirmationModalOpen] = useState(false);
    const [holeToDeleteId, setHoleToDeleteId] = useState(null);
    const [appMessage, setAppMessage] = useState({ type: '', text: '' });

    // Refs
    const scrollContainerRef = useRef(null);
    const swipeRefs = useRef({});
    const holeListRef = useRef(null);

    const showAppMessage = (type, text) => {
        setAppMessage({ type, text });
        setTimeout(() => {
            setAppMessage({ type: '', text: '' });
        }, 5000);
    };

    const handleToggleEditingHole = (holeId, currentHoleData) => {
        setSelectedCourse(prevCourse => {
            if (!prevCourse) return null;
            return {
                ...prevCourse,
                holes: prevCourse.holes.map(hole =>
                    hole.id === holeId ? { ...hole, editing: !hole.editing } : { ...hole, editing: false }
                )
            };
        });
        setEditingHoleData(currentHoleData);
    };

    // ✨ --- REFACTOR COMPLETE --- ✨

    // Hook 1: Fetches and caches data. Runs only when the user changes.
    useEffect(() => {
        if (!userId) {
            setCourses([]);
            setDiscs([]);
            return;
        }

        // --- Cache and fetch Courses ---
        const cachedCourses = getCache(`userCourses-${userId}`);
        if (cachedCourses) {
            setCourses(cachedCourses);
        }
        const unsubscribeCourses = subscribeToCourses(userId, (fetchedCourses) => {
            const sortedCourses = [...fetchedCourses].sort((a, b) => a.name.localeCompare(b.name));
            setCourses(sortedCourses);
            setCache(`userCourses-${userId}`, sortedCourses);
        });

        // --- Cache and fetch Discs ---
        const cachedDiscs = getCache(`userDiscs-${userId}`);
        if (cachedDiscs) {
            setDiscs(cachedDiscs);
        }
        const unsubscribeDiscs = subscribeToUserDiscs(userId, (fetchedDiscs) => {
            setDiscs(fetchedDiscs);
            setCache(`userDiscs-${userId}`, fetchedDiscs);
        });

        return () => {
            unsubscribeCourses();
            unsubscribeDiscs();
        };
    }, [userId]);

    // Hook 2: Handles the logic for the selected course view.
    // Runs only when the master `courses` list updates or a different course is selected.
    useEffect(() => {
        if (selectedCourse) {
            const updatedSelectedCourse = courses.find(c => c.id === selectedCourse.id);
            if (updatedSelectedCourse) {
                // This logic preserves the "editing" state of holes when the master course list is updated in the background.
                setSelectedCourse(prevSelected => {
                    if (!prevSelected || !prevSelected.holes) return updatedSelectedCourse;
                    const mergedHoles = updatedSelectedCourse.holes.map(fetchedHole => {
                        const prevHole = prevSelected.holes.find(h => h.id === fetchedHole.id);
                        return { ...fetchedHole, editing: !!prevHole?.editing };
                    });
                    return { ...updatedSelectedCourse, holes: mergedHoles };
                });
            } else {
                // If the selected course was deleted (e.g., on another device), clear the selection.
                setSelectedCourse(null);
            }
        }
    }, [courses, selectedCourse?.id]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (selectedCourse && holeListRef.current && !holeListRef.current.contains(event.target)) {
                const isClickOnModal = event.target.closest('.modal-overlay') || event.target.closest('.modal-content');
                const isClickOnHoleItem = event.target.closest('.HoleItem') || event.target.closest('li.mb-4');
                if (!isClickOnModal && !isClickOnHoleItem) {
                    closeAllHoleEdits();
                }
            }
        }
        if (selectedCourse) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selectedCourse]);

    const closeAllHoleEdits = () => {
        if (!selectedCourse) return;
        setSelectedCourse(prev => {
            if (!prev) return null;
            return {
                ...prev,
                holes: prev.holes.map(hole => ({ ...hole, editing: false }))
            };
        });
        setEditingHoleData({});
    };

    const handleTouchStart = (e, id) => {
        swipeRefs.current[id] = { startX: e.touches[0].clientX, currentX: 0 };
        if (swipedCourseId && swipedCourseId !== id) {
            const prevEl = document.getElementById(`course-${swipedCourseId}`);
            if (prevEl) {
                prevEl.style.transition = 'transform 0.3s ease';
                prevEl.style.transform = 'translateX(0)';
            }
            setSwipedCourseId(null);
        }
        const el = document.getElementById(`course-${id}`);
        if (el) {
            el.style.transition = 'transform 0.0s ease';
        }
    };

    const handleTouchMove = (e, id) => {
        const swipeRef = swipeRefs.current[id];
        if (!swipeRef) return;
        const deltaX = e.touches[0].clientX - swipeRef.startX;
        const el = document.getElementById(`course-${id}`);
        if (!el) return;
        const transformX = Math.max(-80, Math.min(0, deltaX));
        el.style.transform = `translateX(${transformX}px)`;
        swipeRef.currentX = transformX;
    };

    const handleTouchEnd = (id) => {
        const swipeRef = swipeRefs.current[id];
        if (!swipeRef) return;
        const el = document.getElementById(`course-${id}`);
        if (el) {
            el.style.transition = 'transform 0.3s ease';
        }
        if (swipeRef.currentX <= -40) {
            if (el) el.style.transform = `translateX(-80px)`;
            setSwipedCourseId(id);
        } else {
            if (el) el.style.transform = `translateX(0)`;
            setSwipedCourseId(null);
        }
        swipeRefs.current[id] = null;
    };

    const handleAddCourse = async (courseName, tournamentName, classification) => {
        if (!userId) {
            showAppMessage('error', "User not authenticated.");
            return;
        }
        try {
            await addCourse(courseName, tournamentName, classification, userId);
            setIsAddCourseModalOpen(false);
            setNewCourseName('');
            setNewCourseTournamentName('');
            setNewCourseClassification('');
            showAppMessage('success', `Course "${courseName}" added successfully!`);
        } catch (error) {
            console.error("Failed to add course:", error);
            showAppMessage('error', `Failed to add course: ${error.message}`);
        }
    };

    const handleDeleteCourse = async (id) => {
        if (!userId) {
            showAppMessage('error', "User not authenticated.");
            return;
        }
        try {
            const courseName = courses.find(c => c.id === id)?.name || 'selected course';
            await deleteCourse(id, userId);
            if (swipedCourseId === id) setSwipedCourseId(null);
            if (selectedCourse?.id === id) setSelectedCourse(null);
            showAppMessage('success', `Course "${courseName}" deleted successfully!`);
        } catch (error) {
            console.error("Failed to delete course:", error);
            showAppMessage('error', `Failed to delete course: ${error.message}`);
        }
    };

    const deleteHoleConfirmed = async (holeIdToDelete) => {
        if (!selectedCourse || !userId) {
            showAppMessage('error', "User not authenticated or course not selected.");
            return;
        }
        try {
            const holeNumber = selectedCourse.holes.find(h => h.id === holeIdToDelete)?.number || '';
            await deleteHoleFromCourse(selectedCourse.id, holeIdToDelete, userId);
            showAppMessage('success', `Hole ${holeNumber} deleted successfully!`);
        } catch (error) {
            console.error("Failed to delete hole:", error);
            showAppMessage('error', `Failed to delete hole: ${error.message}`);
        }
    };

    const handleDeleteHoleClick = (holeId) => {
        setHoleToDeleteId(holeId);
        setIsDeleteConfirmationModalOpen(true);
    };

    const handleConfirmDeleteHole = () => {
        if (holeToDeleteId) {
            deleteHoleConfirmed(holeToDeleteId);
            setIsDeleteConfirmationModalOpen(false);
            setHoleToDeleteId(null);
            closeAllHoleEdits();
        }
    };

    const handleCancelDeleteHole = () => {
        setIsDeleteConfirmationModalOpen(false);
        setHoleToDeleteId(null);
    };

    const handleAddHole = async (holeNumber, holePar, holeDistance, holeNote, discId = null) => {
        const newHole = {
            id: `${selectedCourse.id}-${Date.now()}`,
            number: holeNumber,
            par: parseInt(holePar, 10) || 0,
            distance: parseFloat(holeDistance) || null,
            note: holeNote || '',
            discId: discId,
        };
        try {
            await addHoleToCourse(selectedCourse.id, newHole, userId);
            setIsAddHoleModalOpen(false);
            showAppMessage('success', `Hole ${newHole.number} added successfully!`);
        } catch (error) {
            console.error("Failed to add hole:", error);
            showAppMessage('error', `Failed to add hole: ${error.message}`);
        }
    };

    const handleSaveHoleChanges = async (holeId) => {
        const updatedHole = {
            id: holeId,
            number: editingHoleData.number,
            par: parseInt(editingHoleData.par, 10) || 0,
            distance: parseFloat(editingHoleData.distance) || null,
            note: editingHoleData.note || '',
            discId: editingHoleData.discId || null,
        };
        try {
            await updateHoleInCourse(selectedCourse.id, holeId, updatedHole, userId);
            setEditingHoleData({});
            closeAllHoleEdits();
            showAppMessage('success', `Hole ${updatedHole.number} changes saved!`);
        } catch (error) {
            console.error("Failed to save hole changes:", error);
            showAppMessage('error', `Failed to save hole changes: ${error.message}`);
        }
    };

    const backToList = () => {
        closeAllHoleEdits();
        setSelectedCourse(null);
    };

    const onDragEnd = async (result) => {
        const { source, destination } = result;
        if (!destination || source.index === destination.index || !selectedCourse || !userId) {
            return;
        }
        const currentHoles = Array.from(selectedCourse.holes);
        const [reorderedHole] = currentHoles.splice(source.index, 1);
        currentHoles.splice(destination.index, 0, reorderedHole);
        const holesToSave = currentHoles.map(({ editing, ...rest }) => rest);
        try {
            await reorderHolesInCourse(selectedCourse.id, holesToSave, userId);
            showAppMessage('success', 'Holes reordered successfully!');
        } catch (error) {
            console.error("Failed to reorder holes:", error);
            showAppMessage('error', `Failed to reorder holes: ${error.message}`);
        }
    };

    return (
        <div ref={scrollContainerRef} className="max-h-screen bg-gray-100 dark:bg-gray-900 p-4 overflow-y-auto pb-48">
            {appMessage.text && (
                <div className={`px-4 py-3 rounded relative mb-4
                    ${appMessage.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300' : 'bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-300'}`}
                    role="alert">
                    <span className="block sm:inline">{appMessage.text}</span>
                </div>
            )}

            {selectedCourse ? (
                <div className="relative min-h-screen bg-gray-100 dark:bg-gray-900 p-4 pt-5">
                    <div className="text-center mb-6 pt-5">
                        <h2 className="text-2xl font-bold mb-3 dark:text-white">
                            {selectedCourse.name}
                        </h2>
                        {selectedCourse.tournamentName && (
                            <p className="text-lg text-gray-600 dark:text-gray-400">{selectedCourse.tournamentName}</p>
                        )}
                        {selectedCourse.classification && (
                            <p className="text-md text-gray-500 dark:text-gray-500 italic">
                                Style: {selectedCourse.classification.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </p>
                        )}
                    </div>
                    <div ref={holeListRef}>
                        <HoleList
                            holes={selectedCourse.holes || []}
                            editingHoleData={editingHoleData}
                            setEditingHoleData={setEditingHoleData}
                            toggleEditing={(holeId, currentHoleData) => handleToggleEditingHole(holeId, currentHoleData)}
                            saveHoleChanges={handleSaveHoleChanges}
                            deleteHole={handleDeleteHoleClick}
                            onDragEnd={onDragEnd}
                            discs={discs}
                            backToList={backToList}
                        />
                    </div>

                    <button
                        onClick={() => setIsAddHoleModalOpen(true)}
                        className={`fixed bottom-24 right-4 !bg-blue-600 hover:bg-blue-700 text-white !rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-40`}
                        aria-label="Add Hole">
                        <span className="text-2xl">＋</span>
                    </button>

                    <AddHoleModal
                        isOpen={isAddHoleModalOpen}
                        onClose={() => setIsAddHoleModalOpen(false)}
                        onAddHole={handleAddHole}
                        discs={discs}
                    />

                    <DeleteConfirmationModal
                        isOpen={isDeleteConfirmationModalOpen}
                        onClose={handleCancelDeleteHole}
                        onConfirm={handleConfirmDeleteHole}
                        message={`Are you sure you want to delete Hole ${selectedCourse.holes.find(h => h.id === holeToDeleteId)?.number || ''}? This cannot be undone.`}
                    />
                </div>
            ) : (
                <>
                    <h2 className="text-2xl font-bold mb-3 text-center pt-5 dark:text-white">Your Courses</h2>
                    <p className='text-center text-gray-600 dark:text-gray-400'>Beyond the scorecard, this is your tactical journal. </p>
                    <p className='text-center text-gray-600 dark:text-gray-400 mb-6'>Break down every hole and craft the strategy to shave strokes off your game.</p>

                    <button
                        onClick={() => setIsAddCourseModalOpen(true)}
                        className={`fixed bottom-24 right-4 !bg-blue-600 hover:bg-blue-700 text-white !rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-40`}
                        aria-label="Add Course">
                        <span className="text-2xl">＋</span>
                    </button>

                    <AddCourseModal
                        isOpen={isAddCourseModalOpen}
                        onClose={() => setIsAddCourseModalOpen(false)}
                        onSubmit={handleAddCourse}
                        newCourseName={newCourseName}
                        setNewCourseName={setNewCourseName}
                        newCourseTournamentName={newCourseTournamentName}
                        setNewCourseTournamentName={setNewCourseTournamentName}
                        newCourseClassification={newCourseClassification}
                        setNewCourseClassification={setNewCourseClassification}
                    />
                    <CourseList
                        courses={courses}
                        onSelectCourse={setSelectedCourse}
                        onDeleteCourse={handleDeleteCourse}
                        swipedCourseId={swipedCourseId}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    />
                </>
            )}
        </div>
    );
}