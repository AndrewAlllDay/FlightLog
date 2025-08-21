import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover'; // NEW: Import Popover
import { X } from 'lucide-react';

// A list of common hex colors for the preset palette.
const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
    '#8b5cf6', '#ec4899', '#ffffff', '#1f2937',
];

// A reusable component for the color palette UI.
const ColorPalette = ({ selectedColor, onSelectColor }) => (
    <div className="grid grid-cols-5 gap-2">
        {PRESET_COLORS.map((preset) => (
            <button
                key={preset}
                type="button"
                onClick={() => onSelectColor(preset)}
                className={`w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 transition-transform hover:scale-110 focus:outline-none ${selectedColor.toLowerCase() === preset.toLowerCase()
                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                        : ''
                    }`}
                style={{ backgroundColor: preset }}
                aria-label={`Select color ${preset}`}
            />
        ))}
    </div>
);

// --- NEW ---
// A self-contained dropdown component for selecting a color.
const ColorPickerDropdown = ({ value, onChange }) => {
    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    className="w-full h-10 flex items-center justify-between px-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 text-left"
                >
                    <span className="text-gray-700 dark:text-gray-200 font-mono text-sm">{value}</span>
                    <span
                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-500"
                        style={{ backgroundColor: value }}
                    />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    className="z-[51] bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
                    sideOffset={5}
                    align="start"
                >
                    <ColorPalette selectedColor={value} onSelectColor={onChange} />
                    <hr className="my-3 border-gray-200 dark:border-gray-600" />
                    <div className="flex items-center gap-2">
                        <label htmlFor="custom-color-picker" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Custom Color
                        </label>
                        <input
                            type="color"
                            id="custom-color-picker"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-10 h-10 p-0 border-none rounded bg-transparent cursor-pointer"
                        />
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

export default function AddDiscModal({
    isOpen,
    onClose,
    onSubmit,
    initialData = null,
    discTypes = [],
}) {
    const [color, setColor] = useState('#ffffff');
    const [weight, setWeight] = useState('');
    const [plastic, setPlastic] = useState('');
    const [notes, setNotes] = useState('');
    const [type, setType] = useState('');

    const isEditing = initialData && initialData.id;

    useEffect(() => {
        if (isOpen && initialData) {
            setColor(initialData.color || '#ffffff');
            setWeight(initialData.weight || '');
            setPlastic(initialData.plastic || '');
            setNotes(initialData.notes || '');
            setType(initialData.type || initialData.category || '');
        } else if (!isOpen) {
            setColor('#ffffff');
            setWeight('');
            setPlastic('');
            setNotes('');
            setType('');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const submittedData = {
            name: initialData.name,
            manufacturer: initialData.manufacturer,
            speed: initialData.speed ?? null,
            glide: initialData.glide ?? null,
            turn: initialData.turn ?? null,
            fade: initialData.fade ?? null,
            stability: initialData.stability ?? null,
            type: type,
            color: color,
            plastic: plastic.trim(),
            weight: weight ? parseInt(weight, 10) : '',
            notes: notes.trim(),
        };
        onSubmit(submittedData);
    };

    const modalTitle = isEditing ? 'Edit Your Disc' : 'Add Your Disc Details';

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-xl font-bold text-gray-800 dark:text-white">{modalTitle}</Dialog.Title>
                        <Dialog.Close asChild>
                            <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Disc</label>
                            <p className="w-full border rounded px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {initialData?.manufacturer} {initialData?.name}
                            </p>
                        </div>

                        <div>
                            <label htmlFor="discType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Disc Type</label>
                            <select
                                id="discType"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Select a Type</option>
                                {discTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                                {!discTypes.includes('Other') && <option value="Other">Other</option>}
                            </select>
                        </div>

                        <div className="pt-2">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 border-b border-gray-200 dark:border-gray-600 pb-2">Your Disc's Details</h3>
                            <div className="space-y-4 pt-2">
                                <div>
                                    <label htmlFor="discPlastic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plastic</label>
                                    <input
                                        type="text"
                                        id="discPlastic"
                                        placeholder="e.g., Star, ESP, Neutron"
                                        value={plastic}
                                        onChange={(e) => setPlastic(e.target.value)}
                                        className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* --- UPDATED Color Picker --- */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                                        <ColorPickerDropdown value={color} onChange={setColor} />
                                    </div>

                                    <div>
                                        <label htmlFor="discWeight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weight (g)</label>
                                        <input
                                            type="number"
                                            id="discWeight"
                                            placeholder="e.g., 175"
                                            min="100"
                                            max="200"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="discNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                                    <textarea
                                        id="discNotes"
                                        placeholder="e.g., 'Slightly beat-in, good for turnovers.'"
                                        rows="3"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 text-gray-800 font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="!bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold transition-colors"
                            >
                                {isEditing ? 'Update Disc' : 'Add Disc to Bag'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}