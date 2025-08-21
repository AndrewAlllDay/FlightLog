import React, { useState, useEffect } from 'react';

// Define a shared constant for disc type order
const DISC_TYPE_ORDER = [
    'Distance Driver',
    'Fairway Driver',
    'Midrange',
    'Putt/Approach',
    'Hybrid',
    'Other'
];

export default function AddHoleForm({ onAddHole, onCancel, discs }) {
    const [holeNumber, setHoleNumber] = useState('');
    const [holePar, setHolePar] = useState('');
    // --- 1. Add state for distance ---
    const [holeDistance, setHoleDistance] = useState('');
    const [holeNote, setHoleNote] = useState('');
    const [selectedDiscId, setSelectedDiscId] = useState('');

    // This effect can be used to reset the form if the modal is re-opened,
    // though clearing on submit/cancel is also effective.
    useEffect(() => {
        // Parent component can trigger a reset by changing a key on AddHoleModal
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        // --- 2. Pass distance to the onAddHole handler ---
        onAddHole(holeNumber, holePar, holeDistance, holeNote, selectedDiscId);

        // Clear form fields after submission
        setHoleNumber('');
        setHolePar('');
        setHoleDistance(''); // Clear distance
        setHoleNote('');
        setSelectedDiscId('');
    };

    const handleCancel = () => {
        // Clear form fields on cancel
        setHoleNumber('');
        setHolePar('');
        setHoleDistance(''); // Clear distance
        setHoleNote('');
        setSelectedDiscId('');
        onCancel();
    };

    // Group discs by type for the dropdown
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

    // Sort disc types by the predefined order
    const sortedDiscTypes = Object.keys(groupedDiscs).sort((a, b) => {
        const indexA = DISC_TYPE_ORDER.indexOf(a);
        const indexB = DISC_TYPE_ORDER.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="holeNumber" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">
                    Hole Number:
                </label>
                <input
                    type="text"
                    id="holeNumber"
                    placeholder="e.g., 1"
                    value={holeNumber}
                    onChange={(e) => setHoleNumber(e.target.value)}
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                />
            </div>
            <div>
                <label htmlFor="holePar" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">
                    Par:
                </label>
                <input
                    type="number"
                    id="holePar"
                    placeholder="e.g., 3"
                    value={holePar}
                    onChange={(e) => setHolePar(e.target.value)}
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                />
            </div>

            {/* --- 3. Add the distance input field to the form --- */}
            <div>
                <label htmlFor="holeDistance" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">
                    Distance (ft):
                </label>
                <input
                    type="number"
                    id="holeDistance"
                    placeholder="e.g., 350"
                    value={holeDistance}
                    onChange={(e) => setHoleDistance(e.target.value)}
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>

            <div>
                <label htmlFor="discSelect" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">
                    Recommended Disc:
                </label>
                <select
                    id="discSelect"
                    className="w-full border rounded px-3 py-2 custom-select-dropdown dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={selectedDiscId}
                    onChange={(e) => setSelectedDiscId(e.target.value)}
                >
                    <option value="">No Disc Selected</option>
                    {sortedDiscTypes.map(type => (
                        <optgroup key={type} label={type}>
                            {groupedDiscs[type]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(disc => (
                                    <option key={disc.id} value={disc.id}>
                                        {disc.name} - {disc.color}
                                    </option>
                                ))}
                        </optgroup>
                    ))}
                </select>
                {discs && discs.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                        No discs found. Add some in the "In The Bag" section.
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="holeNote" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">
                    Notes:
                </label>
                <textarea
                    id="holeNote"
                    placeholder="e.g., Hyzer flip, aim for the big oak tree"
                    value={holeNote}
                    onChange={(e) => setHoleNote(e.target.value)}
                    className="w-full border rounded px-3 py-2 h-24 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-300 dark:bg-gray-600 dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="!bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                    Add Hole
                </button>
            </div>
        </form>
    );
}