import React, { useState, useEffect, useRef, useMemo } from 'react';
import DiscFormModal from '../components/AddDiscModal';
import AddDiscFromAPImodal from '../components/AddDiscFromAPImodal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import {
    addDiscToBag,
    subscribeToUserDiscs,
    subscribeToArchivedUserDiscs,
    updateDiscInBag,
    deleteDiscFromBag
} from '../services/firestoreService';
import { getCache, setCache, getTtlCache, setTtlCache } from '../utilities/cache.js';
import { toast } from 'react-toastify';
import { FaTrash } from 'react-icons/fa';
import { Archive, FolderOpen, ChevronDown, ChevronUp, Pencil, MoreVertical } from 'lucide-react';

const FlightPath = ({ speed, glide, turn, fade, isExpanded }) => {
    const pathRef = useRef(null);
    const [pathLength, setPathLength] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const pathData = useMemo(() => {
        if ([speed, glide, turn, fade].some(n => typeof n !== 'number')) return null;

        // --- UPDATED --- Calculation is mirrored for a left-handed perspective
        const startX = 50, startY = 110, endX = 50, endY = 10;
        const control1X = startX + (turn * 15); // Negative turn moves path to the left (lower X)
        const control2X = endX + (fade * 9);   // Positive fade moves path to the right (higher X)
        const control1Y = startY * 0.7 - (glide * 2);
        const control2Y = endY * 1.5 + (glide * 2);
        return `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`;
    }, [speed, glide, turn, fade]);

    useEffect(() => {
        if (pathRef.current) {
            setPathLength(pathRef.current.getTotalLength());
        }
    }, [pathData]);

    useEffect(() => {
        setIsAnimating(false);
        if (isExpanded && pathLength > 0) {
            const timer = setTimeout(() => setIsAnimating(true), 50);
            return () => clearTimeout(timer);
        }
    }, [isExpanded, pathLength]);

    if (!pathData) {
        return (
            <div className="w-20 h-24 flex items-center justify-center text-xs text-gray-400">
                No flight data
            </div>
        );
    }

    return (
        <div className="w-20 h-24" title={`Flight: ${speed} | ${glide} | ${turn} | ${fade}`}>
            <svg viewBox="0 0 100 120" className="w-full h-full">
                <line x1="50" y1="10" x2="50" y2="110" strokeDasharray="3,3" className="text-gray-300 dark:text-gray-600" strokeWidth="1" />
                <path
                    ref={pathRef}
                    d={pathData}
                    className="text-blue-500"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={pathLength}
                    strokeDashoffset={isAnimating ? 0 : pathLength}
                    style={{ transition: isAnimating ? 'stroke-dashoffset 0.8s ease-out' : 'none' }}
                />
            </svg>
        </div>
    );
};


const Accordion = ({ title, children, isOpen, onToggle }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-full mx-auto mb-6">
            <button
                className="w-full flex justify-between items-center p-6 text-xl font-semibold text-gray-800 dark:text-white focus:outline-none !bg-white dark:!bg-gray-800 rounded-lg"
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                {title}
                {isOpen ? <ChevronUp size={24} className="text-gray-800 dark:text-white" /> : <ChevronDown size={24} className="text-gray-800 dark:text-white" />}
            </button>
            {isOpen && (
                <div className="px-6 pb-6 pt-2 border-t border-gray-200 dark:border-gray-700">
                    {children}
                </div>
            )}
        </div>
    );
};

