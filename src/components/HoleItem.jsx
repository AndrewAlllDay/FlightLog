import React, { useEffect, useState } from 'react';
import { Edit, Save, X, Trash } from 'lucide-react';

// Define the desired order of disc types for display (can be moved to a shared utility if used elsewhere)
const DISC_TYPE_ORDER = [
    'Distance Driver',
    'Fairway Driver',
    'Midrange',
    'Putt/Approach',
    'Hybrid',
    'Other' // For discs without a specified type
];

export default function HoleItem({
    hole,
    index,
    editingHoleData,
    setEditingHoleData,
    onToggleEdit,
    onSave,
    onDelete,
    draggableProps,
    dragHandleProps,
    innerRef,
    discs
}) {
    const isCurrentlyEditing = hole.editing;

    const [currentEditNumber, setCurrentEditNumber] = useState(hole.number);
    const [currentEditPar, setCurrentEditPar] = useState(hole.par);
    // --- 1. Add state for distance ---
    const [currentEditDistance, setCurrentEditDistance] = useState(hole.distance || '');
    const [currentEditNote, setCurrentEditNote] = useState(hole.note);
    const [currentEditDiscId, setCurrentEditDiscId] = useState(hole.discId || '');

    useEffect(() => {
        if (isCurrentlyEditing && editingHoleData && editingHoleData.id === hole.id) {
            setCurrentEditNumber(editingHoleData.number || '');
            setCurrentEditPar(editingHoleData.par || '');
            // --- 2. Update state from editingHoleData ---
            setCurrentEditDistance(editingHoleData.distance || '');
            setCurrentEditNote(editingHoleData.note || '');
            setCurrentEditDiscId(editingHoleData.discId || '');
        } else if (!isCurrentlyEditing) {
            setCurrentEditNumber(hole.number);
            setCurrentEditPar(hole.par);
            // --- 3. Reset state when not editing ---
            setCurrentEditDistance(hole.distance || '');
            setCurrentEditNote(hole.note);
            setCurrentEditDiscId(hole.discId || '');
        }
    }, [isCurrentlyEditing, editingHoleData, hole]);

    const handleLocalInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'number') setCurrentEditNumber(value);
        else if (name === 'par') setCurrentEditPar(value);
        // --- 4. Handle input changes for distance ---
        else if (name === 'distance') setCurrentEditDistance(value);
        else if (name === 'note') setCurrentEditNote(value);
        else if (name === 'discId') setCurrentEditDiscId(value);

        setEditingHoleData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCancelEdit = () => {
        onToggleEdit(hole.id, hole);
        setCurrentEditNumber(hole.number);
        setCurrentEditPar(hole.par);
        // --- 5. Reset distance on cancel ---
        setCurrentEditDistance(hole.distance || '');
        setCurrentEditNote(hole.note);
        setCurrentEditDiscId(hole.discId || '');
    };

    const displayDisc = hole.discId && discs ? discs.find(d => d.id === hole.discId) : null;

    // --- Logic to group discs by type for the dropdown ---
    const groupedDiscs = {};
    if (discs) {
        discs.forEach(disc => {
            const type = (disc.type && disc.type.trim() !== '') ? disc.type : 'Other';
            if (!groupedDiscs[type]) {
                groupedDiscs[type] = [];
            }
            groupedDiscs[type].push(disc);
        });
    }

    // Sort the disc types according to the predefined order, or put 'Other' at the end
    const sortedDiscTypes = Object.keys(groupedDiscs).sort((a, b) => {
        const indexA = DISC_TYPE_ORDER.indexOf(a);
        const indexB = DISC_TYPE_ORDER.indexOf(b);

        // Handle types not in DISC_TYPE_ORDER (put them at the end)
        if (indexA === -1 && indexB === -1) return a.localeCompare(b); // Alphabetical for unknown types
        if (indexA === -1) return 1; // a comes after b
        if (indexB === -1) return -1; // b comes after a
        return indexA - indexB;
    });

    return (
        <li
            ref={innerRef}
            {...draggableProps}
            {...dragHandleProps}
            className={`
                mb-4 border rounded p-4 bg-white dark:bg-gray-800 flex justify-between items-start
                transition-all duration-200 ease-in-out shadow-sm
                ${isCurrentlyEditing ? 'border-blue-500 dark:border-blue-500' : 'border-gray-200 dark:border-gray-700'}
            `}
            data-hole-id={hole.id}
        >
            {!isCurrentlyEditing && (
                <div className="w-10 h-10 rounded-full bg-indigo-400 text-white flex items-center justify-center text-lg font-bold mr-4 flex-shrink-0 shadow-sm">
                    {hole.number}
                </div>
            )}

            <div className="flex-grow">
                {isCurrentlyEditing ? (
                    // Editing Mode
                    <div className="space-y-2">
                        <label className="block">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">Hole Number:</span>
                            <input
                                type="text"
                                placeholder="Hole Number"
                                name="number"
                                value={currentEditNumber}
                                onChange={handleLocalInputChange}
                                className="w-full mt-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                        </label>
                        <label className="block">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">Par:</span>
                            <input
                                type="number"
                                placeholder="Par"
                                name="par"
                                value={currentEditPar}
                                onChange={handleLocalInputChange}
                                className="w-full mt-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                        </label>

                        {/* --- 6. Add the distance input field --- */}
                        <label className="block">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">Distance (ft):</span>
                            <input
                                type="number"
                                placeholder="Distance in feet"
                                name="distance"
                                value={currentEditDistance}
                                onChange={handleLocalInputChange}
                                className="w-full mt-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </label>

                        <label className="block">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">Recommended Disc:</span>
                            <select
                                name="discId"
                                value={currentEditDiscId}
                                onChange={handleLocalInputChange}
                                className="w-full mt-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500 custom-select-dropdown dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="">No Disc Selected</option>
                                {sortedDiscTypes.map(type => (
                                    <optgroup key={type} label={type}>
                                        {groupedDiscs[type]
                                            .sort((a, b) => a.name.localeCompare(b.name)) // Sort discs alphabetically by name
                                            .map(disc => (
                                                <option key={disc.id} value={disc.id}>
                                                    {disc.name} - {disc.color}
                                                </option>
                                            ))}
                                    </optgroup>
                                ))}
                            </select>
                            {discs && discs.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    No discs found in your bag. Add some in "In The Bag" section.
                                </p>
                            )}
                        </label>
                        <label className="block">
                            <span className="text-gray-700 dark:text-gray-300 text-sm">Note:</span>
                            <textarea
                                placeholder="Add a note"
                                name="note"
                                value={currentEditNote}
                                onChange={handleLocalInputChange}
                                className="w-full mt-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                rows="3"
                            />
                        </label>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <button
                                onClick={() => onSave(hole.id)}
                                className="!bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors"
                                aria-label="Save Changes"
                            >
                                <Save size={20} />
                            </button>
                            <button
                                onClick={() => onDelete(hole.id)}
                                className="!bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
                                aria-label="Delete Hole"
                            >
                                <Trash size={20} />
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="!bg-gray-300 text-gray-800 p-2 rounded hover:bg-gray-400 transition-colors dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                                aria-label="Cancel"
                            >
                                <X size={20} />
                            </button>

                        </div>
                    </div>
                ) : (
                    // Display mode
                    <div className='flex-grow'>
                        {/* --- 7. Display the distance --- */}
                        <p className='mb-2 text-gray-800 dark:text-white'>
                            <span className='font-bold text-lg'>Hole {hole.number}</span> - Par {hole.par}
                            {hole.distance && <span className="text-gray-600 dark:text-gray-400"> - {hole.distance} ft</span>}
                        </p>

                        {displayDisc && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm italic mt-1 mb-2">
                                {displayDisc.name} - {displayDisc.color}
                            </p>
                        )}

                        {hole.note ? (
                            <p className='text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap'>{hole.note}</p>
                        ) : (
                            <p className='text-gray-500 dark:text-gray-400 text-sm italic'>No note added yet.</p>
                        )}
                    </div>
                )}
            </div>
            {/* --- Edit button in Display mode (Icon Only, No Background) --- */}
            {!isCurrentlyEditing && (
                <button
                    onClick={() => onToggleEdit(hole.id, hole)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-4 p-1 rounded !bg-transparent"
                    aria-label="Edit Hole"
                >
                    <Edit size={20} />
                </button>
            )}
        </li>
    );
}