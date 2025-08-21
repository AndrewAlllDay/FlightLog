import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BookText, X } from 'lucide-react';

export default function AddRoundNotesModal({ isOpen, onClose, onSubmit }) {
    const [notes, setNotes] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(notes); // Pass the notes back to the parent component
    };

    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-xl font-bold text-gray-800">Add Round Notes</Dialog.Title>
                        <Dialog.Close asChild>
                            <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800" aria-label="Close">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <p className="text-gray-600 mb-4">Add any optional notes about your round below.</p>

                    <form onSubmit={handleSubmit}>
                        <textarea
                            id="roundNotes"
                            name="roundNotes"
                            rows={5}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Felt great off the tee, putting needs work..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />

                        <div className="flex justify-end space-x-3 mt-6">
                            <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md text-gray-800 hover:bg-gray-300">
                                Skip
                            </button>
                            <button type="submit" className="!bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                <div className="flex items-center">
                                    <BookText size={16} className="mr-2" />
                                    Save Round
                                </div>
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}