export default function InTheBagPage({ user: currentUser }) {
    const [activeDiscs, setActiveDiscs] = useState([]);
    const [archivedDiscs, setArchivedDiscs] = useState([]);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    const [currentDiscToEdit, setCurrentDiscToEdit] = useState(null);
    const [openDiscActionsId, setOpenDiscActionsId] = useState(null);
    const dropdownRef = useRef(null);
    const [apiDiscs, setApiDiscs] = useState([]);
    const [isApiLoading, setIsApiLoading] = useState(true);
    const [apiFetchError, setApiFetchError] = useState(null);
    const [pendingApiDisc, setPendingApiDisc] = useState(null);
    const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, disc: null });
    const [openAccordions, setOpenAccordions] = useState({});
    const [expandedDiscId, setExpandedDiscId] = useState(null);

    useEffect(() => {
        const fetchDiscsFromApi = async () => {
            const cacheKey = 'apiDiscs';
            const cachedData = getTtlCache(cacheKey, 1440);
            if (cachedData) {
                setApiDiscs(cachedData);
                setIsApiLoading(false);
                setApiFetchError(null);
                return;
            }
            try {
                const response = await fetch('https://discit-api.fly.dev/disc');
                if (!response.ok) {
                    throw new Error(`API error! Status: ${response.status}`);
                }
                const data = await response.json();
                setTtlCache(cacheKey, data);
                setApiDiscs(data);
                setApiFetchError(null);
            } catch (error) {
                console.error("Failed to fetch discs from API:", error);
                setApiFetchError("Could not load disc database. Please try again later.");
            } finally {
                setIsApiLoading(false);
            }
        };
        fetchDiscsFromApi();
    }, []);

    const dynamicDiscTypes = useMemo(() => {
        if (!apiDiscs || apiDiscs.length === 0) return [];
        const allTypes = apiDiscs.map(disc => disc.category);
        const uniqueTypes = [...new Set(allTypes)];
        return uniqueTypes.filter(type => type).sort();
    }, [apiDiscs]);

    useEffect(() => {
        let unsubscribeActive;
        let unsubscribeArchived;
        if (currentUser && currentUser.uid) {
            const activeCacheKey = `userDiscs-active-${currentUser.uid}`;
            const archivedCacheKey = `userDiscs-archived-${currentUser.uid}`;
            const cachedActive = getCache(activeCacheKey);
            if (cachedActive) {
                setActiveDiscs(cachedActive);
            }
            unsubscribeActive = subscribeToUserDiscs(currentUser.uid, (discs) => {
                setActiveDiscs(discs);
                setCache(activeCacheKey, discs);
            });
            const cachedArchived = getCache(archivedCacheKey);
            if (cachedArchived) {
                setArchivedDiscs(cachedArchived);
            }
            unsubscribeArchived = subscribeToArchivedUserDiscs(currentUser.uid, (discs) => {
                setArchivedDiscs(discs);
                setCache(archivedCacheKey, discs);
            });
        } else {
            setActiveDiscs([]);
            setArchivedDiscs([]);
        }
        return () => {
            if (unsubscribeActive) unsubscribeActive();
            if (unsubscribeArchived) unsubscribeArchived();
        };
    }, [currentUser]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDiscActionsId && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpenDiscActionsId(null);
            }
        };
        if (openDiscActionsId) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDiscActionsId]);

    const handleToggleExpand = (discId) => {
        setExpandedDiscId(prevId => (prevId === discId ? null : discId));
    };

    const openAddDiscModal = () => {
        setIsApiModalOpen(true);
    };

    const openEditDiscModal = (disc) => {
        setCurrentDiscToEdit(disc);
        setPendingApiDisc(null);
        setIsDetailsModalOpen(true);
        setOpenDiscActionsId(null);
    };

    const handleSelectDiscFromApi = (discDataFromApi) => {
        setPendingApiDisc(discDataFromApi);
        setIsApiModalOpen(false);
        setIsDetailsModalOpen(true);
    };

    const handleDetailsSubmit = async (detailsData) => {
        if (!currentUser || !currentUser.uid) {
            toast.error("An error occurred. Please try again.");
            return;
        }
        const sanitizedData = {
            ...detailsData,
            speed: detailsData.speed != null && detailsData.speed !== '' ? parseInt(detailsData.speed, 10) : null,
            glide: detailsData.glide != null && detailsData.glide !== '' ? parseInt(detailsData.glide, 10) : null,
            turn: detailsData.turn != null && detailsData.turn !== '' ? parseInt(detailsData.turn, 10) : null,
            fade: detailsData.fade != null && detailsData.fade !== '' ? parseInt(detailsData.fade, 10) : null,
        };
        try {
            if (currentDiscToEdit) {
                await updateDiscInBag(currentUser.uid, currentDiscToEdit.id, sanitizedData);
                toast.success(`${sanitizedData.name} updated successfully!`);
            } else if (pendingApiDisc) {
                const allDiscs = [...activeDiscs, ...archivedDiscs];
                const maxOrder = allDiscs.length > 0 ? Math.max(...allDiscs.map(d => d.displayOrder || 0)) : -1;
                const finalDiscData = {
                    ...pendingApiDisc,
                    ...sanitizedData,
                    isArchived: false,
                    displayOrder: maxOrder + 1,
                };
                await addDiscToBag(currentUser.uid, finalDiscData);
                toast.success(`${finalDiscData.name} added to your bag!`);
            }
            setIsDetailsModalOpen(false);
            setCurrentDiscToEdit(null);
            setPendingApiDisc(null);
        } catch (error) {
            toast.error("Failed to save disc.");
            console.error("Save disc error:", error);
        }
    };

    const handleToggleDiscActions = (discId) => {
        setOpenDiscActionsId(prevId => (prevId === discId ? null : discId));
    };

    const handleArchiveDisc = async (discId, discName) => {
        if (!currentUser || !currentUser.uid) { toast.error("You must be logged in."); return; }
        try {
            await updateDiscInBag(currentUser.uid, discId, { isArchived: true });
            toast.success(`${discName} moved to 'On the Shelf'!`);
            setOpenDiscActionsId(null);
        } catch (error) {
            toast.error("Failed to archive disc.");
        }
    };

    const handleRestoreDisc = async (discId, discName) => {
        if (!currentUser || !currentUser.uid) { toast.error("You must be logged in."); return; }
        try {
            await updateDiscInBag(currentUser.uid, discId, { isArchived: false });
            toast.success(`${discName} restored to your bag!`);
            setOpenDiscActionsId(null);
        } catch (error) {
            toast.error("Failed to restore disc.");
        }
    };

    const handleDeleteDisc = (discId, discName) => {
        if (!currentUser || !currentUser.uid) {
            toast.error("You must be logged in.");
            return;
        }
        setDeleteModalState({ isOpen: true, disc: { id: discId, name: discName } });
        setOpenDiscActionsId(null);
    };

    const confirmDeleteDisc = async () => {
        if (!deleteModalState.disc) return;
        try {
            await deleteDiscFromBag(currentUser.uid, deleteModalState.disc.id);
            toast.success(`'${deleteModalState.disc.name}' permanently deleted.`);
        } catch (error) {
            toast.error("Failed to delete disc.");
        } finally {
            setDeleteModalState({ isOpen: false, disc: null });
        }
    };

    const cancelDeleteDisc = () => {
        setDeleteModalState({ isOpen: false, disc: null });
    };

    const groupedActiveDiscs = activeDiscs.reduce((acc, disc) => {
        const type = (disc.type && disc.type.trim() !== '') ? disc.type : 'Other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(disc);
        return acc;
    }, {});

    const discTypeOrder = [
        'Distance Driver', 'Hybrid Driver', 'Control Driver', 'Midrange', 'Approach Discs', 'Putter'
    ];

    const sortedActiveDiscTypes = Object.keys(groupedActiveDiscs).sort((a, b) => {
        const indexA = discTypeOrder.indexOf(a);
        const indexB = discTypeOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const handleToggleAccordion = (type) => {
        setOpenAccordions(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const collapseAll = () => {
        setOpenAccordions({});
        setExpandedDiscId(null);
    };

    if (!currentUser) {
        return <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-black"><p className="text-lg text-gray-700 dark:text-gray-300">Please log in to view and manage your disc bag.</p></div>;
    }

    const renderDiscItem = (disc, type) => {
        const isExpanded = expandedDiscId === disc.id;
        return (
            <li key={disc.id} className="relative">
                <button
                    onClick={() => handleToggleExpand(disc.id)}
                    aria-expanded={isExpanded}
                    className={`
                        w-full flex border rounded-t-lg shadow-sm overflow-hidden text-left
                        transition-shadow hover:shadow-md button-p-0
                        ${isExpanded ? 'rounded-b-none' : 'rounded-b-lg'}
                        ${type === 'active' ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}
                    `}
                >
                    <div className="w-2 flex-shrink-0" style={{ backgroundColor: disc.color || 'transparent' }} />
                    <div className="p-4 flex-1 min-w-0">
                        <h4 className={`text-lg font-normal ${type === 'active' ? 'text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                            <span className='font-bold'>{disc.manufacturer}</span> {disc.name}
                        </h4>
                        <div className="mt-1">
                            <p className={`text-sm ${type === 'active' ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {disc.notes || <span className="italic text-gray-400 dark:text-gray-500">No notes for this disc.</span>}
                            </p>
                            {disc.weight && (
                                <p className={`text-xs mt-1 ${type === 'active' ? 'text-gray-500 dark:text-gray-500' : 'text-gray-500 dark:text-gray-500'}`}>
                                    Weight: {disc.weight}g
                                </p>
                            )}
                        </div>
                    </div>
                </button>

                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2"
                >
                    <button
                        onClick={() => handleToggleDiscActions(disc.id)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-full !bg-transparent hover:!bg-gray-100 dark:hover:!bg-gray-700/50 transition-colors"
                        title="Disc Options"
                    >
                        <MoreVertical size={20} />
                    </button>
                    {openDiscActionsId === disc.id && (
                        <div ref={dropdownRef} className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-600">
                            {type === 'active' ? (
                                <>
                                    <button onClick={() => openEditDiscModal(disc)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-md">
                                        <Pencil size={16} className="mr-2" /> Edit
                                    </button>
                                    <button onClick={() => handleArchiveDisc(disc.id, disc.name)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                                        <Archive size={16} className="mr-2" /> Move to Shelf
                                    </button>
                                    <button onClick={() => handleDeleteDisc(disc.id, disc.name)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-b-md">
                                        <FaTrash size={16} className="mr-2" /> Delete
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => handleRestoreDisc(disc.id, disc.name)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-md">
                                        <FolderOpen size={16} className="mr-2" /> Restore to Bag
                                    </button>
                                    <button onClick={() => handleDeleteDisc(disc.id, disc.name)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-b-md">
                                        <FaTrash size={16} className="mr-2" /> Delete
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {isExpanded && (
                    <div className="px-4 pb-4 border-x border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
                        <h5 className="text-center text-sm font-bold text-gray-700 dark:text-gray-300 pt-3 mb-2">Flight Path</h5>
                        <div className="flex justify-center">
                            <FlightPath isExpanded={isExpanded} speed={disc.speed} glide={disc.glide} turn={disc.turn} fade={disc.fade} />
                        </div>
                        <p className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 mt-1">
                            {`${disc.speed ?? 'N/A'} | ${disc.glide ?? 'N/A'} | ${disc.turn ?? 'N/A'} | ${disc.fade ?? 'N/A'}`}
                        </p>
                    </div>
                )}
            </li>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8 pb-48">
            <h2 className="text-2xl font-bold text-center pt-5 mb-2">In Your Bag</h2>
            {activeDiscs.length > 0 && (
                <p className="text-md text-gray-600 dark:text-gray-400 text-center mb-6">{activeDiscs.length} active discs</p>
            )}

            {activeDiscs.length === 0 && archivedDiscs.length === 0 ? (
                <p className="text-center text-gray-600 dark:text-gray-300 text-lg">
                    You haven't added any discs to your bag yet! Click the '+' button to get started.
                </p>
            ) : (
                <>
                    <div className="max-w-full mx-auto mb-2 flex justify-start space-x-4">
                        <button onClick={collapseAll} className="!text-sm text-gray-400 dark:text-blue-400 !font-normal hover:underline !bg-transparent">Collapse All</button>
                    </div>
                    <div className="space-y-4">
                        {sortedActiveDiscTypes.map(type => (
                            <Accordion
                                key={type}
                                title={
                                    <span className='text-black dark:text-blue-400 text-xl'>
                                        {type} <span className='text-black dark:text-white text-base font-light'>({groupedActiveDiscs[type].length} discs)</span>
                                    </span>
                                }
                                isOpen={!!openAccordions[type]}
                                onToggle={() => handleToggleAccordion(type)}
                            >
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    {groupedActiveDiscs[type]
                                        .sort((a, b) => {
                                            const speedA = parseInt(a.speed, 10) || 0;
                                            const speedB = parseInt(b.speed, 10) || 0;
                                            if (speedA !== speedB) {
                                                return speedB - speedA;
                                            }
                                            const nameA = (a.name || '').trim();
                                            const nameB = (b.name || '').trim();
                                            return nameA.localeCompare(nameB);
                                        })
                                        .map(disc => renderDiscItem(disc, 'active'))
                                    }
                                </ul>
                            </Accordion>
                        ))}
                    </div>
                </>
            )}

            {archivedDiscs.length > 0 && (
                <>
                    <hr className="my-8 border-t border-gray-200 dark:border-gray-700" />
                    <Accordion
                        title={`On the Shelf (${archivedDiscs.length} discs)`}
                        isOpen={!!openAccordions['archived']}
                        onToggle={() => handleToggleAccordion('archived')}
                    >
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 relative z-10">
                            {archivedDiscs
                                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                                .map(disc => renderDiscItem(disc, 'archived'))
                            }
                        </ul>
                    </Accordion>
                </>
            )}

            <button onClick={openAddDiscModal} className="fab-fix fixed bottom-20 right-6 !bg-blue-600 hover:!bg-blue-700 text-white !rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-50" title="Add New Disc">
                <span className="text-2xl">＋</span>
            </button>

            <AddDiscFromAPImodal
                isOpen={isApiModalOpen}
                onClose={() => setIsApiModalOpen(false)}
                onSubmit={handleSelectDiscFromApi}
                apiDiscs={apiDiscs}
                isLoading={isApiLoading}
                fetchError={apiFetchError}
            />

            <DiscFormModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setCurrentDiscToEdit(null);
                    setPendingApiDisc(null);
                }}
                onSubmit={handleDetailsSubmit}
                initialData={currentDiscToEdit || pendingApiDisc}
                discTypes={dynamicDiscTypes}
            />

            <DeleteConfirmationModal
                isOpen={deleteModalState.isOpen}
                onClose={cancelDeleteDisc}
                onConfirm={confirmDeleteDisc}
                message={`Are you sure you want to permanently delete '${deleteModalState.disc?.name}'? This cannot be undone.`}
            />
        </div>
    );
}