import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLongPress } from '../hooks/useLongPress';
import Portal from './Portal';
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
import '../styles/InTheBagPage.css';

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

const DiscItem = ({
    disc,
    type,
    openDiscActionsId,
    dropdownRef,
    actions,
    isLast
}) => {
    const itemRef = useRef(null);
    const [menuStyle, setMenuStyle] = useState({});

    const onLongPress = () => {
        if (itemRef.current) {
            const rect = itemRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 130;
            const topPosition = spaceBelow < menuHeight ? rect.top - menuHeight - 5 : rect.top + rect.height + 5;

            setMenuStyle({
                position: 'fixed',
                top: `${topPosition}px`,
                right: `${window.innerWidth - rect.right}px`,
                width: `192px`
            });
        }
        actions.handleToggleDiscActions(disc.id);
    };

    const longPressEvents = useLongPress(onLongPress, { delay: 400 });
    const borderClass = isLast ? '' : 'border-b border-gray-200 dark:border-gray-700';

    return (
        <li
            ref={itemRef}
            className={`disc-item p-4 flex justify-between items-center relative select-none ${borderClass} ${openDiscActionsId === disc.id ? 'z-30' : ''}`}
            {...longPressEvents}
        >
            <div className="flex-grow">
                <h4 className={`text-lg font-normal text-gray-800 dark:text-white`}>
                    <span className='font-bold'>{disc.manufacturer}</span> {disc.plastic ? `${disc.plastic}` : ''} {disc.name}
                </h4>
                <p className={`text-sm text-gray-600 dark:text-gray-400`}>
                    {disc.speed !== undefined ? `Speed: ${disc.speed} | Glide: ${disc.glide} | Turn: ${disc.turn} | Fade: ${disc.fade}` : `Color: ${disc.color || ''}`}
                </p>
            </div>
            {openDiscActionsId === disc.id && (
                <Portal>
                    {/* This transparent overlay covers the screen and closes the menu when clicked */}
                    <div
                        className="fixed inset-0 z-[999]"
                        onClick={() => actions.handleToggleDiscActions(null)}
                    />
                    <div ref={dropdownRef} style={menuStyle} className="bg-white dark:bg-gray-700 rounded-md shadow-lg z-[1000] border border-gray-200 dark:border-gray-600">
                        {type === 'active' ? (
                            <>
                                <button onClick={() => actions.openEditDiscModal(disc)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-md">
                                    <Pencil size={16} className="mr-2" /> Edit
                                </button>
                                <button onClick={() => actions.handleArchiveDisc(disc.id, disc.name)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                                    <Archive size={16} className="mr-2" /> Move to Shelf
                                </button>
                                <button onClick={() => actions.handleDeleteDisc(disc.id, disc.name)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-b-md">
                                    <FaTrash size={16} className="mr-2" /> Delete
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => actions.handleRestoreDisc(disc.id, disc.name)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-md">
                                    <FolderOpen size={16} className="mr-2" /> Restore to Bag
                                </button>
                                <button onClick={() => actions.handleDeleteDisc(disc.id, disc.name)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-b-md">
                                    <FaTrash size={16} className="mr-2" /> Delete
                                </button>
                            </>
                        )}
                    </div>
                </Portal>
            )}
        </li>
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
    const [isArchivedOpen, setIsArchivedOpen] = useState(false);

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
                if (!response.ok) throw new Error(`API error! Status: ${response.status}`);
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
            if (cachedActive) setActiveDiscs(cachedActive);
            unsubscribeActive = subscribeToUserDiscs(currentUser.uid, (discs) => {
                setActiveDiscs(discs);
                setCache(activeCacheKey, discs);
            });
            const cachedArchived = getCache(archivedCacheKey);
            if (cachedArchived) setArchivedDiscs(cachedArchived);
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

    // The useEffect for handling outside clicks has been removed.
    // The new overlay handles this responsibility.

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

    const openAddDiscModal = () => setIsApiModalOpen(true);

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
                const finalDiscData = { ...pendingApiDisc, ...sanitizedData, isArchived: false, displayOrder: maxOrder + 1 };
                await addDiscToBag(currentUser.uid, finalDiscData);
                toast.success(`${finalDiscData.name} added to your bag!`);
            }
            setIsDetailsModalOpen(false);
            setCurrentDiscToEdit(null);
            setPendingApiDisc(null);
        } catch (error) {
            console.error("Save disc error:", error);
            toast.error("Failed to save disc.");
        }
    };

    const handleToggleDiscActions = (discId) => {
        // If passed null (from the overlay click), always close.
        if (discId === null) {
            setOpenDiscActionsId(null);
        } else {
            setOpenDiscActionsId(prevId => (prevId === discId ? null : discId));
        }
    };

    const handleArchiveDisc = async (discId, discName) => {
        if (!currentUser || !currentUser.uid) { toast.error("You must be logged in."); return; }
        try {
            await updateDiscInBag(currentUser.uid, discId, { isArchived: true });
            toast.success(`${discName} moved to 'On the Shelf'!`);
            setOpenDiscActionsId(null);
        } catch (error) {
            console.error("Failed to archive disc:", error);
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
            console.error("Failed to restore disc:", error);
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
            console.error("Failed to delete disc:", error);
            toast.error("Failed to delete disc.");
        } finally {
            setDeleteModalState({ isOpen: false, disc: null });
        }
    };

    const cancelDeleteDisc = () => setDeleteModalState({ isOpen: false, disc: null });

    const discActions = {
        handleToggleDiscActions,
        openEditDiscModal,
        handleArchiveDisc,
        handleDeleteDisc,
        handleRestoreDisc
    };

    if (!currentUser) {
        return <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-black"><p className="text-lg text-gray-700 dark:text-gray-300">Please log in to view and manage your disc bag.</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8 pb-48 min-w-0">
            <h2 className="text-2xl font-bold text-center pt-5 mb-2">In Your Bag</h2>
            {activeDiscs.length > 0 && (
                <p className="text-md text-gray-600 dark:text-gray-400 text-center mb-6">{activeDiscs.length} active discs</p>
            )}

            {activeDiscs.length === 0 && archivedDiscs.length === 0 ? (
                <p className="text-center text-gray-600 dark:text-gray-300 text-lg">
                    You haven't added any discs to your bag yet! Click the '+' button to get started.
                </p>
            ) : (
                <div className="shelves-container">
                    {sortedActiveDiscTypes.map((type) => (
                        <div className="disc-shelf" key={type}>
                            <h3 className="shelf-title">
                                {type}
                                <span className="shelf-disc-count">
                                    ({groupedActiveDiscs[type].length})
                                </span>
                            </h3>
                            <ul className="disc-list">
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
                                    .map((disc, index, array) => (
                                        <DiscItem
                                            key={disc.id}
                                            disc={disc}
                                            type="active"
                                            openDiscActionsId={openDiscActionsId}
                                            dropdownRef={dropdownRef}
                                            actions={discActions}
                                            isLast={index === array.length - 1}
                                        />
                                    ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            {archivedDiscs.length > 0 && (
                <>
                    <hr className="my-8 border-t border-gray-200 dark:border-gray-700" />
                    <Accordion
                        title={`On the Shelf (${archivedDiscs.length} discs)`}
                        isOpen={isArchivedOpen}
                        onToggle={() => setIsArchivedOpen(!isArchivedOpen)}
                    >
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 relative z-10">
                            {archivedDiscs
                                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                                .map((disc, index, array) => (
                                    <DiscItem
                                        key={disc.id}
                                        disc={disc}
                                        type="archived"
                                        openDiscActionsId={openDiscActionsId}
                                        dropdownRef={dropdownRef}
                                        actions={discActions}
                                        isLast={index === array.length - 1}
                                    />
                                ))}
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